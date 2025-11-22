import { parseCashbackConfig } from './cashback'
import type { Json } from '@/types/database.types'
import type { Account } from '@/types/moneyflow.types'

export function getAccountTypeLabel(type: Account['type']) {
  return type.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
}

export function formatCurrency(value: number, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function computeNextDueDate(
  rawConfig: Json | null | undefined,
  referenceDate = new Date()
): Date | null {
  const config = parseCashbackConfig(rawConfig ?? null)
  const statementDay = config.statementDay

  if (!statementDay) {
    return null
  }

  const clampDay = (year: number, month: number, day: number) => {
    const endOfMonth = new Date(year, month + 1, 0).getDate()
    return Math.min(day, endOfMonth)
  }

  const addDays = (date: Date, days: number) => {
    const copy = new Date(date)
    copy.setDate(copy.getDate() + days)
    return copy
  }

  const now = new Date(referenceDate)
  const currentStatement = new Date(
    now.getFullYear(),
    now.getMonth(),
    clampDay(now.getFullYear(), now.getMonth(), statementDay)
  )
  const previousStatement =
    now >= currentStatement
      ? currentStatement
      : new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          clampDay(now.getFullYear(), now.getMonth() - 1, statementDay)
        )

  const initialDue = addDays(previousStatement, 15)

  if (initialDue > now) {
    return initialDue
  }

  const nextStatement = new Date(
    previousStatement.getFullYear(),
    previousStatement.getMonth() + 1,
    clampDay(previousStatement.getFullYear(), previousStatement.getMonth() + 1, statementDay)
  )

  return addDays(nextStatement, 15)
}

export function parseSavingsConfig(raw: Json | null | undefined) {
  if (!raw) {
    return { interestRate: null, termMonths: null, maturityDate: null }
  }

  let parsed: Record<string, unknown> | null = null
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }
  } else if (typeof raw === 'object') {
    parsed = raw as Record<string, unknown>
  }

  const toNumber = (value: unknown) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
  }

  return {
    interestRate: toNumber(parsed?.interestRate),
    termMonths: toNumber(parsed?.termMonths ?? parsed?.term),
    maturityDate: typeof parsed?.maturityDate === 'string' ? parsed.maturityDate : null,
  }
}
