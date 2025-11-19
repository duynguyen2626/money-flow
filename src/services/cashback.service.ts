'use server'

import { createClient } from '@/lib/supabase/server'

type CashbackConfig = {
  rate: number
  maxAmount: number | null
}

type AccountRow = {
  id: string
  name: string
  cashback_config: unknown
}

type TransactionLineRow = {
  account_id: string | null
  amount: number | null
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
}

function parseCashbackConfig(raw: unknown): CashbackConfig {
  if (!raw) {
    return { rate: 0, maxAmount: null }
  }

  let config: Record<string, unknown> | null = null

  if (typeof raw === 'string') {
    try {
      config = JSON.parse(raw)
    } catch {
      config = null
    }
  } else if (typeof raw === 'object') {
    config = raw as Record<string, unknown>
  }

  const rateValue = Number(config?.rate ?? 0)
  const rawMax = (config?.max_amt ?? config?.maxAmount) as unknown
  const parsedMax =
    rawMax === null || rawMax === undefined ? null : Number(rawMax)

  const numericRate =
    Number.isFinite(rateValue) && rateValue > 0 ? rateValue : 0
  const numericMax =
    typeof parsedMax === 'number' && Number.isFinite(parsedMax)
      ? parsedMax
      : null

  return {
    rate: numericRate,
    maxAmount: numericMax,
  }
}

export async function getCashbackProgress(): Promise<CashbackCard[]> {
  const supabase = createClient()

  const { data: accounts, error: accountError } = await supabase
    .from('accounts')
    .select('id, name, cashback_config')
    .eq('type', 'credit_card')
    .not('cashback_config', 'is', null)

  if (accountError) {
    console.error('Failed to fetch cashback-enabled accounts:', accountError)
    return []
  }

  const accountRows = (accounts ?? []) as AccountRow[]
  if (accountRows.length === 0) {
    return []
  }

  const accountIds = accountRows.map(acc => acc.id)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  startOfMonth.setHours(0, 0, 0, 0)

  const spendByAccount = new Map<string, number>()

  const { data: lines, error: linesError } = await supabase
    .from('transaction_lines')
    .select('account_id, amount, type, transactions!inner(occurred_at)')
    .in('account_id', accountIds)
    .eq('type', 'credit')
    .gte('transactions.occurred_at', startOfMonth.toISOString())
    .lte('transactions.occurred_at', now.toISOString())

  if (linesError) {
    console.error('Failed to fetch monthly spending:', linesError)
  } else {
    for (const line of (lines ?? []) as TransactionLineRow[]) {
      if (!line.account_id || typeof line.amount !== 'number') {
        continue
      }
      const current = spendByAccount.get(line.account_id) ?? 0
      spendByAccount.set(line.account_id, current + Math.abs(line.amount))
    }
  }

  return accountRows.map(account => {
    const config = parseCashbackConfig(account.cashback_config)
    const currentSpend = spendByAccount.get(account.id) ?? 0
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

    return {
      accountId: account.id,
      accountName: account.name,
      currentSpend,
      earned: cappedEarned,
      maxCashback,
      progress,
      rate: config.rate,
      spendTarget,
    }
  })
}
