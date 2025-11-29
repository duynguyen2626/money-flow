export type CashbackCycleType = 'calendar_month' | 'statement_cycle'

type CycleRange = {
  start: Date
  end: Date
}

// Tiered cashback tier definition
export type CashbackTier = {
  minSpend: number // Minimum spend to qualify for this tier
  categories: Record<string, { rate: number; maxAmount?: number }> // category_key -> { rate, cap }
  defaultRate?: number // Default rate for categories not specified
}

export type ParsedCashbackConfig = {
  rate: number
  maxAmount: number | null
  cycleType: CashbackCycleType
  statementDay: number | null
  minSpend: number | null
  // Tiered cashback support
  hasTiers?: boolean
  tiers?: CashbackTier[]
}

function parseConfigCandidate(raw: Record<string, unknown> | null): ParsedCashbackConfig {
  let rateValue = Number(raw?.rate ?? 0)



  const parsedRate =
    Number.isFinite(rateValue) && rateValue > 0 ? rateValue : 0

  const rawMax = raw?.max_amt ?? raw?.maxAmount
  const parsedMax =
    rawMax === null || rawMax === undefined
      ? null
      : Number(rawMax)
  const maxAmount =
    typeof parsedMax === 'number' && Number.isFinite(parsedMax)
      ? parsedMax
      : null

  const cycleTypeCandidate = String(raw?.cycle_type ?? raw?.cycleType ?? 'calendar_month')
  const cycleType: CashbackCycleType =
    cycleTypeCandidate === 'statement_cycle' ? 'statement_cycle' : 'calendar_month'

  const statementCandidate = raw?.statement_day ?? raw?.statementDay
  const statementNumber =
    statementCandidate === null || statementCandidate === undefined
      ? null
      : Number(statementCandidate)
  const statementDay =
    typeof statementNumber === 'number' && Number.isFinite(statementNumber)
      ? Math.min(Math.max(Math.floor(statementNumber), 1), 31)
      : null

  const minCandidate = raw?.min_spend ?? raw?.minSpend
  const minNumber =
    minCandidate === null || minCandidate === undefined
      ? null
      : Number(minCandidate)
  const minSpend =
    typeof minNumber === 'number' && Number.isFinite(minNumber) && minNumber > 0
      ? minNumber
      : null

  // Parse tiered cashback
  const hasTiers = Boolean(raw?.has_tiers ?? raw?.hasTiers)
  let tiers: CashbackTier[] | undefined = undefined

  if (hasTiers && Array.isArray(raw?.tiers)) {
    tiers = (raw.tiers as any[]).map((tier: any) => ({
      minSpend: Number(tier.minSpend ?? tier.min_spend ?? 0),
      categories: tier.categories ?? {},
      defaultRate: typeof tier.defaultRate === 'number' ? tier.defaultRate : undefined,
    }))
  }

  return {
    rate: parsedRate,
    maxAmount,
    cycleType,
    statementDay,
    minSpend,
    hasTiers,
    tiers,
  }
}

export function parseCashbackConfig(raw: unknown): ParsedCashbackConfig {
  if (!raw) {
    return {
      rate: 0,
      maxAmount: null,
      cycleType: 'calendar_month',
      statementDay: null,
      minSpend: null,
      hasTiers: false,
      tiers: undefined,
    }
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown> | null
      return parseConfigCandidate(parsed)
    } catch {
      return {
        rate: 0,
        maxAmount: null,
        cycleType: 'calendar_month',
        statementDay: null,
        minSpend: null,
        hasTiers: false,
        tiers: undefined,
      }
    }
  }

  if (typeof raw === 'object') {
    return parseConfigCandidate(raw as Record<string, unknown>)
  }

  return {
    rate: 0,
    maxAmount: null,
    cycleType: 'calendar_month',
    statementDay: null,
    minSpend: null,
    hasTiers: false,
    tiers: undefined,
  }
}

export function getCashbackCycleRange(
  config: ParsedCashbackConfig,
  referenceDate = new Date()
): CycleRange {
  const startOfCalendar = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
  const calendarEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)

  if (config.cycleType !== 'statement_cycle' || !config.statementDay) {
    startOfCalendar.setHours(0, 0, 0, 0)
    calendarEnd.setHours(23, 59, 59, 999)
    return {
      start: startOfCalendar,
      end: calendarEnd,
    }
  }

  const day = config.statementDay

  const referenceDay = referenceDate.getDate()
  const startOffset = referenceDay >= day ? 0 : -1
  const endOffset = referenceDay >= day ? 1 : 0

  const startBase = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + startOffset, 1)
  const start = clampToDay(startBase, day)

  const endBase = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + endOffset, 1)
  const end =
    day === 1
      ? new Date(endBase.getFullYear(), endBase.getMonth(), 0)
      : clampToDay(endBase, day - 1)

  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}


function clampToDay(base: Date, day: number | null) {
  if (!day) {
    return base
  }
  const candidate = new Date(base.getFullYear(), base.getMonth(), 1)
  const monthEnd = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0)
  const safeDay = Math.min(day, monthEnd.getDate())
  return new Date(candidate.getFullYear(), candidate.getMonth(), safeDay)
}

/**
 * Calculate the bank's cashback amount for a transaction.
 * @param config Parsed cashback configuration
 * @param amount Transaction amount (absolute value)
 * @param categoryName Category name for tier matching
 * @param totalSpend Current total spend in cycle (for tier determination). Defaults to 0.
 */
export function calculateBankCashback(
  config: ParsedCashbackConfig,
  amount: number,
  categoryName?: string,
  totalSpend: number = 0
): { amount: number; rate: number } {
  let earnedRate = config.rate

  if (config.hasTiers && config.tiers && config.tiers.length > 0) {
    // Find the applicable tier based on total spend
    const applicableTier = config.tiers
      .filter(tier => totalSpend >= tier.minSpend)
      .sort((a, b) => b.minSpend - a.minSpend)[0]

    if (applicableTier) {
      if (categoryName) {
        const lowerCat = categoryName.toLowerCase()
        let categoryKey: string | null = null
        for (const key of Object.keys(applicableTier.categories)) {
          if (lowerCat.includes(key.toLowerCase())) {
            categoryKey = key
            break
          }
        }

        if (categoryKey && applicableTier.categories[categoryKey]) {
          earnedRate = applicableTier.categories[categoryKey].rate
        } else if (applicableTier.defaultRate !== undefined) {
          earnedRate = applicableTier.defaultRate
        }
      } else if (applicableTier.defaultRate !== undefined) {
        earnedRate = applicableTier.defaultRate
      }
    }
  }

  return { amount: amount * earnedRate, rate: earnedRate }
}
