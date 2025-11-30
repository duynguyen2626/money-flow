'use server'

import { createClient } from '@/lib/supabase/server'
import { Account, TransactionLine, TransactionWithDetails, TransactionWithLineRelations } from '@/types/moneyflow.types'
import { Database, Json } from '@/types/database.types'

type AccountRow = {
  id: string
  name: string
  type: Account['type']
  currency: string | null
  current_balance: number | null
  credit_limit: number | null
  owner_id: string | null
  cashback_config: Json | null
  secured_by_account_id: string | null
  is_active: boolean | null
  logo_url: string | null
  total_in: number | null
  total_out: number | null
}

function normalizeCashbackConfig(value: Json | null): Json | null {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (parseError) {
      console.error('Failed to parse cashback_config string:', parseError)
      return null
    }
  }

  return value
}

export async function getAccounts(): Promise<Account[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching accounts:', error)
    if (error.message) console.error('Error message:', error.message)
    if (error.code) console.error('Error code:', error.code)
    return []
  }

  const rows = (data ?? []) as AccountRow[]

  return rows.map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    currency: item.currency ?? 'VND',
    current_balance: item.current_balance ?? 0,
    credit_limit: item.credit_limit ?? 0,
    owner_id: item.owner_id ?? '',
    secured_by_account_id: item.secured_by_account_id ?? null,
    cashback_config: normalizeCashbackConfig(item.cashback_config),
    is_active: typeof item.is_active === 'boolean' ? item.is_active : null,
    logo_url: typeof item.logo_url === 'string' ? item.logo_url : null,
    total_in: item.total_in ?? 0,
    total_out: item.total_out ?? 0,
  }))
}

export async function getAccountDetails(id: string): Promise<Account | null> {
  if (!id || id === 'add' || id === 'undefined') {
    return null
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    // Treat "no rows found" as a simple not-found instead of a hard error
    if (error?.code && error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching account details:', {
      accountId: id,
      message: error?.message ?? 'unknown error',
      code: error?.code,
    })
    return null
  }

  const row = data as AccountRow
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    currency: row.currency ?? 'VND',
    current_balance: row.current_balance ?? 0,
    credit_limit: row.credit_limit ?? 0,
    owner_id: row.owner_id ?? '',
    secured_by_account_id: row.secured_by_account_id ?? null,
    cashback_config: normalizeCashbackConfig(row.cashback_config),
    is_active: typeof row.is_active === 'boolean' ? row.is_active : null,
    logo_url: typeof row.logo_url === 'string' ? row.logo_url : null,
    total_in: row.total_in ?? 0,
    total_out: row.total_out ?? 0,
  }
}

type TransactionRow = {
  id: string
  occurred_at: string
  note: string | null
  tag: string | null // Thêm trường tag
  metadata?: Json | null
  status?: 'posted' | 'pending' | 'void'
  created_at?: string
  cashback_share_percent?: number | null
  cashback_share_fixed?: number | null
  cashback_share_amount?: number | null
  shop_id?: string | null
  shops?: {
    id: string
    name?: string | null
    logo_url?: string | null
  } | null
  transaction_lines?: {
    amount: number
    type: 'debit' | 'credit'
    account_id?: string
    category_id?: string
    person_id?: string | null
    original_amount?: number | null
    cashback_share_percent?: number | null
    cashback_share_fixed?: number | null
    profiles?: { name?: string | null } | null
    accounts?: {
      name: string
    }
    categories?: {
      name: string
    }
    metadata?: Json | null
  }[]
}


type GroupedTransactionLines = {
  transaction_lines: {
    amount: number
    type: string
    account_id: string
  }[]
}

function extractCashbackFromLines(lines: TransactionRow['transaction_lines']): {
  cashback_share_percent?: number
  cashback_share_fixed?: number
  cashback_share_amount?: number
  original_amount?: number
} {
  for (const line of lines ?? []) {
    const meta = (line?.metadata as Record<string, unknown> | null) ?? null
    const readMetaNumber = (key: string) => {
      if (!meta) return undefined
      const value = meta[key]
      return typeof value === 'number' ? value : undefined
    }
    const percent =
      typeof line?.cashback_share_percent === 'number'
        ? line.cashback_share_percent
        : readMetaNumber('cashback_share_percent')
    const fixed =
      typeof line?.cashback_share_fixed === 'number'
        ? line.cashback_share_fixed
        : readMetaNumber('cashback_share_fixed')
    const amount = readMetaNumber('cashback_share_amount')
    const original_amount = typeof line?.original_amount === 'number' ? line.original_amount : undefined
    if (percent !== undefined || fixed !== undefined || amount !== undefined || original_amount !== undefined) {
      return { cashback_share_percent: percent, cashback_share_fixed: fixed, cashback_share_amount: amount, original_amount }
    }
  }
  return {}
}

function extractMetadataFromLines(lines: TransactionRow['transaction_lines']): Json | null {
  for (const line of lines ?? []) {
    if (line?.metadata) {
      return line.metadata
    }
  }
  return null
}

function mapTransactionRow(txn: TransactionRow, accountId?: string): TransactionWithDetails {
  const lines = txn.transaction_lines ?? []
  const cashbackFromLines = extractCashbackFromLines(lines)
  const accountLine = accountId
    ? lines.find(line => line.account_id === accountId)
    : undefined
  const displayAmount =
    typeof accountLine?.amount === 'number'
      ? accountLine.amount
      : lines.reduce((sum, line) => sum + Math.abs(line.amount), 0) / 2

  let type: 'income' | 'expense' | 'transfer' = 'transfer'
  let categoryName: string | undefined
  let accountName: string | undefined

  const categoryLine = lines.find(line => Boolean(line.category_id))
  const creditAccountLine = lines.find(
    line => line.account_id && line.type === 'credit'
  )
  const debitAccountLine = lines.find(
    line => line.account_id && line.type === 'debit'
  )

  if (categoryLine) {
    categoryName = categoryLine.categories?.name
    if (categoryLine.type === 'debit') {
      type = 'expense'
      accountName = creditAccountLine?.accounts?.name
    } else {
      type = 'income'
      accountName = debitAccountLine?.accounts?.name
    }
  } else {
    accountName = debitAccountLine?.accounts?.name ?? creditAccountLine?.accounts?.name
  }

  const counterpartLine =
    accountLine &&
    lines.find(line => line.account_id && line.account_id !== accountLine.account_id)
  if (counterpartLine?.accounts?.name) {
    accountName = counterpartLine.accounts.name
  }

  if (accountLine) {
    type = accountLine.amount >= 0 ? 'income' : 'expense'
  }

  const percentRaw = txn.cashback_share_percent ?? cashbackFromLines.cashback_share_percent
  const cashbackAmount = txn.cashback_share_amount ?? cashbackFromLines.cashback_share_amount
  const personLine = lines.find(line => line.person_id)
  const categoryId = categoryLine?.category_id ?? null

  return {
    id: txn.id,
    occurred_at: txn.occurred_at,
    note: txn.note ?? '',
    status: txn.status ?? 'posted',
    created_at: txn.created_at ?? '',
    amount: displayAmount,
    type,
    category_name: categoryName,
    account_name: accountName,
    category_id: categoryId,
    tag: txn.tag ?? null, // Thêm trường tag
    cashback_share_percent: percentRaw ?? undefined,
    cashback_share_fixed: txn.cashback_share_fixed ?? cashbackFromLines.cashback_share_fixed ?? undefined,
    cashback_share_amount: cashbackAmount ?? undefined,
    original_amount: typeof accountLine?.original_amount === 'number'
      ? accountLine.original_amount
      : cashbackFromLines.original_amount,
    person_id: personLine?.person_id,
    person_name: personLine?.profiles?.name ?? null,
    persisted_cycle_tag: (txn as unknown as { persisted_cycle_tag?: string | null })?.persisted_cycle_tag ?? null,
    metadata: extractMetadataFromLines(lines),
    shop_id: txn.shop_id ?? null,
    shop_name: txn.shops?.name ?? null,
    shop_logo_url: txn.shops?.logo_url ?? null,
    transaction_lines: (txn.transaction_lines ?? []).filter(Boolean) as TransactionWithLineRelations[],
  }
}

function mapDebtTransactionRow(txn: TransactionRow, debtAccountId: string): TransactionWithDetails {
  const lines = txn.transaction_lines ?? []
  const debtLine = lines.find(line => line.account_id === debtAccountId) ?? lines[0]
  const netAmount = debtLine?.amount ?? 0
  const isLending = (debtLine?.amount ?? 0) > 0
  const originalAmount =
    typeof debtLine?.original_amount === 'number'
      ? debtLine.original_amount
      : debtLine?.amount ?? 0
  const netAmountAbs = Math.abs(netAmount)
  const originalAmountAbs = Math.abs(originalAmount)
  const cashbackAmount = isLending
    ? Math.max(0, originalAmountAbs - netAmountAbs)
    : 0
  const personLine = lines.find(line => line.person_id)
  const rawPercent =
    typeof debtLine?.cashback_share_percent === 'number'
      ? debtLine.cashback_share_percent
      : typeof txn.cashback_share_percent === 'number'
        ? txn.cashback_share_percent
        : undefined
  const fixedBack =
    typeof debtLine?.cashback_share_fixed === 'number'
      ? debtLine.cashback_share_fixed
      : typeof txn.cashback_share_fixed === 'number'
        ? txn.cashback_share_fixed
        : undefined

  const categoryLine = lines.find(line => Boolean(line.category_id))
  const creditAccountLine = lines.find(
    line => line.account_id && line.type === 'credit'
  )
  const debitAccountLine = lines.find(
    line => line.account_id && line.type === 'debit'
  )

  const type: 'income' | 'expense' | 'transfer' =
    debtLine && debtLine.amount >= 0 ? 'income' : 'expense'

  let categoryName: string | undefined
  let accountName: string | undefined
  if (categoryLine) {
    categoryName = categoryLine.categories?.name
    accountName = creditAccountLine?.accounts?.name ?? debitAccountLine?.accounts?.name
  } else {
    accountName = debitAccountLine?.accounts?.name ?? creditAccountLine?.accounts?.name
  }
  const categoryId = categoryLine?.category_id ?? null

  return {
    id: txn.id,
    occurred_at: txn.occurred_at,
    note: txn.note ?? '',
    status: (txn as { status?: 'posted' | 'pending' | 'void' }).status ?? 'posted',
    created_at: (txn as { created_at?: string }).created_at ?? '',
    amount: netAmount,
    original_amount: originalAmount,
    type,
    category_name: categoryName,
    account_name: accountName,
    category_id: categoryId,
    tag: txn.tag ?? null,
    cashback_share_percent: rawPercent,
    cashback_share_fixed: fixedBack,
    cashback_share_amount: cashbackAmount,
    person_id: personLine?.person_id ?? null,
    person_name: personLine?.profiles?.name ?? null,
    persisted_cycle_tag: (txn as unknown as { persisted_cycle_tag?: string | null })?.persisted_cycle_tag ?? null,
    metadata: extractMetadataFromLines(lines),
    shop_id: txn.shop_id ?? null,
    shop_name: txn.shops?.name ?? null,
    shop_logo_url: txn.shops?.logo_url ?? null,
    transaction_lines: (txn.transaction_lines ?? []).filter(Boolean) as TransactionWithLineRelations[],
  }
}

async function fetchTransactions(
  accountId: string,
  limit: number,
): Promise<TransactionWithDetails[]> {
  const supabase = createClient()

  try {
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('type')
      .eq('id', accountId)
      .single()

    if (accountError) {
      console.error('Error checking account type:', {
        accountId,
        message: accountError?.message ?? 'unknown error',
        code: accountError?.code,
      })
      return []
    }

    const lineQuery = await supabase
      .from('transaction_lines')
      .select('transaction_id')
      .eq('account_id', accountId)
      .order('id', { ascending: false })
      .limit(Math.max(limit, 50))

    let transactionIds: string[] = []
    if (lineQuery.error) {
      console.error('Error fetching transaction lines:', {
        accountId,
        message: lineQuery.error.message ?? 'unknown error',
        code: lineQuery.error.code,
      })
    } else {
      transactionIds = Array.from(
        new Set((lineQuery.data ?? [])
          .map(line => (line as { transaction_id?: string }).transaction_id)
          .filter((id): id is string => Boolean(id)))
      )
    }

    const accountType = (accountData as { type?: Account['type'] } | null)?.type
    const isDebtAccount = accountType === 'debt'

    if (transactionIds.length > 0) {
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          occurred_at,
          note,
          tag,
          status,
          created_at,
          shop_id,
          shops ( id, name, logo_url ),
          transaction_lines (
            amount,
            type,
            account_id,
            metadata,
            category_id,
            person_id,
            original_amount,
            cashback_share_percent,
            cashback_share_fixed,
            profiles ( name ),
            accounts (name, logo_url),
            categories (name)
          )
        `)
        .in('id', transactionIds)
        .order('occurred_at', { ascending: false })

      if (!txError && transactions) {
        const rows = transactions as TransactionRow[]
        return isDebtAccount
          ? rows.map(row => mapDebtTransactionRow(row, accountId))
          : rows.map(row => mapTransactionRow(row, accountId))
      }

      if (txError) {
        console.error('Error fetching transactions for account:', {
          accountId,
          message: txError?.message ?? 'unknown error',
          code: txError?.code,
        })
      }
    }

    // Fallback: query transactions with inner filter to avoid empty results when line query fails
    const { data: fallbackRows, error: fallbackError } = await supabase
      .from('transactions')
      .select(`
        id,
        occurred_at,
        note,
        tag,
        status,
        created_at,
        shop_id,
        shops ( id, name, logo_url ),
        transaction_lines!inner (
          amount,
          type,
          account_id,
          metadata,
          category_id,
          person_id,
          original_amount,
          cashback_share_percent,
          cashback_share_fixed,
          profiles ( name ),
          accounts (name, logo_url),
          categories (name)
        )
      `)
      .eq('transaction_lines.account_id', accountId)
      .order('occurred_at', { ascending: false })
      .limit(limit)

    if (fallbackError) {
      console.error('Error fetching transactions via fallback:', {
        accountId,
        message: fallbackError?.message ?? 'unknown error',
        code: fallbackError?.code,
      })
      return []
    }

    const rows = (fallbackRows ?? []) as TransactionRow[]
    return isDebtAccount
      ? rows.map(row => mapDebtTransactionRow(row, accountId))
      : rows.map(row => mapTransactionRow(row, accountId))
  } catch (err) {
    console.error('Unexpected error in fetchTransactions:', err)
    return []
  }
}

export async function getAccountTransactions(
  accountId: string,
  limit = 20
): Promise<TransactionWithDetails[]> {
  return fetchTransactions(accountId, limit)
}

export async function updateAccountConfig(
  accountId: string,
  data: {
    name?: string
    credit_limit?: number | null
    cashback_config?: Json | null
    type?: Account['type']
    secured_by_account_id?: string | null
    is_active?: boolean | null
    logo_url?: string | null
  }
): Promise<boolean> {
  const supabase = createClient()

  const payload: any = {}

  if (typeof data.name === 'string') {
    payload.name = data.name
  }

  if (typeof data.credit_limit !== 'undefined') {
    payload.credit_limit = data.credit_limit
  }

  if (typeof data.cashback_config !== 'undefined') {
    payload.cashback_config = data.cashback_config
  }

  if (typeof data.type === 'string') {
    payload.type = data.type
  }

  if ('secured_by_account_id' in data) {
    payload.secured_by_account_id = data.secured_by_account_id ?? null
  }

  if (typeof data.is_active === 'boolean') {
    payload.is_active = data.is_active
  }



  if (typeof data.logo_url === 'string') {
    payload.logo_url = data.logo_url
  }

  if (Object.keys(payload).length === 0) {
    return true
  }

  const { error } = await (supabase
    .from('accounts')
    .update as any)(payload)
    .eq('id', accountId)

  if (error) {
    console.error('Error updating account configuration:', error)
    return false
  }

  return true
}

export async function getAccountStats(accountId: string) {
  const { getAccountSpendingStats } = await import('@/services/cashback.service')
  const stats = await getAccountSpendingStats(accountId, new Date())
  return stats
}

export async function getAccountTransactionDetails(
  accountId: string,
  limit = 20
): Promise<GroupedTransactionLines[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transaction_lines')
    .select('transaction_id, amount, type, account_id')
    .eq('account_id', accountId)
    .order('id', { ascending: false })
    .limit(Math.max(limit, 50))

  if (error) {
    console.error('Error fetching transaction details for account:', {
      accountId,
      message: error?.message ?? 'unknown error',
      code: error?.code,
    })

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('transactions')
      .select(`
        transaction_lines!inner (
          transaction_id,
          amount,
          type,
          account_id
        )
      `)
      .eq('transaction_lines.account_id', accountId)
      .order('occurred_at', { ascending: false })
      .limit(limit)

    if (fallbackError) {
      console.error('Error fetching transaction details via fallback:', {
        accountId,
        message: fallbackError?.message ?? 'unknown error',
        code: fallbackError?.code,
      })
      return []
    }

    const groupedFallback = new Map<string, GroupedTransactionLines>()
      ; (fallbackData ?? []).forEach(row => {
        const lines = (row as { transaction_lines?: { transaction_id?: string; amount?: number; type?: string; account_id?: string }[] }).transaction_lines ?? []
        lines.forEach(line => {
          if (!line.transaction_id) return
          if (!groupedFallback.has(line.transaction_id)) {
            groupedFallback.set(line.transaction_id, { transaction_lines: [] })
          }
          groupedFallback.get(line.transaction_id)!.transaction_lines.push({
            amount: line.amount ?? 0,
            type: line.type ?? '',
            account_id: line.account_id ?? '',
          })
        })
      })
    return Array.from(groupedFallback.values())
  }

  const grouped = new Map<string, GroupedTransactionLines>()
    ; (data as any ?? []).forEach((line: any) => {
      if (!line.transaction_id) return
      if (!grouped.has(line.transaction_id)) {
        grouped.set(line.transaction_id, { transaction_lines: [] })
      }
      grouped.get(line.transaction_id)!.transaction_lines.push({
        amount: line.amount ?? 0,
        type: line.type ?? '',
        account_id: line.account_id ?? '',
      })
    })

  return Array.from(grouped.values())
}

/**
 * Recalculate account balance based on transaction lines
 * @param accountId The account ID to recalculate
 * @returns Boolean indicating success
 */
export async function recalculateBalance(accountId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    // Get all transaction lines for this account, excluding void transactions
    const { data: lines, error } = await supabase
      .from('transaction_lines')
      .select('amount, type, transactions!inner(status)')
      .eq('account_id', accountId)
      .neq('transactions.status', 'void')

    if (error) {
      console.error('Error fetching transaction lines for recalculation:', error)
      return false
    }

    // Calculate totals
    let currentBalance = 0
    let totalIn = 0
    let totalOut = 0

    lines.forEach((line: any) => {
      // Double check status just in case
      if (line.transactions?.status === 'void') return

      // For debt accounts:
      // Lending (Debit) -> Increase Asset (Positive Balance)
      // Collecting (Credit) -> Decrease Asset (Negative Balance)
      // Wait, standard accounting:
      // Asset Account (Bank, Debt): Debit increases, Credit decreases.
      // Liability Account (Credit Card): Credit increases (debt), Debit decreases (payment).

      // However, MoneyFlow might store signed amounts or rely on type.
      // In transaction_lines:
      // type='debit', amount is usually positive.
      // type='credit', amount is usually negative.
      // But let's check how it's stored.
      // Usually `amount` in DB is signed? Or unsigned and `type` determines sign?
      // Looking at `mapTransactionRow`: 
      // "displayAmount = ... lines.reduce((sum, line) => sum + Math.abs(line.amount), 0)"
      // "type = accountLine.amount >= 0 ? 'income' : 'expense'"
      // This implies `amount` is signed in the DB.

      // Let's assume `amount` is signed.
      // If `amount` is signed, we just sum it up to get the balance?
      // Let's check `getDebtByTags`: "netBalance += amount".
      // Yes, it seems `amount` is signed and we just sum it.

      // BUT, the existing code in `recalculateBalance` (lines 700-709) does:
      // amount = Math.abs(line.amount)
      // if type == 'debit' -> currentBalance += amount
      // if type == 'credit' -> currentBalance -= amount

      // This logic assumes:
      // Debit = Increase Balance
      // Credit = Decrease Balance
      // This is correct for Asset accounts (Bank, Cash, Debt).
      // For Liability accounts (Credit Card), it's reversed usually, OR the balance is negative.
      // If Credit Card balance is positive in UI (meaning debt), then Credit should INCREASE it.
      // But usually Credit Card balance is displayed as negative or positive depending on convention.

      // Let's stick to the existing logic which seems to be:
      // Balance = Sum(Debits) - Sum(Credits)

      const amount = Math.abs(line.amount)
      if (line.type === 'debit') {
        currentBalance += amount
        totalIn += amount
      } else if (line.type === 'credit') {
        currentBalance -= amount
        totalOut += amount
      }
    })

    // Update account with recalculated values
    const { error: updateError } = await (supabase
      .from('accounts')
      .update as any)({
        current_balance: currentBalance,
        total_in: totalIn,
        total_out: totalOut
      })
      .eq('id', accountId)

    if (updateError) {
      console.error('Error updating account with recalculated values:', updateError)
      return false
    }

    return true
  } catch (err) {
    console.error('Unexpected error during balance recalculation:', err)
    return false
  }
}
