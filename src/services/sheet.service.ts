'use server'

import { createClient } from '@/lib/supabase/server'

type SheetSyncTransaction = {
  id: string
  occurred_at?: string
  date?: string
  note?: string | null
  tag?: string | null
  shop_name?: string | null
  shop_id?: string | null
  shop_image_url?: string | null
  category_name?: string | null
  category_type?: string | null
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
      sheet_link: sheetLink ? sheetLink.substring(0, 20) + '...' : 'NULL',
    })
    if (isValidWebhook(sheetLink)) {
      return sheetLink
    }
    console.log('[Sheet] Profile sheet link is invalid', { lookupId: personId, sheet_link: sheetLink ? String(sheetLink).substring(0, 20) + '...' : 'NULL' })
  } else {
    console.log('[Sheet] Profile lookup failed (No Data)', { lookupId: personId })
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

  // --- MAPPING LOGIC (Sprint 3) ---
  // Priority 1: Real Shop Name (if shop_id exists)
  // Priority 2: Service Name (if category is "Online Services")
  // Priority 3: Counterparty Name (if category type is "debt")
  // Fallback: Description (Note)

  let finalShopName = txn.shop_name || '';
  const noteContent = txn.note || '';

  if (txn.shop_id && txn.shop_name) {
    // Priority 1: Real Shop
    finalShopName = txn.shop_name;
  } else if (txn.category_name === 'Online Services') {
    // Priority 2: Service Name (from Note)
    finalShopName = noteContent;
  } else if (txn.category_type === 'debt') {
    // Priority 3: Counterparty Name (usually passed as shop_name by caller, or fallback to note)
    if (!finalShopName) {
      finalShopName = noteContent;
    }
  } else {
    // Fallback
    if (!finalShopName) {
      finalShopName = noteContent;
    }
  }

  // Constraint: NEVER send "Draft Fund" or "System Account"
  if (finalShopName === 'Draft Fund' || finalShopName === 'System Account') {
    finalShopName = noteContent;
  }

  // 2. Notes Logic
  // Format: [Icon] Note Content
  // If we have an icon/emoji, prepend it.
  // For now, we just pass the note.
  const finalNote = noteContent;

  return {
    action,
    id: txn.id,
    type: type,
    date: txn.occurred_at ?? txn.date ?? null,
    shop: finalShopName,
    notes: finalNote,
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
          shops ( name, logo_url ),
          transaction_lines (
            id,
            type,
            account_id,
            category_id,
            accounts ( name, type, logo_url ),
            categories ( name, type )
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

    const rows = (data ?? []) as any[]

    let sent = 0
    // Collect all payloads to send in ONE batch (Sprint 3 Requirement)
    // "Send this entire array in ONE POST request to the Webhook."
    const payloads: any[] = [];

    for (const row of rows) {
      if (!row.transactions) continue

      const meta = (row.metadata as Record<string, unknown> | null) ?? null
      const cashbackAmount =
        typeof meta?.cashback_share_amount === 'number'
          ? meta.cashback_share_amount
          : undefined

      const shopData = row.transactions.shops as any
      let shopName = Array.isArray(shopData) ? shopData[0]?.name : shopData?.name
      const shopId = row.transactions.shop_id
      let shopImageUrl = Array.isArray(shopData) ? shopData[0]?.logo_url : shopData?.logo_url

      // Determine Category Info
      // We need to find the "Debit" line (Expense/Asset) to get the category.
      // Usually the person line is a Credit to Debt Account (if Repayment) or Debit to Debt Account (if Lending).
      // Wait, if I lend money: Credit Bank, Debit DebtAccount.
      // The person line is the Debit DebtAccount line.
      // But the category is on the OTHER Debit line? No, usually Lending has:
      // Line 1: Credit Source
      // Line 2: Debit DebtAccount (with category_id)
      // So the person line ITSELF has the category_id.
      // Let's check `row.transactions.transaction_lines`.
      // `row` is from `transaction_lines` table. `row.transactions` is the parent.
      // `row.transactions.transaction_lines` contains ALL lines.

      // We need to find the category associated with this debt.
      // If `row` (the person line) has a category_id, use it.
      // But `row` in the select above doesn't explicitly select `category_id` at the top level, 
      // but `transactions.transaction_lines` does.
      // Actually `row` is a `transaction_lines` record.
      // Let's look at the query: `transaction_lines` -> `transactions` -> `transaction_lines`.
      // We can find the line in `row.transactions.transaction_lines` that matches `row.id`.

      const allLines = row.transactions.transaction_lines || [];
      const currentLine = allLines.find((l: any) => l.id === row.id);

      let categoryName = currentLine?.categories?.name;
      let categoryType = currentLine?.categories?.type;

      if (!shopName) {
        // Fallback to Credit Account Name (Source) if available
        // For Repayment (In), the "Source" is actually the Bank Account (which is Credited in accounting terms if we view from Debt Account perspective? No.)
        // Repayment: Credit Debt Account (Person), Debit Bank Account.
        // Wait, Repayment = Money IN to Bank.
        // Transaction: Debit Bank (Asset Up), Credit Debt Account (Asset Down / Liability Down).
        // In `transaction_lines`:
        // Line 1: Debit Bank (type='debit', account_id=Bank)
        // Line 2: Credit Debt Account (type='credit', account_id=PersonDebtAccount)
        // The `row` here is the Person Line.
        // If `row.amount` < 0, it means Credit. So it is a Repayment.

        if (row.amount < 0) {
          // It is a Repayment. We want the Bank Name.
          // The Bank Line is the DEBIT line.
          const debitLine = allLines.find((l: any) => l.type === 'debit' && l.id !== row.id)
          if (debitLine?.accounts?.name) {
            shopName = debitLine.accounts.name
            if (debitLine.accounts.logo_url) {
              shopImageUrl = debitLine.accounts.logo_url
            }
          }
        } else {
          // It is a Debt (Lending). Money OUT from Bank.
          // Transaction: Credit Bank, Debit Debt Account.
          // `row` is Debit Debt Account (amount > 0).
          // We want the Bank Name (Source).
          // The Bank Line is the CREDIT line.
          const creditLine = allLines.find((l: any) => l.type === 'credit' && l.id !== row.id)
          if (creditLine?.accounts?.name) {
            shopName = creditLine.accounts.name
            if (creditLine.accounts.logo_url) {
              shopImageUrl = creditLine.accounts.logo_url
            }
          }
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
          shop_id: shopId,
          shop_image_url: shopImageUrl,
          category_name: categoryName,
          category_type: categoryType,
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

      payloads.push(payload);
    }

    // Send all in one batch
    if (payloads.length > 0) {
      console.log(`[SheetSync] Sending batch of ${payloads.length} transactions to ${sheetLink}`);
      // Log the first few payloads to debug
      console.log('[SheetSync] Sample Payloads:', payloads.slice(0, 3).map(p => ({ note: p.notes, amount: p.amount, shop: p.shop })));

      // Wrap in sync_all action structure
      const finalPayload = {
        action: 'sync_all',
        transactions: payloads
      };

      await postToSheet(sheetLink, finalPayload as any);
      sent = payloads.length;
    }

    return { success: true, count: sent }
  } catch (err) {
    console.error('Sync all transactions failed:', err)
    return { success: false, message: 'Sync failed' }
  }
}
