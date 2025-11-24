export type CashbackCycleType = 'calendar_month' | 'statement_cycle'

type CycleRange = {
  start: Date
  end: Date
}

export type ParsedCashbackConfig = {
  rate: number
  maxAmount: number | null
  cycleType: CashbackCycleType
  statementDay: number | null
  minSpend: number | null
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

  return {
    rate: parsedRate,
    maxAmount,
    cycleType,
    statementDay,
    minSpend,
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
