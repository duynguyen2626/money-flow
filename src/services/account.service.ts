import { createClient } from '@/lib/supabase/server'
import { Account, Transaction, TransactionLine, TransactionWithDetails } from '@/types/moneyflow.types'
import { Json } from '@/types/database.types'

type AccountRow = {
  id: string
  name: string
  type: Account['type']
  currency: string | null
  current_balance: number | null
  credit_limit: number | null
  owner_id: string | null
  cashback_config: Json | null
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
    cashback_config: normalizeCashbackConfig(item.cashback_config),
        }))
}

export async function getAccountDetails(id: string): Promise<Account | null> {
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
    cashback_config: normalizeCashbackConfig(row.cashback_config),
  }
}

type TransactionLineWithRelations = TransactionLine & {
  accounts?: { name: string } | null
  categories?: { name: string } | null
  original_amount?: number | null
  cashback_share_percent?: number | null
  cashback_share_fixed?: number | null
  metadata?: Json | null
}

type TransactionRow = {
  id: string
  occurred_at: string
  note: string
  tag: string | null // Thêm trường tag
  cashback_share_percent?: number | null
  cashback_share_fixed?: number | null
  cashback_share_amount?: number | null
  transaction_lines?: {
    amount: number
    type: 'debit' | 'credit'
    account_id?: string
    category_id?: string
    original_amount?: number | null
    cashback_share_percent?: number | null
    cashback_share_fixed?: number | null
    accounts?: {
      name: string
    }
    categories?: {
      name: string
    }
    metadata?: Json | null
  }[]
}

function extractCashbackFromLines(lines: TransactionRow['transaction_lines']): {
  cashback_share_percent?: number
  cashback_share_fixed?: number
  cashback_share_amount?: number
  original_amount?: number
} {
  for (const line of lines ?? []) {
    const meta = line?.metadata as any
    const percent =
      typeof line?.cashback_share_percent === 'number'
        ? line.cashback_share_percent
        : typeof meta?.cashback_share_percent === 'number'
          ? meta.cashback_share_percent
          : undefined
    const fixed =
      typeof line?.cashback_share_fixed === 'number'
        ? line.cashback_share_fixed
        : typeof meta?.cashback_share_fixed === 'number'
          ? meta.cashback_share_fixed
          : undefined
    const amount =
      typeof meta?.cashback_share_amount === 'number'
        ? meta.cashback_share_amount
        : undefined
    const original_amount = typeof line?.original_amount === 'number' ? line.original_amount : undefined
    if (percent !== undefined || fixed !== undefined || amount !== undefined || original_amount !== undefined) {
      return { cashback_share_percent: percent, cashback_share_fixed: fixed, cashback_share_amount: amount, original_amount }
    }
  }
  return {}
}

function mapTransactionRow(txn: TransactionRow): TransactionWithDetails {
  const lines = txn.transaction_lines ?? []
  const cashbackFromLines = extractCashbackFromLines(lines)
  const displayAmount =
    lines.reduce((sum, line) => sum + Math.abs(line.amount), 0) / 2

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

  const percentRaw = txn.cashback_share_percent ?? cashbackFromLines.cashback_share_percent
  const cashbackAmount = txn.cashback_share_amount ?? cashbackFromLines.cashback_share_amount

  return {
    id: txn.id,
    occurred_at: txn.occurred_at,
    note: txn.note,
    amount: displayAmount,
    type,
    category_name: categoryName,
    account_name: accountName,
    tag: txn.tag || undefined, // Thêm trường tag
    cashback_share_percent: percentRaw ?? undefined,
    cashback_share_fixed: txn.cashback_share_fixed ?? cashbackFromLines.cashback_share_fixed ?? undefined,
    cashback_share_amount: cashbackAmount ?? undefined,
    original_amount: cashbackFromLines.original_amount,
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

  return {
    id: txn.id,
    occurred_at: txn.occurred_at,
    note: txn.note,
    amount: netAmount,
    original_amount: originalAmount,
    type,
    category_name: categoryName,
    account_name: accountName,
    tag: txn.tag || undefined,
    cashback_share_percent: rawPercent,
    cashback_share_fixed: fixedBack,
    cashback_share_amount: cashbackAmount,
  }
}

async function fetchTransactions(
  accountId: string,
  limit: number,
  includeCashback: boolean
): Promise<TransactionWithDetails[]> {
  const supabase = createClient()
  const columns = [
    'id',
    'occurred_at',
    'note',
    'tag',
    ...(includeCashback
      ? ['cashback_share_percent', 'cashback_share_fixed', 'cashback_share_amount']
      : []),
  ]

  try {
    // First, check if this is a debt account
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

    if ((accountData as any)?.type === 'debt') {
      // For debt accounts, query transaction_lines directly
      const { data, error } = await supabase
        .from('transaction_lines')
        .select(`
          amount,
          type,
          account_id,
          metadata,
          category_id,
          original_amount,
          cashback_share_percent,
          cashback_share_fixed,
          transactions (
            ${columns.join(',\n')}
          ),
          accounts (name),
          categories (name)
        `)
        .eq('account_id', accountId)
        .limit(limit)

      if (error) {
        if (includeCashback) {
          // Retry without cashback columns to handle missing schema fields.
          return fetchTransactions(accountId, limit, false)
        }
        console.error('Error fetching transactions for debt account:', {
          accountId,
          message: error?.message ?? 'unknown error',
          code: error?.code,
        })
        return []
      }

      // Group transaction lines by transaction ID to reconstruct transactions
      const transactionMap = new Map<string, any>()
      
      data?.forEach((line: any) => {
        const transaction = line.transactions
        if (!transaction) return
        
        if (!transactionMap.has(transaction.id)) {
          transactionMap.set(transaction.id, {
            ...transaction,
            transaction_lines: []
          })
        }
        
        transactionMap.get(transaction.id).transaction_lines.push({
          amount: line.amount,
          type: line.type,
          account_id: line.account_id,
          category_id: line.category_id,
          original_amount: line.original_amount,
          cashback_share_percent: line.cashback_share_percent,
          cashback_share_fixed: line.cashback_share_fixed,
          metadata: line.metadata,
          accounts: line.accounts,
          categories: line.categories
        })
      })

      const rows = Array.from(transactionMap.values()) as TransactionRow[]
      // Ensure newest transactions appear first since remote ordering on nested relations can fail
      rows.sort(
        (a, b) =>
          new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      )
      return rows.map(row => mapDebtTransactionRow(row, accountId))
    } else {
      // Regular account query
      const query = supabase
        .from('transactions')
        .select(`
          ${columns.join(',\n')}
          transaction_lines (
            amount,
            type,
            account_id,
            metadata,
            category_id,
            accounts (name),
            categories (name)
          )
        `)
        .order('occurred_at', { ascending: false })
        .eq('transaction_lines.account_id', accountId)
        .limit(limit)

      const { data, error } = await query

      if (error) {
        if (includeCashback) {
          // Retry without cashback columns to handle missing schema fields.
          return fetchTransactions(accountId, limit, false)
        }
        console.error('Error fetching transactions for account:', {
          accountId,
          message: error?.message ?? 'unknown error',
          code: error?.code,
        })
        return []
      }

      const rows = (data ?? []) as TransactionRow[]
      return rows.map(mapTransactionRow)
    }
  } catch (err) {
    console.error('Unexpected error in fetchTransactions:', err)
    return []
  }
}

export async function getAccountTransactions(
  accountId: string,
  limit = 20
): Promise<TransactionWithDetails[]> {
  return fetchTransactions(accountId, limit, true)
}

export async function updateAccountConfig(
  accountId: string,
  data: {
    name?: string
    credit_limit?: number | null
    cashback_config?: Json | null
  }
): Promise<boolean> {
  const supabase = createClient()

  const payload: {
    name?: string
    credit_limit?: number | null
    cashback_config?: Json | null
  } = {}

  if (typeof data.name === 'string') {
    payload.name = data.name
  }

  if (typeof data.credit_limit !== 'undefined') {
    payload.credit_limit = data.credit_limit
  }

  if (typeof data.cashback_config !== 'undefined') {
    payload.cashback_config = data.cashback_config
  }

  if (Object.keys(payload).length === 0) {
    return true
  }

  const { error } = await supabase
    .from('accounts')
    .update(payload)
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
): Promise<any[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      note,
      tag,
      transaction_lines (
        amount,
        type,
        account_id
      )
    `)
    .order('occurred_at', { ascending: false })
    .eq('transaction_lines.account_id', accountId)
    .limit(limit)

  if (error) {
    console.error('Error fetching transaction details for account:', {
      accountId,
      message: error?.message ?? 'unknown error',
      code: error?.code,
    })
    return []
  }

  return data ?? []
}
