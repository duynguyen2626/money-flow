import { calculateAccountImpacts, normalizeAmountForType } from '../services/transaction.service'
import { computeDebtFromTransactions } from '../services/debt.service'

type TransactionType = 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'

type SimulatedTransaction = {
  id: string
  account_id: string
  target_account_id?: string | null
  person_id: string | null
  category_id?: string | null
  type: TransactionType
  amount: number
  status?: 'posted' | 'void'
}

function assertEqual(actual: number, expected: number, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${expected.toLocaleString()}, got ${actual.toLocaleString()}`)
  }
}

async function applyTransaction(
  ledger: SimulatedTransaction[],
  balances: Map<string, number>,
  txn: Omit<SimulatedTransaction, 'amount'> & { amount: number }
) {
  const normalizedAmount = await normalizeAmountForType(txn.type, txn.amount)
  const normalized: SimulatedTransaction = {
    ...txn,
    amount: normalizedAmount,
    status: txn.status ?? 'posted',
  }

  const impacts = await calculateAccountImpacts(normalized)
  Object.entries(impacts).forEach(([accountId, delta]) => {
    const current = balances.get(accountId) ?? 0
    balances.set(accountId, current + delta)
  })

  ledger.push(normalized)
}

async function runTest() {
  const balances = new Map<string, number>([
    ['A', 10_000_000],
    ['B', 0],
  ])
  const ledger: SimulatedTransaction[] = []

  // 1. Expense 500k from Account A
  await applyTransaction(ledger, balances, {
    id: 't1',
    type: 'expense',
    account_id: 'A',
    amount: 500_000,
    category_id: 'food',
    person_id: null,
  })
  assertEqual(balances.get('A') ?? 0, 9_500_000, 'Expense should reduce Account A by 500k')

  // 2. Debt: Lend Lâm 1M (from A)
  await applyTransaction(ledger, balances, {
    id: 't2',
    type: 'debt',
    account_id: 'A',
    amount: 1_000_000,
    category_id: 'food',
    person_id: 'lam',
  })
  assertEqual(balances.get('A') ?? 0, 8_500_000, 'Debt spend should reduce Account A by 1M')
  assertEqual(await computeDebtFromTransactions(ledger, 'lam'), 1_000_000, 'Debt balance for Lam should be 1M')

  // 3. Repayment: Lam pays 500k to A
  await applyTransaction(ledger, balances, {
    id: 't3',
    type: 'repayment',
    account_id: 'A',
    amount: 500_000,
    person_id: 'lam',
  })
  assertEqual(balances.get('A') ?? 0, 9_000_000, 'Repayment should increase Account A by 500k')
  assertEqual(await computeDebtFromTransactions(ledger, 'lam'), 500_000, 'Debt balance for Lam should decrease to 500k')

  // 4. Transfer: A -> B (2M)
  await applyTransaction(ledger, balances, {
    id: 't4',
    type: 'transfer',
    account_id: 'A',
    target_account_id: 'B',
    amount: 2_000_000,
    person_id: null,
  })
  assertEqual(balances.get('A') ?? 0, 7_000_000, 'Transfer should reduce Account A by 2M')
  assertEqual(balances.get('B') ?? 0, 2_000_000, 'Transfer should increase Account B by 2M')

  console.log('✅ ALL LOGIC TESTS PASSED')
}

runTest().catch(err => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
