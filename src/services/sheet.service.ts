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
  img_url?: string | null
}

function getCycleTag(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
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
    .from('people')
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
    .select('owner_id, people (id, sheet_link)')
    .eq('id', personId)
    .eq('type', 'debt')
    .maybeSingle()

  if (accountError) {
    console.error('Failed to fetch account for sheet sync:', accountError)
  }

  const ownerProfile = (accountRow as any)?.people as { id?: string; sheet_link?: string | null } | null
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
    .from('people')
    .select('id, google_sheet_url')
    .eq('id', personId)
    .maybeSingle()

  if (attempt.error?.code === '42703' || attempt.error?.code === 'PGRST204') {
    return { sheetUrl: null, sheetId: null }
  }

  if (!attempt.error && (attempt.data as any)?.google_sheet_url) {
    const sheetUrl = (attempt.data as any).google_sheet_url?.trim() ?? null
    return { sheetUrl, sheetId: extractSheetId(sheetUrl) }
  }

  const { data: accountRow } = await supabase
    .from('accounts')
    .select('owner_id, people (id, google_sheet_url)')
    .eq('id', personId)
    .eq('type', 'debt')
    .maybeSingle()

  const ownerProfile = (accountRow as any)?.people as { id?: string; google_sheet_url?: string | null } | null
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
    img: txn.img_url ?? undefined
  }
}

export async function syncTransactionToSheet(
  personId: string,
  txn: SheetSyncTransaction,
  action: 'create' | 'delete' | 'update' = 'create'
) {
  try {
    // Check for #nosync or #deprecated tags
    const note = (txn.note || '').toLowerCase()
    if (note.includes('#nosync') || note.includes('#deprecated')) {
      // If tagged as nosync, we treat it as a deletion from the sheet
      action = 'delete'
    }

    const sheetLink = await getProfileSheetLink(personId)
    if (!sheetLink) return

    // Fetch person's sheet preferences (replaces hardcoded ANH_SCRIPT)
    const supabaseTxn = await createClient()
    const { data: personData, error: personError } = await supabaseTxn
      .from('people')
      .select('sheet_show_bank_account, sheet_bank_info, sheet_linked_bank_id, sheet_show_qr_image, sheet_full_img')
      .eq('id', personId)
      .single()

    if (personError) {
      console.error('[syncTransactionToSheet] Error fetching person preferences:', personError)
    }

    const showBankAccount = (personData as any)?.sheet_show_bank_account ?? false
    const manualBankInfo = (personData as any)?.sheet_bank_info ?? ''
    const linkedBankId = (personData as any)?.sheet_linked_bank_id
    const showQrImage = (personData as any)?.sheet_show_qr_image ?? false
    const qrImageUrl = (personData as any)?.sheet_full_img ?? null

    let resolvedBankInfo = manualBankInfo
    if (showBankAccount && linkedBankId) {
      const { data: acc } = await supabaseTxn
        .from('accounts')
        .select('name, receiver_name, account_number')
        .eq('id', linkedBankId)
        .single()
      if (acc) {
        const parts = [
          (acc as any).name,
          (acc as any).account_number,
          (acc as any).receiver_name
        ].filter(Boolean)
        resolvedBankInfo = parts.join(' ') || manualBankInfo
      }
    }

    console.log('[syncTransactionToSheet] Person sheet preferences:', {
      personId,
      showBankAccount,
      resolvedBankInfo,
      showQrImage,
      qrImageUrl: qrImageUrl ? '(URL set)' : '(not set)'
    })

    const payload = {
      ...buildPayload(txn, action),
      person_id: personId,
      cycle_tag: txn.tag ?? undefined,
      bank_account: showBankAccount ? resolvedBankInfo : '', // Send empty to clear if disabled
      img: showQrImage && qrImageUrl ? qrImageUrl : '' // Send empty to clear if disabled
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
        shops ( name ),
        account_id,
        accounts!account_id ( name )
      `)
      .eq('person_id', personId)
      .neq('status', 'void')
      .order('occurred_at', { ascending: true })

    if (error) {
      console.error('Failed to load transactions for sync:', error)
      return { success: false, message: 'Failed to load transactions' }
    }

    console.log(`[SheetSync] syncAllTransactions for personId: ${personId}. Found ${data?.length} transactions.`);

    const rows = (data ?? []) as unknown as {
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
      account_id: string | null
      accounts: { name: string | null } | null
    }[]

    // Group transactions by cycle tag
    const cycleMap = new Map<string, typeof rows>()

    for (const txn of rows) {
      const cycleTag = txn.tag || getCycleTag(new Date(txn.occurred_at))
      if (!cycleMap.has(cycleTag)) {
        cycleMap.set(cycleTag, [])
      }
      cycleMap.get(cycleTag)!.push(txn)
    }

    let totalSynced = 0

    // Sync each cycle as a batch
    for (const [cycleTag, cycleTxns] of cycleMap.entries()) {
      const rowsPayload = cycleTxns.map(txn => {
        const shopData = txn.shops as any
        let shopName = Array.isArray(shopData) ? shopData[0]?.name : shopData?.name

        // Fallback for Repayment/Transfer if shop is empty -> Use Account Name
        if (!shopName) {
          if (txn.note?.toLowerCase().startsWith('rollover')) {
            shopName = 'Bank'
          } else {
            const accData = txn.accounts as any
            shopName = (Array.isArray(accData) ? accData[0]?.name : accData?.name) ?? ''
          }
        }

        // Determine type: debt = lending out, repayment = receiving back
        const syncType = txn.type === 'repayment' ? 'In' : 'Debt'

        return {
          id: txn.id,
          date: txn.occurred_at,
          type: syncType,
          notes: txn.note || '',
          shop: shopName || '',
          amount: Math.abs(txn.amount),
          percent_back: txn.cashback_share_percent || 0,
          fixed_back: txn.cashback_share_fixed || 0,
          status: txn.status,
        }
      })

      const payload = {
        action: 'syncTransactions',
        personId: personId,
        cycleTag: cycleTag,
        rows: rowsPayload,
      }

      const result = await postToSheet(sheetLink, payload)
      if (!result.success) {
        return { success: false, message: result.message ?? `Sheet sync failed for cycle ${cycleTag}` }
      }

      totalSynced += rowsPayload.length
    }

    return { success: true, count: totalSynced }
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
        shops ( name ),
        account_id,
        accounts!account_id ( name )
      `)
      .eq('person_id', personId)
      .in('tag', tags)
      .neq('status', 'void')
      .order('occurred_at', { ascending: true })

    if (error) {
      console.error('Failed to load cycle transactions:', error)
      return { success: false, message: 'Failed to load transactions' }
    }

    // Filter out transactions marked as #nosync or #deprecated
    // This allows users to create "Aggregate" transactions in App (for balance) 
    // but keep detailed manual rows in Sheet without duplication.
    const rawRows = (data ?? []) as unknown as any[]
    const rows = rawRows.filter(txn => {
      const note = (txn.note || '').toLowerCase()
      return !note.includes('#nosync') && !note.includes('#deprecated')
    })
    const batchRows = rows.map((txn) => {
      const shopData = txn.shops as any
      let shopName = Array.isArray(shopData) ? shopData[0]?.name : shopData?.name

      // Fallback for Repayment/Transfer if shop is empty -> Use Account Name
      if (!shopName) {
        if (txn.note?.toLowerCase().startsWith('rollover')) {
          shopName = 'Bank'
        } else {
          const accData = txn.accounts as any
          shopName = (Array.isArray(accData) ? accData[0]?.name : accData?.name) ?? ''
        }
      }
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

    // Fetch person's sheet preferences (replaces hardcoded ANH_SCRIPT)
    const supabaseCycle = await createClient()
    const { data: personData, error: personError } = await supabaseCycle
      .from('people')
      .select('sheet_show_bank_account, sheet_bank_info, sheet_linked_bank_id, sheet_show_qr_image, sheet_full_img')
      .eq('id', personId)
      .single()

    if (personError) {
      console.error('[syncCycleTransactions] Error fetching person preferences:', personError)
    }

    const showBankAccount = (personData as any)?.sheet_show_bank_account ?? false
    const manualBankInfo = (personData as any)?.sheet_bank_info ?? ''
    const linkedBankId = (personData as any)?.sheet_linked_bank_id
    const showQrImage = (personData as any)?.sheet_show_qr_image ?? false
    const qrImageUrl = (personData as any)?.sheet_full_img ?? null

    let resolvedBankInfo = manualBankInfo
    if (showBankAccount && linkedBankId) {
      const { data: acc } = await supabaseCycle
        .from('accounts')
        .select('name, receiver_name, account_number')
        .eq('id', linkedBankId)
        .single()
      if (acc) {
        const parts = [
          (acc as any).name,
          (acc as any).account_number,
          (acc as any).receiver_name
        ].filter(Boolean)
        resolvedBankInfo = parts.join(' ') || manualBankInfo
      }
    }

    console.log('[syncCycleTransactions] Person sheet preferences:', {
      personId,
      showBankAccount,
      resolvedBankInfo,
      showQrImage,
      qrImageUrl: qrImageUrl ? '(URL set)' : '(not set)'
    })

    const payload = {
      action: 'syncTransactions',
      person_id: personId,
      cycle_tag: cycleTag,
      sheet_id: sheetId ?? undefined,
      rows: batchRows,
      bank_account: showBankAccount ? resolvedBankInfo : '',
      img: showQrImage && qrImageUrl ? qrImageUrl : ''
    }

    console.log('[syncCycleTransactions] Final payload:', { ...payload, rows: `[${payload.rows.length} rows]` })

    const result = await postToSheet(sheetLink, payload)

    if (!result.success) {
      return { success: false, message: result.message ?? 'Sheet sync failed' }
    }

    return {
      success: true,
      count: batchRows.length,
      syncedCount: result.json?.syncedCount,
      manualPreserved: result.json?.manualPreserved,
      totalRows: result.json?.totalRows
    }
  } catch (error) {
    console.error('Sync cycle transactions failed:', error)
    return { success: false, message: 'Sync failed' }
  }
}

/**
 * Auto-sync cycle sheet after service distribution
 * Only triggers if:
 * 1. Person has sheet_link configured
 * 2. Cycle sheet doesn't exist yet
 */
export async function autoSyncCycleSheetIfNeeded(personId: string, cycleTag: string): Promise<void> {
  try {
    console.log(`[AutoSync] Checking if auto-sync needed for ${personId} / ${cycleTag}`)

    // 1. Check if person has sheet_link configured
    const sheetLink = await getProfileSheetLink(personId)
    if (!sheetLink) {
      console.log(`[AutoSync] Skipping ${personId}: No sheet link configured`)
      return
    }

    // 2. Check if cycle sheet already exists
    const supabase = createClient()
    const { data: existing } = await (supabase as any)
      .from('person_cycle_sheets')
      .select('id, sheet_id, sheet_url')
      .eq('person_id', personId)
      .eq('cycle_tag', cycleTag)
      .maybeSingle()

    if (existing?.sheet_id || existing?.sheet_url) {
      console.log(`[AutoSync] Skipping ${personId}: Cycle sheet already exists`)
      return
    }

    console.log(`[AutoSync] Triggering auto-sync for ${personId} / ${cycleTag}`)

    // 3. Create cycle sheet
    const createResult = await createCycleSheet(personId, cycleTag)
    if (!createResult.success) {
      console.error(`[AutoSync] Failed to create cycle sheet: ${createResult.message}`)
      return
    }

    // 4. Sync transactions
    const syncResult = await syncCycleTransactions(personId, cycleTag, createResult.sheetId)
    if (!syncResult.success) {
      console.error(`[AutoSync] Failed to sync transactions: ${syncResult.message}`)
      return
    }

    // 5. Update database
    const payload = {
      person_id: personId,
      cycle_tag: cycleTag,
      sheet_id: createResult.sheetId,
      sheet_url: createResult.sheetUrl,
    }

    if (existing?.id) {
      await (supabase as any)
        .from('person_cycle_sheets')
        .update(payload)
        .eq('id', existing.id)
    } else {
      await (supabase as any)
        .from('person_cycle_sheets')
        .insert(payload)
    }

    console.log(`[AutoSync] Successfully auto-synced ${personId} / ${cycleTag}`)
  } catch (error) {
    console.error(`[AutoSync] Error for ${personId} / ${cycleTag}:`, error)
    // Silent fail - don't throw, just log
  }
}
