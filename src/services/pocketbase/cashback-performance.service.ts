'use server'

import { CashbackYearSummary, CashbackCard } from '@/types/cashback.types'
import { pocketbaseList, toPocketBaseId } from './server'

type PocketBaseRecord = Record<string, any>

function monthFromCycleTag(cycleTag: string): { year: number; month: number } | null {
  const parts = String(cycleTag || '').split('-')
  if (parts.length !== 2) return null
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  if (Number.isNaN(year) || Number.isNaN(month)) return null
  return { year, month }
}

export async function getPocketBaseCashbackYearAnalytics(year: number): Promise<CashbackYearSummary[]> {
  const accountsResponse = await pocketbaseList<PocketBaseRecord>('accounts', {
    perPage: 200,
    filter: "type='credit_card' && is_active=true",
    sort: '-created',
    fields: 'id,slug,type,annual_fee,name',
  })

  const accounts = accountsResponse.items || []
  if (accounts.length === 0) return []

  const summaries: CashbackYearSummary[] = []

  for (const account of accounts) {
    const cyclesResponse = await pocketbaseList<PocketBaseRecord>('cashback_cycles', {
      perPage: 200,
      filter: `account_id='${account.id}' && cycle_tag>='${year}-01' && cycle_tag<='${year}-12'`,
      sort: 'cycle_tag',
      fields: 'id,cycle_tag,real_awarded,shared_amount,net_profit,virtual_profit',
    })

    const monthMap = new Map<number, { shared: number; redeemed: number; net: number }>()
    for (let month = 1; month <= 12; month++) {
      monthMap.set(month, { shared: 0, redeemed: 0, net: 0 })
    }

    for (const cycle of cyclesResponse.items || []) {
      const parsed = monthFromCycleTag(cycle.cycle_tag)
      if (!parsed || parsed.year !== year) continue
      const bucket = monthMap.get(parsed.month)
      if (!bucket) continue
      bucket.shared += Number(cycle.shared_amount ?? cycle.real_awarded ?? 0)
      bucket.redeemed += Number(cycle.real_awarded ?? 0)
      bucket.net += Number(cycle.net_profit ?? cycle.virtual_profit ?? 0)
    }

    const months = Array.from(monthMap.entries()).map(([month, bucket]) => ({
      month,
      totalGivenAway: bucket.shared,
      cashbackGiven: bucket.shared,
    }))

    const cashbackGivenYearTotal = Array.from(monthMap.values()).reduce((sum, bucket) => sum + bucket.shared, 0)
    const cashbackRedeemedYearTotal = Array.from(monthMap.values()).reduce((sum, bucket) => sum + bucket.redeemed, 0)
    const annualFeeYearTotal = Number(account.annual_fee || 0)
    const interestYearTotal = 0
    const cycleProfitTotal = Array.from(monthMap.values()).reduce((sum, bucket) => sum + bucket.net, 0)

    summaries.push({
      cardId: account.slug || account.id,
      cardType: account.type || 'credit_card',
      year,
      months,
      cashbackRedeemedYearTotal,
      annualFeeYearTotal,
      interestYearTotal,
      cashbackGivenYearTotal,
      netProfit: cycleProfitTotal - annualFeeYearTotal - interestYearTotal,
    })
  }

  return summaries.sort((left, right) => right.netProfit - left.netProfit)
}

export async function getPocketBaseCashbackProgress(accountSourceIds: string[]): Promise<CashbackCard[]> {
  if (!Array.isArray(accountSourceIds) || accountSourceIds.length === 0) return []

  const cards: CashbackCard[] = []
  for (const sourceId of accountSourceIds) {
    const pocketBaseAccountId = toPocketBaseId(sourceId, 'accounts')

    const accountResponse = await pocketbaseList<PocketBaseRecord>('accounts', {
      perPage: 1,
      filter: `id='${pocketBaseAccountId}'`,
      fields: 'id,slug,name,type,image_url,cb_base_rate,cb_max_budget',
    })

    const account = accountResponse.items?.[0]
    if (!account) continue

    const now = new Date()
    const cycleTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const cycleResponse = await pocketbaseList<PocketBaseRecord>('cashback_cycles', {
      perPage: 1,
      filter: `account_id='${account.id}' && cycle_tag='${cycleTag}'`,
      fields: 'id,spent_amount,real_awarded,virtual_profit,max_budget,min_spend_target,shared_amount',
    })
    const cycle = cycleResponse.items?.[0]

    const currentSpend = Number(cycle?.spent_amount || 0)
    const realAwarded = Number(cycle?.real_awarded || 0)
    const virtualProfit = Number(cycle?.virtual_profit || 0)
    const maxBudget = cycle?.max_budget ?? account.cb_max_budget ?? null
    const earnedSoFar = realAwarded + virtualProfit

    cards.push({
      accountId: account.slug || sourceId,
      accountName: account.name,
      accountLogoUrl: account.image_url || null,
      currentSpend,
      totalEarned: earnedSoFar,
      sharedAmount: Number(cycle?.shared_amount ?? realAwarded),
      netProfit: virtualProfit,
      maxCashback: maxBudget,
      progress: maxBudget ? Math.min(100, (earnedSoFar / Number(maxBudget)) * 100) : 0,
      rate: Number(account.cb_base_rate || 0) / 100,
      spendTarget: cycle?.min_spend_target ?? null,
      cycleStart: null,
      cycleEnd: null,
      cycleLabel: cycleTag,
      cycleType: 'calendar_month',
      transactions: [],
      minSpend: cycle?.min_spend_target ?? null,
      minSpendMet: currentSpend >= Number(cycle?.min_spend_target || 0),
      minSpendRemaining: cycle?.min_spend_target ? Math.max(0, Number(cycle.min_spend_target) - currentSpend) : null,
      remainingBudget: maxBudget ? Math.max(0, Number(maxBudget) - earnedSoFar) : null,
      cycleOffset: 0,
      min_spend_required: cycle?.min_spend_target ?? null,
      total_spend_eligible: currentSpend,
      is_min_spend_met: currentSpend >= Number(cycle?.min_spend_target || 0),
      missing_min_spend: cycle?.min_spend_target ? Math.max(0, Number(cycle.min_spend_target) - currentSpend) : null,
      potential_earned: virtualProfit,
      totalGivenAway: Number(cycle?.shared_amount ?? realAwarded),
    })
  }

  return cards
}
