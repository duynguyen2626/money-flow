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
    .select('sheet_link')
    .eq('id', personId)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch profile for sheet sync:', error)
    return null
  }

  const sheetLink = (profile as any)?.sheet_link?.trim() ?? null
  if (!isValidWebhook(sheetLink)) {
    return null
  }

  return sheetLink
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
  return {
    action,
    id: txn.id,
    type: 'Debt',
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
          tag,
          shop_id,
          shops ( name )
        )
      `)
      .eq('person_id', personId)
      .order('occurred_at', { foreignTable: 'transactions', ascending: true })

    if (error) {
      console.error('Failed to load transactions for sync:', error)
      return { success: false, message: 'Failed to load transactions' }
    }

    const rows = (data ?? []) as {
      id: string
      transaction_id: string
      amount: number
      original_amount?: number | null
      cashback_share_percent?: number | null
      cashback_share_fixed?: number | null
      metadata?: unknown
      transactions: { id: string; occurred_at: string; note: string | null; tag: string | null } | null
    }[]

    let sent = 0
    for (const row of rows) {
      if (!row.transactions) continue

      const meta = (row.metadata as Record<string, unknown> | null) ?? null
      const cashbackAmount =
        typeof meta?.cashback_share_amount === 'number'
          ? meta.cashback_share_amount
          : undefined

      const payload = buildPayload(
        {
          id: row.transactions.id,
          occurred_at: row.transactions.occurred_at,
          note: row.transactions.note,
          shop_name: row.transactions.shops?.name ?? undefined,
          tag: row.transactions.tag ?? undefined,
          amount: row.amount,
          original_amount: row.original_amount ?? Math.abs(row.amount),
          cashback_share_percent: row.cashback_share_percent ?? undefined,
          cashback_share_fixed: row.cashback_share_fixed ?? undefined,
          cashback_share_amount: cashbackAmount,
        },
        'create'
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
