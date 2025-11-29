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
  shopName?: string
  shopLogoUrl?: string | null
  categoryName?: string
  categoryIcon?: string | null
  categoryImageUrl?: string | null
}

export type CashbackCard = {
  accountId: string
  accountName: string
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
}
