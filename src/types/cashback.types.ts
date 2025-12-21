import { ParsedCashbackConfig } from '@/lib/cashback'

export type CashbackPolicySource = 'program_default' | 'level_default' | 'category_rule' | 'legacy'

export type CashbackPolicyMetadata = {
  policySource: CashbackPolicySource
  reason: string
  rate: number
  levelId?: string
  levelName?: string
  levelMinSpend?: number
  ruleId?: string
  categoryId?: string
  ruleMaxReward?: number | null
}

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
  categoryLogoUrl?: string | null
  personName?: string | null
  policyMetadata?: CashbackPolicyMetadata | null
}

export type CashbackCard = {
  accountId: string
  accountName: string
  accountLogoUrl?: string | null
  currentSpend: number
  totalEarned: number
  sharedAmount: number
  netProfit: number
  maxCashback: number | null
  progress: number
  rate: number
  spendTarget: number | null
  cycleStart: string | null
  cycleEnd: string | null
  cycleLabel: string
  cycleType: ParsedCashbackConfig['cycleType']
  transactions: CashbackTransaction[]
  minSpend: number | null
  minSpendMet: boolean
  minSpendRemaining: number | null
  remainingBudget: number | null
  cycleOffset: number
  // Additional frontend fields
  min_spend_required: number | null
  total_spend_eligible: number
  is_min_spend_met: boolean
  missing_min_spend: number | null
  potential_earned: number
}

export type AccountSpendingStats = {
  currentSpend: number
  minSpend: number | null
  maxCashback: number | null
  rate: number
  earnedSoFar: number
  sharedAmount: number // Total cashback shared with others
  potentialProfit: number // Earnings minus sharing before qualification gates
  netProfit: number // earnedSoFar - sharedAmount
  remainingBudget: number | null
  // Smart Hint fields
  potentialRate?: number
  matchReason?: string
  policyMetadata?: CashbackPolicyMetadata
  maxReward?: number | null // Category-specific max reward limit
  is_min_spend_met?: boolean
  cycle?: {
    start: string
    end: string
    label: string
  } | null
}
