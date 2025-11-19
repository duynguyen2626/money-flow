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
          cashback_config: item.cashback_config ?? null,
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
    console.error('Error fetching account details:', error)
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
    cashback_config: row.cashback_config ?? null,
  }
}

type TransactionLineWithRelations = TransactionLine & {
  accounts?: { name: string } | null
  categories?: { name: string } | null
}

type TransactionRow = Transaction & {
  transaction_lines?: TransactionLineWithRelations[]
}

function mapTransactionRow(txn: TransactionRow): TransactionWithDetails {
  const lines = txn.transaction_lines ?? []
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

  return {
    id: txn.id,
    occurred_at: txn.occurred_at,
    note: txn.note,
    amount: displayAmount,
    type,
    category_name: categoryName,
    account_name: accountName,
  }
}

export async function getAccountTransactions(
  accountId: string,
  limit = 20
): Promise<TransactionWithDetails[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      note,
      transaction_lines (
        amount,
        type,
        account_id,
        category_id,
        accounts (name),
        categories (name)
      )
    `)
    .order('occurred_at', { ascending: false })
    .eq('transaction_lines.account_id', accountId)
    .limit(limit)

  if (error) {
    console.error('Error fetching transactions for account:', error)
    return []
  }

  const rows = (data ?? []) as TransactionRow[]

  return rows.map(mapTransactionRow)
}
