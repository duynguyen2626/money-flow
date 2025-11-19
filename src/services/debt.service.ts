'use server'

import { createClient } from '@/lib/supabase/server'
import { DebtAccount } from '@/types/moneyflow.types'

type DebtRow = {
  id: string
  name: string
  current_balance: number | null
  owner_id: string | null
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

  return (data as DebtRow[]).map(item => ({
    id: item.id,
    name: item.name,
    current_balance: item.current_balance ?? 0,
    owner_id: item.owner_id,
  }))
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
  date: Date
): Promise<SettleDebtResult | null> {
  const supabase = createClient()

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

  const currentBalance = debtAccount.current_balance ?? 0
  if (currentBalance === 0) {
    console.warn('Attempt to settle an already balanced debt account.')
    return null
  }

  const settlementDirection: SettleDebtResult['direction'] =
    currentBalance > 0 ? 'collect' : 'repay'
  const sanitizedAmount = Math.min(Math.abs(amount), Math.abs(currentBalance))

  if (!sanitizedAmount || Number.isNaN(sanitizedAmount)) {
    console.error('Invalid settlement amount calculated:', sanitizedAmount)
    return null
  }

  const transactionNote = `Settlement with ${debtAccount.name}${
    note ? ` - ${note}` : ''
  }`

  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      occurred_at: date.toISOString(),
      note: transactionNote,
      status: 'posted',
    })
    .select()
    .single()

  if (transactionError || !transaction) {
    console.error('Failed to create settlement transaction header:', transactionError)
    return null
  }

  const absoluteAmount = Math.abs(sanitizedAmount)
  const lines =
    settlementDirection === 'collect'
      ? [
          {
            account_id: targetBankAccountId,
            amount: absoluteAmount,
            type: 'debit' as const,
          },
          {
            account_id: debtAccountId,
            amount: -absoluteAmount,
            type: 'credit' as const,
          },
        ]
      : [
          {
            account_id: targetBankAccountId,
            amount: -absoluteAmount,
            type: 'credit' as const,
          },
          {
            account_id: debtAccountId,
            amount: absoluteAmount,
            type: 'debit' as const,
          },
        ]

  const { error: linesError } = await supabase.from('transaction_lines').insert(
    lines.map(line => ({
      ...line,
      transaction_id: transaction.id,
    }))
  )

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
