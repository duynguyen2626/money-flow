'use server'

import { createClient } from '@/lib/supabase/server'
import {
  parseCashbackConfig,
  getCashbackCycleRange,
  ParsedCashbackConfig,
} from '@/lib/cashback'

type AccountRow = {
  id: string
  name: string
  cashback_config: unknown
}

type TransactionLineRow = {
  amount: number | null
  transactions: {
    id: string
    occurred_at: string
    note: string | null
  } | null
}

export type CashbackTransaction = {
  id: string
  occurred_at: string
  note: string | null
  amount: number
  earned: number
}

export type CashbackCard = {
  accountId: string
  accountName: string
  currentSpend: number
  earned: number
  maxCashback: number | null
  progress: number
  rate: number
  spendTarget: number | null
  cycleStart: string
  cycleEnd: string
  cycleType: ParsedCashbackConfig['cycleType']
  transactions: CashbackTransaction[]
}

async function fetchAccountLines(
  supabase: ReturnType<typeof createClient>,
  accountId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<TransactionLineRow[]> {
  const { data, error } = await supabase
    .from('transaction_lines')
    .select('amount, transactions!inner(id, occurred_at, note)')
    .eq('account_id', accountId)
    .eq('type', 'credit')
    .gte('transactions.occurred_at', rangeStart.toISOString())
    .lte('transactions.occurred_at', rangeEnd.toISOString())

  if (error) {
    console.error(`Failed to load cashback lines for account ${accountId}:`, error)
    return []
  }

  return (data ?? []) as TransactionLineRow[]
}

function toTransaction(
  line: TransactionLineRow,
  rate: number
): CashbackTransaction | null {
  if (typeof line.amount !== 'number' || !line.transactions) {
    return null
  }

  const amount = Math.abs(line.amount)

  return {
    id: line.transactions.id,
    occurred_at: line.transactions.occurred_at,
    note: line.transactions.note,
    amount,
    earned: amount * rate,
  }
}

export async function getCashbackProgress(): Promise<CashbackCard[]> {
  const supabase = createClient()

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, name, cashback_config')
    .eq('type', 'credit_card')
    .not('cashback_config', 'is', null)

  if (error) {
    console.error('Failed to fetch cashback-enabled accounts:', error)
    return []
  }

  const referenceDate = new Date()

  const rows = (accounts ?? []) as AccountRow[]

  const cards: CashbackCard[] = []

  for (const account of rows) {
    const config = parseCashbackConfig(account.cashback_config)
    const cycleRange = getCashbackCycleRange(config, referenceDate)
    const lines = await fetchAccountLines(
      supabase,
      account.id,
      cycleRange.start,
      cycleRange.end
    )

    const transactions = lines
      .map(line => toTransaction(line, config.rate))
      .filter(Boolean) as CashbackTransaction[]

    const currentSpend = transactions.reduce((sum, txn) => sum + txn.amount, 0)
    const earned = currentSpend * config.rate
    const maxCashback = config.maxAmount
    const cappedEarned =
      typeof maxCashback === 'number' ? Math.min(earned, maxCashback) : earned

    const progress =
      typeof maxCashback === 'number' && maxCashback > 0
        ? Math.min(100, (cappedEarned / maxCashback) * 100)
        : 0

    const spendTarget =
      typeof maxCashback === 'number' && config.rate > 0
        ? maxCashback / config.rate
        : null

    transactions.sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    )

    cards.push({
      accountId: account.id,
      accountName: account.name,
      currentSpend,
      earned: cappedEarned,
      maxCashback,
      progress,
      rate: config.rate,
      spendTarget,
      cycleStart: cycleRange.start.toISOString(),
      cycleEnd: cycleRange.end.toISOString(),
      cycleType: config.cycleType,
      transactions,
    })
  }

  return cards
}
