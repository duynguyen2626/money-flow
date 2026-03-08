/**
 * One-time PocketBase backfill / re-sync route.
 * Usage:
 *   GET /api/migrate/backfill?collection=accounts
 *   GET /api/migrate/backfill?collection=transactions
 *   GET /api/migrate/backfill?collection=all          (accounts first, then transactions)
 *
 * Each run is fully idempotent — existing PB records are PATCHed, missing ones are POSTed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pocketbaseRequest, toPocketBaseId } from '@/services/pocketbase/server'

type BackfillResult = {
  created: number
  updated: number
  failed: number
  errors: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** PATCH an existing PB record; fall back to POST if not found (404). */
async function upsertPB(
  collection: string,
  pbId: string,
  body: Record<string, unknown>,
): Promise<'created' | 'updated'> {
  try {
    await pocketbaseRequest(`/api/collections/${collection}/records/${pbId}`, {
      method: 'PATCH',
      body,
    })
    return 'updated'
  } catch (err: unknown) {
    if (String((err as Error)?.message).includes('[404]')) {
      await pocketbaseRequest(`/api/collections/${collection}/records`, {
        method: 'POST',
        body: { id: pbId, ...body },
      })
      return 'created'
    }
    throw err
  }
}

/** Run tasks in parallel batches to avoid hammering PB while still being fast. */
async function runBatched<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.allSettled(items.slice(i, i + batchSize).map(fn))
  }
}

// ---------------------------------------------------------------------------
// Accounts backfill
// ---------------------------------------------------------------------------

async function backfillAccounts(): Promise<BackfillResult> {
  const supabase = createClient()

  // Fetch all accounts; nulls-first so parent accounts are processed before children
  const { data: accountsRaw, error } = await supabase
    .from('accounts')
    .select('*')
    .order('parent_account_id', { ascending: true, nullsFirst: true })

  const accounts = (accountsRaw ?? []) as Array<Record<string, any>>

  if (error) {
    return { created: 0, updated: 0, failed: 1, errors: [`fetch: ${error?.message}`] }
  }

  let created = 0
  let updated = 0
  let failed = 0
  const errors: string[] = []

  // Two passes: first without FK references (so parent accounts land before children),
  // then a second pass to set FK fields like parent_account_id.
  const withFKs: Array<{ pbId: string; fkBody: Record<string, unknown> }> = []

  // Pass 1 — create/update without optional FK fields
  await runBatched(accounts, 10, async (account) => {
    const pbId = toPocketBaseId(account.id)
    try {
      const body: Record<string, unknown> = {
        slug: account.id,
        name: account.name,
        // SB stores 'ewallet'; PB schema uses 'e_wallet'
        type: account.type === 'ewallet' ? 'e_wallet' : (account.type ?? 'bank'),
        currency: account.currency ?? 'VND',
        current_balance: account.current_balance ?? 0,
        credit_limit: account.credit_limit ?? 0,
        is_active: account.is_active ?? true,
        image_url: account.image_url ?? null,
        receiver_name: account.receiver_name ?? null,
        total_in: account.total_in ?? 0,
        total_out: account.total_out ?? 0,
        cashback_config: account.cashback_config ?? null,
        cashback_config_version: account.cashback_config_version ?? 1,
        annual_fee: account.annual_fee ?? null,
        annual_fee_waiver_target: account.annual_fee_waiver_target ?? null,
        cb_type: account.cb_type ?? 'none',
        cb_base_rate: account.cb_base_rate ?? 0,
        cb_max_budget: account.cb_max_budget ?? null,
        cb_is_unlimited: account.cb_is_unlimited ?? false,
        cb_rules_json: account.cb_rules_json ?? null,
        cb_min_spend: account.cb_min_spend ?? null,
        cb_cycle_type: account.cb_cycle_type ?? 'calendar_month',
        statement_day: account.statement_day ?? null,
        due_date: account.due_date ?? null,
        holder_type: account.holder_type ?? 'me',
        account_number: account.account_number ?? null,
      }

      // Collect FK fields for pass 2
      const fkBody: Record<string, unknown> = {}
      if (account.owner_id) fkBody.owner_id = toPocketBaseId(account.owner_id)
      if (account.parent_account_id) fkBody.parent_account_id = toPocketBaseId(account.parent_account_id)
      if (account.secured_by_account_id) fkBody.secured_by_account_id = toPocketBaseId(account.secured_by_account_id)
      if (account.holder_person_id) fkBody.holder_person_id = toPocketBaseId(account.holder_person_id)
      if (Object.keys(fkBody).length > 0) withFKs.push({ pbId, fkBody })

      const result = await upsertPB('accounts', pbId, body)
      if (result === 'created') created++
      else updated++
    } catch (err) {
      failed++
      errors.push(`[accounts:${account.id}] ${String(err)}`)
    }
  })

  // Pass 2 — patch FK references now that all accounts exist in PB
  await runBatched(withFKs, 10, async ({ pbId, fkBody }) => {
    try {
      await pocketbaseRequest(`/api/collections/accounts/records/${pbId}`, {
        method: 'PATCH',
        body: fkBody,
      })
    } catch (err) {
      errors.push(`[accounts FK pass pbId=${pbId}] ${String(err)}`)
    }
  })

  return { created, updated, failed, errors }
}

// ---------------------------------------------------------------------------
// Transactions backfill
// ---------------------------------------------------------------------------

async function backfillTransactions(): Promise<BackfillResult> {
  const supabase = createClient()
  const PAGE_SIZE = 500

  let created = 0
  let updated = 0
  let failed = 0
  const errors: string[] = []

  let page = 0
  while (true) {
    const { data: transactionsRaw, error } = await supabase
      .from('transactions')
      .select(
        'id, occurred_at, note, type, account_id, target_account_id, category_id, person_id, shop_id, amount, status, tag, persisted_cycle_tag, cashback_share_percent, cashback_share_fixed, cashback_mode, metadata',
      )
      .order('occurred_at', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    const transactions = (transactionsRaw ?? []) as Array<Record<string, any>>

    if (error) {
      errors.push(`page ${page}: ${error.message}`)
      break
    }
    if (transactions.length === 0) break

    await runBatched(transactions, 10, async (txn) => {
      const pbId = toPocketBaseId(txn.id)
      try {
        const existingMeta =
          txn.metadata && typeof txn.metadata === 'object'
            ? (txn.metadata as Record<string, unknown>)
            : {}

        const body: Record<string, unknown> = {
          occurred_at: txn.occurred_at,
          note: txn.note ?? null,
          type: txn.type,
          account_id: toPocketBaseId(txn.account_id),
          amount: txn.amount,
          status: txn.status ?? 'posted',
          tag: txn.tag ?? null,
          persisted_cycle_tag: txn.persisted_cycle_tag ?? null,
          cashback_share_percent: txn.cashback_share_percent ?? null,
          cashback_share_fixed: txn.cashback_share_fixed ?? null,
          cashback_mode: txn.cashback_mode ?? null,
          // Merge source_id into metadata so mapTransaction can return the SB UUID as id
          metadata: { ...existingMeta, source_id: txn.id },
        }

        // Only set FK fields when populated — null values on relation fields cause PB errors
        if (txn.target_account_id) body.target_account_id = toPocketBaseId(txn.target_account_id)
        if (txn.category_id) body.category_id = toPocketBaseId(txn.category_id)
        if (txn.person_id) body.person_id = toPocketBaseId(txn.person_id)
        if (txn.shop_id) body.shop_id = toPocketBaseId(txn.shop_id)

        const result = await upsertPB('transactions', pbId, body)
        if (result === 'created') created++
        else updated++
      } catch (err) {
        failed++
        errors.push(`[transactions:${txn.id}] ${String(err)}`)
      }
    })

    page++
    if (transactions.length < PAGE_SIZE) break
  }

  return { created, updated, failed, errors }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const collection = request.nextUrl.searchParams.get('collection') ?? 'all'
  const results: Record<string, BackfillResult> = {}

  // Always run accounts before transactions so FK relations resolve
  if (collection === 'all' || collection === 'accounts') {
    console.log('[Backfill] Starting accounts...')
    results.accounts = await backfillAccounts()
    console.log('[Backfill] Accounts done:', results.accounts.created, 'created,', results.accounts.updated, 'updated,', results.accounts.failed, 'failed')
  }

  if (collection === 'all' || collection === 'transactions') {
    console.log('[Backfill] Starting transactions...')
    results.transactions = await backfillTransactions()
    console.log('[Backfill] Transactions done:', results.transactions.created, 'created,', results.transactions.updated, 'updated,', results.transactions.failed, 'failed')
  }

  return NextResponse.json(results, { status: 200 })
}
