'use server'

import { createClient } from '@/lib/supabase/server'
import { yyyyMMToLegacyMMMYY } from '@/lib/month-tag'

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

  // If value > 1, assume it's a percentage number (5 = 5%).
  // If value <= 1, assume it's a decimal (0.05 = 5%).
  // This is a heuristic, but covers 99% of cases (nobody has >100% cashback, and nobody has <1% cashback typically indistinguishable from decimal).
  // Actually, we should standardize. 
  // The service now sends raw number (5, 8). 
  // So if we get 5, we return 0.05.
  // If we get 0.05, we return 0.05.

  return numeric > 1 ? numeric / 100 : numeric
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

function extractSheetId(sheetUrl: string | null | undefined): string | null {
  if (!sheetUrl) return null
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match?.[1] ?? null
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

async function getProfileSheetInfo(personId: string): Promise<{ sheetUrl: string | null; sheetId: string | null }> {
  const supabase = createClient()
  const attempt = await supabase
    .from('profiles')
    .select('id, google_sheet_url')
    .eq('id', personId)
    .maybeSingle()

  if (attempt.error?.code === '42703' || attempt.error?.code === 'PGRST204') {
    return { sheetUrl: null, sheetId: null }
  }

  if (!attempt.error && attempt.data?.google_sheet_url) {
    const sheetUrl = attempt.data.google_sheet_url?.trim() ?? null
    return { sheetUrl, sheetId: extractSheetId(sheetUrl) }
  }

  const { data: accountRow } = await supabase
    .from('accounts')
    .select('owner_id, profiles (id, google_sheet_url)')
    .eq('id', personId)
    .eq('type', 'debt')
    .maybeSingle()

  const ownerProfile = (accountRow as any)?.profiles as { id?: string; google_sheet_url?: string | null } | null
  const sheetUrl = ownerProfile?.google_sheet_url?.trim() ?? null
  return { sheetUrl, sheetId: extractSheetId(sheetUrl) }
}

type SheetPostResult = {
  success: boolean
  json?: Record<string, any> | null
  message?: string
}

async function postToSheet(sheetLink: string, payload: Record<string, unknown>): Promise<SheetPostResult> {
  const response = await fetch(sheetLink, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let json: Record<string, any> | null = null
  try {
    json = (await response.json()) as Record<string, any>
  } catch (error) {
    json = null
  }

  if (!response.ok) {
    return {
      success: false,
      json,
      message: json?.error ?? `Sheet response ${response.status}`,
    }
  }

  if (json && json.ok === false) {
    return {
      success: false,
      json,
      message: json.error ?? 'Sheet returned error',
    }
  }

  return { success: true, json }
}

function buildPayload(txn: SheetSyncTransaction, action: 'create' | 'delete' | 'update') {
  const { originalAmount, percentRate, fixedBack, totalBack } = calculateTotals(txn)

  // If amount is negative, it's a credit to the debt account (Repayment) -> Type "In"
  // If amount is positive, it's a debit to the debt account (Lending) -> Type "Debt"
  // Allow override via txn.type
  const type = txn.type ?? ((txn.amount ?? 0) < 0 ? 'In' : 'Debt');

  return {
    action: action === 'update' ? 'edit' : action, // Map 'update' to 'edit' for backend if needed, or keep 'update'
    id: txn.id,
    type: type,
    date: txn.occurred_at ?? txn.date ?? null,
    shop: txn.shop_name ?? '',
    notes: txn.note ?? '',
    amount: originalAmount,
    // We want to send the raw number (0-100).
    // If input was 5, normalizePercent made it 0.05.
    // So we assume 'percentRate' is ALWAYS decimal [0..1].
    // We multiply by 100 to send to sheet.
    percent_back: Math.round(percentRate * 100 * 100) / 100, // Round to 2 decimals for safety
    fixed_back: fixedBack,
    total_back: totalBack,
    tag: txn.tag ?? undefined,
  }
}

export async function syncTransactionToSheet(
  personId: string,
  txn: SheetSyncTransaction,
  action: 'create' | 'delete' | 'update' = 'create'
) {
  try {
    const sheetLink = await getProfileSheetLink(personId)
    if (!sheetLink) return
    const payload = {
      ...buildPayload(txn, action),
      person_id: personId,
      cycle_tag: txn.tag ?? undefined,
    }
    console.log('Syncing to sheet for Person:', personId, 'Payload:', payload)
    const result = await postToSheet(sheetLink, payload)
    if (!result.success) {
      console.error('Sheet sync failed:', result.message ?? 'Sheet sync failed')
    }
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

    const result = await postToSheet(sheetLink, payload)
    if (!result.success) {
      return { success: false, message: result.message ?? 'Sheet create failed' }
    }
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

    // Query transactions table directly - legacy line items removed
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        occurred_at,
        note,
        status,
        tag,
        type,
        amount,
        cashback_share_percent,
        cashback_share_fixed,
        shop_id,
        shops ( name )
      `)
      .eq('person_id', personId)
      .neq('status', 'void')
      .order('occurred_at', { ascending: true })

    if (error) {
      console.error('Failed to load transactions for sync:', error)
      return { success: false, message: 'Failed to load transactions' }
    }

    console.log(`[SheetSync] syncAllTransactions for personId: ${personId}. Found ${data?.length} transactions.`);

    const rows = (data ?? []) as {
      id: string
      occurred_at: string
      note: string | null
      status: string
      tag: string | null
      type: string | null
      amount: number
      cashback_share_percent?: number | null
      cashback_share_fixed?: number | null
      shop_id: string | null
      shops: { name: string | null } | null
    }[]

    let sent = 0
    for (const txn of rows) {
      const shopData = txn.shops as any
      const shopName = Array.isArray(shopData) ? shopData[0]?.name : shopData?.name

      // Determine type: debt = lending out, repayment = receiving back
      const syncType = txn.type === 'repayment' ? 'In' : 'Debt'

      const payload = buildPayload(
        {
          id: txn.id,
          occurred_at: txn.occurred_at,
          note: txn.note,
          shop_name: shopName ?? '',
          tag: txn.tag ?? undefined,
          amount: txn.amount,
          original_amount: Math.abs(txn.amount),
          cashback_share_percent: txn.cashback_share_percent ?? undefined,
          cashback_share_fixed: txn.cashback_share_fixed ?? undefined,
          type: syncType,
        },
        'create'
      )

      const result = await postToSheet(sheetLink, {
        ...payload,
        person_id: personId,
        cycle_tag: txn.tag ?? undefined,
      })
      if (!result.success) {
        return { success: false, message: result.message ?? 'Sheet sync failed' }
      }
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

type CycleSheetResult = {
  success: boolean
  sheetUrl?: string | null
  sheetId?: string | null
  message?: string
}


export async function createTestSheet(personId: string): Promise<CycleSheetResult> {
  try {
    const sheetLink = await getProfileSheetLink(personId)
    if (!sheetLink) {
      return { success: false, message: 'No valid sheet link configured' }
    }
    const sheetInfo = await getProfileSheetInfo(personId)

    const response = await postToSheet(sheetLink, {
      action: 'create_test_sheet',
      person_id: personId,
      sheet_id: sheetInfo.sheetId ?? undefined,
      sheet_url: sheetInfo.sheetUrl ?? undefined,
    })

    if (!response.success) {
      return { success: false, message: response.message ?? 'Test create failed' }
    }
    
    return { 
      success: true, 
      sheetUrl: (response.json?.sheetUrl as string) ?? null,
      sheetId: (response.json?.sheetId as string) ?? null
    }
  } catch (err) {
    return { success: false, message: 'Unexpected error testing sheet' }
  }
}

export async function createCycleSheet(personId: string, cycleTag: string): Promise<CycleSheetResult> {
  try {
    const sheetLink = await getProfileSheetLink(personId)
    if (!sheetLink) {
      return { success: false, message: 'No valid sheet link configured' }
    }
    const sheetInfo = await getProfileSheetInfo(personId)

    const response = await postToSheet(sheetLink, {
      action: 'create_cycle_sheet',
      person_id: personId,
      cycle_tag: cycleTag,
      sheet_id: sheetInfo.sheetId ?? undefined,
      sheet_url: sheetInfo.sheetUrl ?? undefined,
    })

    if (!response.success) {
      return { success: false, message: response.message ?? 'Failed to create cycle sheet' }
    }

    const json = response.json ?? null
    const sheetUrl = (json?.sheetUrl ?? json?.sheet_url ?? null) as string | null
    const sheetId = (json?.sheetId ?? json?.sheet_id ?? null) as string | null

    return { success: true, sheetUrl, sheetId }
  } catch (error) {
    console.error('Create cycle sheet failed:', error)
    return { success: false, message: 'Failed to create cycle sheet' }
  }
}


export async function syncCycleTransactions(
  personId: string,
  cycleTag: string,
  sheetId?: string | null
) {
  try {
    const sheetLink = await getProfileSheetLink(personId)
    if (!sheetLink) {
      return { success: false, message: 'No valid sheet link configured' }
    }

    const supabase = createClient()
    const legacyTag = yyyyMMToLegacyMMMYY(cycleTag)
    const tags = legacyTag ? [cycleTag, legacyTag] : [cycleTag]

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        occurred_at,
        note,
        status,
        tag,
        type,
        amount,
        cashback_share_percent,
        cashback_share_fixed,
        shop_id,
        shops ( name )
      `)
      .eq('person_id', personId)
      .in('tag', tags)
      .neq('status', 'void')
      .order('occurred_at', { ascending: true })

    if (error) {
      console.error('Failed to load cycle transactions:', error)
      return { success: false, message: 'Failed to load transactions' }
    }

    const rows = (data ?? []) as any[]
    const batchRows = rows.map((txn) => {
      const shopData = txn.shops as any
      const shopName = Array.isArray(shopData) ? shopData[0]?.name : shopData?.name
      const syncType = txn.type === 'repayment' ? 'In' : 'Debt'

      // We explicitly call buildPayload to get the formatted fields, 
      // but we strip the 'action' since we are sending a batch.
      const payload = buildPayload(
        {
          id: txn.id,
          occurred_at: txn.occurred_at,
          note: txn.note,
          shop_name: shopName ?? '',
          tag: txn.tag ?? undefined,
          amount: txn.amount,
          original_amount: Math.abs(txn.amount),
          cashback_share_percent: txn.cashback_share_percent ?? undefined,
          cashback_share_fixed: txn.cashback_share_fixed ?? undefined,
          type: syncType,
        },
        'create' // Dummy action, ignored
      )
      
      return payload
    })

    console.log(`[SheetSync] Sending batch of ${batchRows.length} transactions for ${cycleTag}`)

    const payload = {
      action: 'syncTransactions',
      person_id: personId,
      cycle_tag: cycleTag,
      sheet_id: sheetId ?? undefined,
      rows: batchRows
    }

    const result = await postToSheet(sheetLink, payload)
    
    if (!result.success) {
      return { success: false, message: result.message ?? 'Sheet sync failed' }
    }

    return { success: true, count: batchRows.length }
  } catch (error) {
    console.error('Sync cycle transactions failed:', error)
    return { success: false, message: 'Sync failed' }
  }
}
