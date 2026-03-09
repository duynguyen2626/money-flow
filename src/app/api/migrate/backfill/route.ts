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

const PB_TRANSACTIONS_COLLECTION = 'pvl_txn_001'
const PB_ACCOUNTS_COLLECTION = 'pvl_acc_001'
const PB_CATEGORIES_COLLECTION = 'pvl_cat_001'
const PB_SHOPS_COLLECTION = 'pvl_shop_001'
const PB_PEOPLE_COLLECTION = 'pvl_people_001'

type BackfillResult = {
  created: number
  updated: number
  failed: number
  errors: string[]
}

type SupabaseRow = { id: string; name: string | null; type?: string | null; account_number?: string | null }
type PocketBaseLookupRow = { id: string; name?: string | null; type?: string | null; slug?: string | null; account_number?: string | null }
type SupabaseTransactionRow = {
  id: string
  occurred_at: string
  note: string | null
  type: string
  amount: number
  account_id: string
  target_account_id: string | null
  category_id: string | null
  person_id: string | null
  shop_id: string | null
  persisted_cycle_tag: string | null
}
type PocketBaseTransactionRow = {
  id: string
  date?: string | null
  description?: string | null
  type?: string | null
  amount?: number | null
  account_id?: string | null
  to_account_id?: string | null
  category_id?: string | null
  person_id?: string | null
  shop_id?: string | null
  metadata?: Record<string, unknown> | null
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

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase()
}

function isPocketBaseId(value: string | null | undefined): boolean {
  return Boolean(value && value.length === 15)
}

function pickUnique(candidates: string[]): string | null {
  const uniq = Array.from(new Set(candidates.filter(Boolean)))
  return uniq.length === 1 ? uniq[0] : null
}

function toIso(input?: string | null): string {
  if (!input) return ''
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return String(input).trim()
  return parsed.toISOString()
}

function normalizeNote(input?: string | null): string {
  return String(input ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function buildTxnFingerprint(input: {
  occurredAt?: string | null
  amount?: number | null
  type?: string | null
  note?: string | null
  persistedCycleTag?: string | null
}): string {
  return [
    toIso(input.occurredAt),
    Math.round(Number(input.amount ?? 0)),
    normalizeText(input.type),
    normalizeNote(input.note),
    normalizeText(input.persistedCycleTag),
  ].join('|')
}

async function loadPocketBaseLookupRows(collection: string, fields: string): Promise<PocketBaseLookupRow[]> {
  const rows: PocketBaseLookupRow[] = []
  let page = 1

  while (true) {
    const response = await pocketbaseRequest<{ items?: PocketBaseLookupRow[]; totalPages?: number }>(
      `/api/collections/${collection}/records?page=${page}&perPage=500&fields=${encodeURIComponent(fields)}`,
      { method: 'GET' },
    )

    const items = response.items ?? []
    rows.push(...items)

    const totalPages = response.totalPages ?? 1
    if (page >= totalPages || items.length === 0) break
    page += 1
  }

  return rows
}

async function buildIdBridgeMaps() {
  const supabase = createClient()

  const [
    supabaseAccountsResult,
    supabaseCategoriesResult,
    supabaseShopsResult,
    supabasePeopleResult,
    pbAccounts,
    pbCategories,
    pbShops,
    pbPeople,
  ] = await Promise.all([
    supabase.from('accounts').select('id,name,account_number'),
    supabase.from('categories').select('id,name,type'),
    supabase.from('shops').select('id,name'),
    supabase.from('people').select('id,name'),
    loadPocketBaseLookupRows(PB_ACCOUNTS_COLLECTION, 'id,name,slug,account_number'),
    loadPocketBaseLookupRows(PB_CATEGORIES_COLLECTION, 'id,name,type'),
    loadPocketBaseLookupRows(PB_SHOPS_COLLECTION, 'id,name'),
    loadPocketBaseLookupRows(PB_PEOPLE_COLLECTION, 'id,name'),
  ])

  if (supabaseAccountsResult.error) throw new Error(`accounts map fetch failed: ${supabaseAccountsResult.error.message}`)
  if (supabaseCategoriesResult.error) throw new Error(`categories map fetch failed: ${supabaseCategoriesResult.error.message}`)
  if (supabaseShopsResult.error) throw new Error(`shops map fetch failed: ${supabaseShopsResult.error.message}`)
  if (supabasePeopleResult.error) throw new Error(`people map fetch failed: ${supabasePeopleResult.error.message}`)

  const accountMap = new Map<string, string>()
  const categoryMap = new Map<string, string>()
  const shopMap = new Map<string, string>()
  const personMap = new Map<string, string>()

  const pbAccountById = new Set(pbAccounts.map((row) => row.id))
  const pbAccountBySlug = new Map<string, string[]>()
  const pbAccountByNumber = new Map<string, string[]>()
  const pbAccountByName = new Map<string, string[]>()

  for (const row of pbAccounts) {
    const slug = normalizeText(row.slug)
    if (slug) pbAccountBySlug.set(slug, [...(pbAccountBySlug.get(slug) ?? []), row.id])
    const number = normalizeText(row.account_number)
    if (number) pbAccountByNumber.set(number, [...(pbAccountByNumber.get(number) ?? []), row.id])
    const name = normalizeText(row.name)
    if (name) pbAccountByName.set(name, [...(pbAccountByName.get(name) ?? []), row.id])
  }

  for (const account of (supabaseAccountsResult.data ?? []) as SupabaseRow[]) {
    if (isPocketBaseId(account.id) && pbAccountById.has(account.id)) {
      accountMap.set(account.id, account.id)
      continue
    }

    const slugPrefix = normalizeText(account.id.slice(0, 8))
    const number = normalizeText(account.account_number)
    const name = normalizeText(account.name)

    const match =
      pickUnique(pbAccountBySlug.get(slugPrefix) ?? []) ||
      pickUnique(pbAccountByNumber.get(number) ?? []) ||
      pickUnique(pbAccountByName.get(name) ?? [])

    if (match) accountMap.set(account.id, match)
  }

  function buildNameTypeMap(rows: PocketBaseLookupRow[], includeType = false) {
    const map = new Map<string, string[]>()
    for (const row of rows) {
      const name = normalizeText(row.name)
      if (!name) continue
      const key = includeType ? `${name}::${normalizeText(row.type)}` : name
      map.set(key, [...(map.get(key) ?? []), row.id])
    }
    return map
  }

  const pbCategoryByNameType = buildNameTypeMap(pbCategories, true)
  const pbCategoryById = new Set(pbCategories.map((row) => row.id))
  for (const category of (supabaseCategoriesResult.data ?? []) as SupabaseRow[]) {
    if (isPocketBaseId(category.id) && pbCategoryById.has(category.id)) {
      categoryMap.set(category.id, category.id)
      continue
    }
    const key = `${normalizeText(category.name)}::${normalizeText(category.type)}`
    const match = pickUnique(pbCategoryByNameType.get(key) ?? [])
    if (match) categoryMap.set(category.id, match)
  }

  const pbShopByName = buildNameTypeMap(pbShops)
  const pbShopById = new Set(pbShops.map((row) => row.id))
  for (const shop of (supabaseShopsResult.data ?? []) as SupabaseRow[]) {
    if (isPocketBaseId(shop.id) && pbShopById.has(shop.id)) {
      shopMap.set(shop.id, shop.id)
      continue
    }
    const key = normalizeText(shop.name)
    const match = pickUnique(pbShopByName.get(key) ?? [])
    if (match) shopMap.set(shop.id, match)
  }

  const pbPersonByName = buildNameTypeMap(pbPeople)
  const pbPersonById = new Set(pbPeople.map((row) => row.id))
  for (const person of (supabasePeopleResult.data ?? []) as SupabaseRow[]) {
    if (isPocketBaseId(person.id) && pbPersonById.has(person.id)) {
      personMap.set(person.id, person.id)
      continue
    }
    const key = normalizeText(person.name)
    const match = pickUnique(pbPersonByName.get(key) ?? [])
    if (match) personMap.set(person.id, match)
  }

  return { accountMap, categoryMap, shopMap, personMap }
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

  const { accountMap, categoryMap, shopMap, personMap } = await buildIdBridgeMaps()

  // Build a map of existing PB records by source_id to avoid duplicates
  const pbRecordsBySourceId = new Map<string, string>()
  try {
    let page = 1
    while (true) {
      const pbResp: any = await pocketbaseRequest(
        `/api/collections/${PB_TRANSACTIONS_COLLECTION}/records?page=${page}&perPage=500&fields=id,metadata`,
      )
      const items = pbResp?.items ?? []
      items.forEach((item: any) => {
        const sourceId = item.metadata?.source_id
        if (sourceId) pbRecordsBySourceId.set(sourceId, item.id)
      })
      if (items.length < 500 || !pbResp?.totalPages || page >= pbResp.totalPages) break
      page++
    }
  } catch (err) {
    errors.push(`Failed to fetch existing PB records: ${String(err)}`)
  }

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
      // Check if this source_id already exists in PB; if so, update that record instead of creating new
      const existingPbId = pbRecordsBySourceId.get(txn.id)
      const pbId = existingPbId ?? toPocketBaseId(txn.id)
      
      try {
        const existingMeta =
          txn.metadata && typeof txn.metadata === 'object'
            ? (txn.metadata as Record<string, unknown>)
            : {}

        const mappedAccountId = accountMap.get(txn.account_id) ?? ''
        const mappedToAccountId = txn.target_account_id ? (accountMap.get(txn.target_account_id) ?? '') : ''
        const mappedCategoryId = txn.category_id ? (categoryMap.get(txn.category_id) ?? '') : ''
        const mappedPersonId = txn.person_id ? (personMap.get(txn.person_id) ?? '') : ''
        const mappedShopId = txn.shop_id ? (shopMap.get(txn.shop_id) ?? '') : ''

        const body: Record<string, unknown> = {
          date: txn.occurred_at,
          description: txn.note ?? '',
          type: txn.type,
          account_id: mappedAccountId,
          to_account_id: mappedToAccountId,
          category_id: mappedCategoryId,
          person_id: mappedPersonId,
          shop_id: mappedShopId,
          amount: txn.amount,
          final_price: txn.amount,
          cashback_amount: 0,
          is_installment: false,
          parent_transaction_id: '',
          metadata: {
            ...existingMeta,
            source_id: txn.id,
            status: txn.status ?? 'posted',
            tag: txn.tag ?? null,
            persisted_cycle_tag: txn.persisted_cycle_tag ?? null,
            cashback_share_percent: txn.cashback_share_percent ?? null,
            cashback_share_fixed: txn.cashback_share_fixed ?? null,
            cashback_mode: txn.cashback_mode ?? null,
          },
        }

        const result = await upsertPB(PB_TRANSACTIONS_COLLECTION, pbId, body)
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

async function cleanupLegacyTransactions(): Promise<BackfillResult> {
  const supabase = createClient()
  let created = 0
  let updated = 0
  let failed = 0
  const errors: string[] = []

  const { accountMap, categoryMap, shopMap, personMap } = await buildIdBridgeMaps()

  const { data: sbRows, error: sbError } = await supabase
    .from('transactions')
    .select('id, occurred_at, note, type, amount, account_id, target_account_id, category_id, person_id, shop_id, persisted_cycle_tag')

  if (sbError) {
    return { created, updated, failed: failed + 1, errors: [`cleanup supabase fetch failed: ${sbError.message}`] }
  }

  const sbFingerprintMap = new Map<string, SupabaseTransactionRow[]>()
  for (const row of (sbRows ?? []) as SupabaseTransactionRow[]) {
    const key = buildTxnFingerprint({
      occurredAt: row.occurred_at,
      amount: row.amount,
      type: row.type,
      note: row.note,
      persistedCycleTag: row.persisted_cycle_tag,
    })
    const list = sbFingerprintMap.get(key) ?? []
    list.push(row)
    sbFingerprintMap.set(key, list)
  }

  const legacyPbRows: PocketBaseTransactionRow[] = []
  let page = 1
  while (true) {
    const response = await pocketbaseRequest<{ items?: PocketBaseTransactionRow[]; totalPages?: number }>(
      `/api/collections/${PB_TRANSACTIONS_COLLECTION}/records?page=${page}&perPage=500&sort=-date`,
      { method: 'GET' },
    )
    const items = response.items ?? []
    legacyPbRows.push(...items)
    const totalPages = response.totalPages ?? 1
    if (page >= totalPages || items.length === 0) break
    page += 1
  }

  const candidates = legacyPbRows.filter((row) => {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>
    const hasSource = typeof metadata.source_id === 'string' && metadata.source_id.length > 0
    const hasMissingRelation = !row.account_id || !row.category_id
    return !hasSource && hasMissingRelation
  })

  await runBatched(candidates, 10, async (legacyRow) => {
    try {
      const metadata = (legacyRow.metadata ?? {}) as Record<string, unknown>
      const key = buildTxnFingerprint({
        occurredAt: legacyRow.date ?? null,
        amount: legacyRow.amount ?? 0,
        type: legacyRow.type ?? '',
        note: legacyRow.description ?? '',
        persistedCycleTag: typeof metadata.persisted_cycle_tag === 'string' ? metadata.persisted_cycle_tag : null,
      })

      const matched = sbFingerprintMap.get(key) ?? []
      if (matched.length !== 1) {
        failed += 1
        errors.push(`[cleanup:${legacyRow.id}] ${matched.length === 0 ? 'no-match' : 'ambiguous-match'} for fingerprint`)
        return
      }

      const source = matched[0]
      const mappedAccountId = accountMap.get(source.account_id) ?? ''
      const mappedToAccountId = source.target_account_id ? (accountMap.get(source.target_account_id) ?? '') : ''
      const mappedCategoryId = source.category_id ? (categoryMap.get(source.category_id) ?? '') : ''
      const mappedPersonId = source.person_id ? (personMap.get(source.person_id) ?? '') : ''
      const mappedShopId = source.shop_id ? (shopMap.get(source.shop_id) ?? '') : ''

      const patchBody: Record<string, unknown> = {
        account_id: mappedAccountId,
        to_account_id: mappedToAccountId,
        category_id: mappedCategoryId,
        person_id: mappedPersonId,
        shop_id: mappedShopId,
        metadata: {
          ...metadata,
          source_id: source.id,
          cleanup_legacy_at: new Date().toISOString(),
        },
      }

      await pocketbaseRequest(`/api/collections/${PB_TRANSACTIONS_COLLECTION}/records/${legacyRow.id}`, {
        method: 'PATCH',
        body: patchBody,
      })
      updated += 1
    } catch (err) {
      failed += 1
      errors.push(`[cleanup:${legacyRow.id}] ${String(err)}`)
    }
  })

  return { created, updated, failed, errors }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const collection = request.nextUrl.searchParams.get('collection') ?? 'all'
  const cleanupLegacy = ['1', 'true', 'yes'].includes((request.nextUrl.searchParams.get('cleanupLegacy') ?? '').toLowerCase())
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

    if (cleanupLegacy) {
      console.log('[Backfill] Starting legacy transaction cleanup...')
      results.transactions_cleanup_legacy = await cleanupLegacyTransactions()
      console.log(
        '[Backfill] Legacy cleanup done:',
        results.transactions_cleanup_legacy.created,
        'created,',
        results.transactions_cleanup_legacy.updated,
        'updated,',
        results.transactions_cleanup_legacy.failed,
        'failed',
      )
    }
  }

  return NextResponse.json(results, { status: 200 })
}
