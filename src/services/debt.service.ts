
'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import type { DebtAccount } from '@/types/moneyflow.types'

type DebtAccountRow = {
  id: string
  name: string
  current_balance: number | null
  owner_id: string | null
}

type Profile = {
  id: string
  name: string
  avatar_url: string | null
  sheet_link?: string | null
}

type DebtAccountWithProfile = DebtAccountRow & {
  profiles: Profile | null
}

type TransactionRow = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type TransactionLineInsert = Database['public']['Tables']['transaction_lines']['Insert']
type TransactionLineRow = Database['public']['Tables']['transaction_lines']['Row']

export type DebtByTagAggregatedResult = {
  tag: string;
  netBalance: number; 
  originalPrincipal: number; 
  totalBack: number; 
  status: string;
  last_activity: string;
}

export async function getDebtAccounts(): Promise<DebtAccount[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, current_balance, owner_id')
    .eq('type', 'debt')
    .order('current_balance', { ascending: false })

  if (error) {
    console.error('Error fetching debt accounts:', error)
    return []
  }

  return (data as DebtAccountRow[]).map(item => ({
    id: item.id,
    name: item.name,
    current_balance: item.current_balance ?? 0,
    owner_id: item.owner_id,
  }))
}

export async function getPersonDetails(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select(`
      id, 
      name, 
      current_balance, 
      owner_id,
      profiles (id, name, avatar_url, sheet_link)
    `)
    .eq('id', id)
    .eq('type', 'debt')
    .single()

  if (error) {
    console.error('Error fetching person details:', error)
    return null
  }

  const accountData = data as unknown as DebtAccountWithProfile

  return {
    id: accountData.id,
    name: accountData.profiles?.name || accountData.name, 
    current_balance: accountData.current_balance ?? 0,
    owner_id: accountData.owner_id,
    avatar_url: accountData.profiles?.avatar_url || null,
    sheet_link: accountData.profiles?.sheet_link ?? null,
  }
}

type TransactionLineWithTransaction = TransactionLineRow & {
  transactions: TransactionRow | null;
}

export async function getDebtByTags(personId: string): Promise<DebtByTagAggregatedResult[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transaction_lines')
    .select(`
      transactions(tag, occurred_at, id),
      amount,
      original_amount,
      cashback_share_percent,
      cashback_share_fixed
    `)
    .eq('account_id', personId)
    .order('occurred_at', { foreignTable: 'transactions', ascending: false });

  if (error) {
    console.error('Error fetching debt by tags:', error);
    return []
  }

  if (!data) {
    return []
  }

  const tagMap: Record<
    string,
    {
      netBalance: number
      originalPrincipal: number
      totalBack: number
      last_activity: string
    }
  > = {}

  const lines: TransactionLineWithTransaction[] = Array.isArray(data) ? (data as TransactionLineWithTransaction[]) : []

  lines.forEach(item => {
    const tag = item.transactions?.tag || 'UNTAGGED'
    const amount = item.amount || 0
    const occurredAt = item.transactions?.occurred_at || ''
    const originalAmount = item.original_amount ?? item.amount ?? 0
    const isLending = amount > 0

    if (!tagMap[tag]) {
      tagMap[tag] = {
        netBalance: 0,
        originalPrincipal: 0,
        totalBack: 0,
        last_activity: occurredAt 
      }
    }
    
    tagMap[tag].netBalance += amount

    if (isLending) {
      tagMap[tag].originalPrincipal += originalAmount
      const backDelta = Math.max(0, originalAmount - amount)
      tagMap[tag].totalBack += backDelta
    }

    if (!tagMap[tag].last_activity || occurredAt > tagMap[tag].last_activity) {
      tagMap[tag].last_activity = occurredAt
    }
  })

  const result = Object.entries(tagMap).map(([tag, { netBalance, originalPrincipal, totalBack, last_activity }]) => ({
    tag,
    netBalance,
    originalPrincipal,
    totalBack,
    status: Math.abs(netBalance) < 0.01 ? 'settled' : 'active',
    last_activity
  }));

  return result;
}

type SettleDebtResult = {
  transactionId: string
  direction: 'collect' | 'repay'
  amount: number
}

export async function settleDebt(
  debtAccountId: string,
  amount: number,
  targetBankAccountId: string,
  note: string,
  date: Date,
  tag: string
): Promise<SettleDebtResult | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || '917455ba-16c0-42f9-9cea-264f81a3db66'

  const { data: debtAccount, error: debtError } = await supabase
    .from('accounts')
    .select('id, name, current_balance')
    .eq('id', debtAccountId)
    .eq('type', 'debt')
    .single()

  if (debtError || !debtAccount) {
    console.error('Debt account not found for settlement:', debtError)
    return null
  }

  const currentBalance = (debtAccount as any).current_balance ?? 0
  const settlementDirection: SettleDebtResult['direction'] =
    currentBalance >= 0 ? 'collect' : 'repay'
  const absoluteAmount = Math.abs(amount)

  if (absoluteAmount <= 0 || Number.isNaN(absoluteAmount)) {
    console.error('Invalid settlement amount entered:', amount)
    return null
  }

  const isOverpayment = absoluteAmount > Math.abs(currentBalance)

  const transactionNoteParts = [
    `Settlement with ${(debtAccount as any).name}`,
    note?.trim() ? note.trim() : undefined,
    isOverpayment ? 'Overpayment' : undefined,
  ].filter(Boolean)

  const transactionNote = transactionNoteParts.join(' - ')

  const { data: transaction, error: transactionError } = await (supabase
    .from('transactions')
    .insert as any)({
      occurred_at: date.toISOString(),
      note: transactionNote,
      status: 'posted',
      tag,
      created_by: userId,
    })
    .select()
    .single()

  if (transactionError || !transaction) {
    console.error('Failed to create settlement transaction header:', transactionError)
    return null
  }

  const lines: TransactionLineInsert[] =
    settlementDirection === 'collect'
      ? [
          {
            account_id: targetBankAccountId,
            amount: absoluteAmount,
            type: 'debit',
            transaction_id: transaction.id,
          },
          {
            account_id: debtAccountId,
            amount: -absoluteAmount,
            type: 'credit',
            transaction_id: transaction.id,
          },
        ]
      : [
          {
            account_id: targetBankAccountId,
            amount: -absoluteAmount,
            type: 'credit',
            transaction_id: transaction.id,
          },
          {
            account_id: debtAccountId,
            amount: absoluteAmount,
            type: 'debit',
            transaction_id: transaction.id,
          },
        ]

  const { error: linesError } = await (supabase.from('transaction_lines').insert as any)(lines)

  if (linesError) {
    console.error('Failed to create settlement transaction lines:', linesError)
    return null
  }

  return {
    transactionId: transaction.id,
    direction: settlementDirection,
    amount: absoluteAmount,
  }
}
