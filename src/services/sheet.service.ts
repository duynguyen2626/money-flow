'use server'

import { createClient } from '@/lib/supabase/server'

type SheetSyncTransaction = {
  id: string
  occurred_at?: string
  date?: string
  note?: string | null
  tag?: string | null
  shop_name?: string | null
  amount?: number | null
  original_amount?: number | null
  cashback_share_percent?: number | null
  cashback_share_percent_input?: number | null
  cashback_share_fixed?: number | null
  cashback_share_amount?: number | null
  type?: string
}

function isValidWebhook(url: string | null | undefined): url is string {
  if (!url) return false
  const trimmed = url.trim()
  return /^https?:\/\//i.test(trimmed)
}

function normalizePercent(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  const capped = Math.min(100, numeric)
  return capped > 1 ? capped / 100 : capped
}

function calculateTotals(txn: SheetSyncTransaction) {
  const originalAmount = Math.abs(Number(txn.original_amount ?? txn.amount ?? 0)) || 0
  const percentRate = normalizePercent(
    txn.cashback_share_percent_input ?? txn.cashback_share_percent ?? undefined
  )
  const fixedBack = Math.max(0, Number(txn.cashback_share_fixed ?? 0) || 0)
  const percentBack = originalAmount * percentRate
  const totalBackCandidate =
    txn.cashback_share_amount !== null && txn.cashback_share_amount !== undefined
      ? Number(txn.cashback_share_amount)
      : percentBack + fixedBack

  const totalBack = Math.min(originalAmount, Math.max(0, totalBackCandidate))

  return {
    originalAmount,
    percentRate,
    percentBack,
    fixedBack,
    totalBack,
  }
}

async function getProfileSheetLink(personId: string): Promise<string | null> {
  const supabase = createClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, sheet_link')
    .eq('id', personId)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch profile for sheet sync:', error)
  }

  const profileRow = profile as { id?: string; sheet_link?: string | null } | null
  if (profileRow) {
    const sheetLink = profileRow.sheet_link?.trim() ?? null
    console.log('[Sheet] Profile lookup result', {
      lookupId: personId,
      profileId: profileRow.id ?? null,
      sheet_link: sheetLink,
    })
    if (isValidWebhook(sheetLink)) {
      return sheetLink
    }
  }

  const { data: accountRow, error: accountError } = await supabase
    .from('accounts')
    .select('owner_id, profiles (id, sheet_link)')
    .eq('id', personId)
    .eq('type', 'debt')
    .maybeSingle()

  if (accountError) {
    console.error('Failed to fetch account for sheet sync:', accountError)
  }

  const ownerProfile = (accountRow as any)?.profiles as { id?: string; sheet_link?: string | null } | null
  const ownerProfileId = ((accountRow as any)?.owner_id as string | null) ?? ownerProfile?.id ?? null
  if (ownerProfile) {
    const sheetLink = ownerProfile.sheet_link?.trim() ?? null
    console.log('[Sheet] Account-owner lookup result', {
      lookupId: personId,
      profileId: ownerProfileId,
      sheet_link: sheetLink,
    })
    if (isValidWebhook(sheetLink)) {
      return sheetLink
    }
  }

  console.warn('[Sheet] No valid sheet link configured', {
    lookupId: personId,
    profileId: ownerProfileId ?? profileRow?.id ?? null,
  })
  return null
}

async function postToSheet(sheetLink: string, payload: Record<string, unknown>) {
  await fetch(sheetLink, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

function buildPayload(txn: SheetSyncTransaction, action: 'create' | 'delete') {
  const { originalAmount, percentRate, fixedBack, totalBack } = calculateTotals(txn)

  // If amount is negative, it's a credit to the debt account (Repayment) -> Type "In"
  // If amount is positive, it's a debit to the debt account (Lending) -> Type "Debt"
  // Allow override via txn.type
  const type = txn.type ?? ((txn.amount ?? 0) < 0 ? 'In' : 'Debt');

  return {
    action,
    id: txn.id,
    type: type,
    date: txn.occurred_at ?? txn.date ?? null,
    shop: txn.shop_name ?? '',
    notes: txn.note ?? '',
    amount: originalAmount,
    percent_back: txn.cashback_share_percent_input ?? Math.round(percentRate * 10000) / 100,
    fixed_back: fixedBack,
    total_back: totalBack,
    tag: txn.tag ?? undefined,
  }
}

export async function syncTransactionToSheet(
  personId: string,
  txn: SheetSyncTransaction,
  action: 'create' | 'delete'
) {
  try {
    const sheetLink = await getProfileSheetLink(personId)
    if (!sheetLink) return
    const payload = buildPayload(txn, action)
    console.log('Syncing to sheet for Person:', personId, 'Payload:', payload)
    await postToSheet(sheetLink, payload)
  } catch (err) {
    console.error('Sheet sync failed:', err)
  }
}

export async function testConnection(personId: string) {
  try {
    const sheetLink = await getProfileSheetLink(personId)
    if (!sheetLink) {
      return { success: false, message: 'No valid sheet link configured' }
    }

    const today = new Date().toISOString().slice(0, 10)
    const payload = {
      action: 'create',
      type: 'TEST-CONNECTION',
      amount: 0,
      shop: 'MoneyFlow Bot',
      notes: 'Connection successful!',
      date: today,
    }

    await postToSheet(sheetLink, payload)
    return { success: true }
  } catch (err) {
    console.error('Test connection failed:', err)
    return { success: false, message: 'Failed to send test signal' }
  }
}

export async function syncAllTransactions(personId: string) {
  try {
    const sheetLink = await getProfileSheetLink(personId)
    if (!sheetLink) {
      return { success: false, message: 'No valid sheet link configured' }
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('transaction_lines')
      .select(`
        id,
        transaction_id,
        amount,
        original_amount,
        cashback_share_percent,
        cashback_share_fixed,
        metadata,
        person_id,
        transactions!inner(
          id,
          occurred_at,
          note,
          status,
          tag,
          shop_id,
          shops ( name ),
          transaction_lines (
            id,
            type,
            account_id,
            accounts ( name, type )
          )
        )
      `)
      .eq('person_id', personId)
      .order('occurred_at', { foreignTable: 'transactions', ascending: true })

    if (error) {
      console.error('Failed to load transactions for sync:', error)
      return { success: false, message: 'Failed to load transactions' }
    }

    console.log(`[SheetSync] syncAllTransactions for personId: ${personId}. Found ${data?.length} lines.`);
    if (data && data.length > 0) {
      console.log(`[SheetSync] Sample line person_id: ${(data[0] as any).person_id}`);
    }

    const rows = (data ?? []) as {
      id: string
      transaction_id: string
      amount: number
      original_amount?: number | null
      cashback_share_percent?: number | null
      cashback_share_fixed?: number | null
      metadata?: unknown
      transactions: {
        id: string;
        occurred_at: string;
        note: string | null;
        status: string;
        tag: string | null;
        shop_id: string | null;
        shops: { name: string | null } | null;
        transaction_lines: Array<{
          id: string
          type: 'debit' | 'credit'
          account_id: string | null
          accounts: { name: string; type: string } | null
        }> | null
      } | null
    }[]

    let sent = 0
    for (const row of rows) {
      if (!row.transactions) continue

      const meta = (row.metadata as Record<string, unknown> | null) ?? null
      const cashbackAmount =
        typeof meta?.cashback_share_amount === 'number'
          ? meta.cashback_share_amount
          : undefined

      const shopData = row.transactions.shops as any
      let shopName = Array.isArray(shopData) ? shopData[0]?.name : shopData?.name

      if (!shopName) {
        // Fallback to Credit Account Name (Source) if available
        const lines = row.transactions.transaction_lines ?? []
        // Find a credit line that is NOT the debt account (if possible to distinguish)
        // Usually the debt account is the one in 'row.account_id' if this was a direct debt line query?
        // But 'row' is from 'transaction_lines' table.
        // We want the OTHER account.
        // Typically Payer = Credit, Debt = Debit (Asset).
        // Wait, if I lend money: Credit Bank, Debit DebtAccount.
        // So Source is Credit.
        const creditLine = lines.find(l => l.type === 'credit')
        if (creditLine?.accounts?.name) {
          shopName = creditLine.accounts.name
        }
      }

      // Determine type: if amount < 0, it's a repayment (In), otherwise Debt
      const type = row.amount < 0 ? 'In' : 'Debt'

      const action = row.transactions.status === 'void' ? 'delete' : 'create'

      const payload = buildPayload(
        {
          id: row.transactions.id,
          occurred_at: row.transactions.occurred_at,
          note: row.transactions.note,
          shop_name: shopName,
          tag: row.transactions.tag ?? undefined,
          amount: row.amount,
          original_amount: row.original_amount ?? Math.abs(row.amount),
          cashback_share_percent: row.cashback_share_percent ?? undefined,
          cashback_share_fixed: row.cashback_share_fixed ?? undefined,
          cashback_share_amount: cashbackAmount,
          type: type,
        },
        action
      )

      await postToSheet(sheetLink, payload)
      sent += 1

      // Gentle pacing to avoid rate limiting
      if (rows.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return { success: true, count: sent }
  } catch (err) {
    console.error('Sync all transactions failed:', err)
    return { success: false, message: 'Sync failed' }
  }
}
