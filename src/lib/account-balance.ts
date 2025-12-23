import type { Account } from '@/types/moneyflow.types'

export type BalanceTransaction = {
  amount: number | null
  type: string | null
  account_id: string | null
  target_account_id?: string | null
  status?: string | null
}

export type AccountBalanceTotals = {
  totalIn: number
  totalOut: number
  currentBalance: number
}

const isIncomingType = (type: string | null) =>
  type === 'income' || type === 'repayment'

export function computeAccountTotals(params: {
  accountId: string
  accountType: Account['type'] | null
  transactions: BalanceTransaction[]
}): AccountBalanceTotals {
  const { accountId, accountType, transactions } = params
  let totalIn = 0
  let totalOut = 0

  for (const txn of transactions) {
    if (!txn) continue
    if (txn.status === 'void') continue

    const amountAbs = Math.abs(Number(txn.amount) || 0)
    if (!amountAbs) continue

    if (txn.account_id === accountId) {
      if (isIncomingType(txn.type)) {
        totalIn += amountAbs
      } else {
        totalOut -= amountAbs
      }
      continue
    }

    if (txn.target_account_id === accountId) {
      totalIn += amountAbs
    }
  }

  const netFlow = totalIn + totalOut
  const currentBalance =
    accountType === 'credit_card' ? Math.abs(totalOut) - totalIn : netFlow

  return { totalIn, totalOut, currentBalance }
}

export function getCreditCardDebt(balance: number | null | undefined) {
  return balance ?? 0
}

export function getCreditCardAvailableBalance(account: Pick<Account, 'credit_limit' | 'current_balance' | 'type'>) {
  if (account.type !== 'credit_card') {
    return account.current_balance ?? 0
  }
  const limit = account.credit_limit ?? 0
  const debt = getCreditCardDebt(account.current_balance)
  return limit - debt
}

export function getCreditCardUsage(account: Pick<Account, 'credit_limit' | 'current_balance' | 'type'>) {
  const limit = account.credit_limit ?? 0
  if (account.type !== 'credit_card' || limit <= 0) {
    return { limit, used: Math.abs(account.current_balance ?? 0), percent: 0 }
  }

  const debt = getCreditCardDebt(account.current_balance)
  const used = Math.max(0, debt)
  const percent = limit > 0 ? (used / limit) * 100 : 0
  return { limit, used, percent }
}
