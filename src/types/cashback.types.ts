import { ParsedCashbackConfig } from '@/lib/cashback'

export type CashbackTransaction = {
  id: string
  occurred_at: string
  note: string | null
  amount: number
  earned: number
  // Profit tracking
  bankBack: number // What the bank gives back
  peopleBack: number // What was shared with others
  profit: number // bankBack - peopleBack
  effectiveRate: number // The rate used for calculation (e.g. 0.01 for 1%)
  sharePercent?: number // The % shared (e.g. 0.8 for 0.8%)
  shareFixed?: number // The fixed amount shared
  shopName?: string
  shopLogoUrl?: string | null
  categoryName?: string
  categoryIcon?: string | null
  categoryImageUrl?: string | null
  personName?: string | null
}

export type CashbackCard = {
  accountId: string
  accountName: string
  accountImageUrl?: string | null
  currentSpend: number
  totalEarned: number
  sharedAmount: number
  netProfit: number
  maxCashback: number | null
  progress: number
  rate: number
  spendTarget: number | null
  cycleStart: string
  cycleEnd: string
  cycleLabel: string
  cycleType: ParsedCashbackConfig['cycleType']
  transactions: CashbackTransaction[]
  minSpend: number | null
  minSpendMet: boolean
  minSpendRemaining: number | null
  remainingBudget: number | null
  cycleOffset: number
}

export type AccountSpendingStats = {
  currentSpend: number
  minSpend: number | null
  maxCashback: number | null
  rate: number
  earnedSoFar: number
  // Smart Hint fields
  potentialRate?: number
  matchReason?: string
  maxReward?: number | null // Category-specific max reward limit
}
