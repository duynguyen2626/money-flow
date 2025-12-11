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

  const clampDay = (year: number, month: number, day: number) => {
    const endOfMonth = new Date(year, month + 1, 0).getDate()
    return Math.min(day, endOfMonth)
  }

  const now = new Date(referenceDate)
  now.setHours(0, 0, 0, 0) // Compare dates only
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // Priority 1: Explicit Due Date
  if (config.dueDate) {
    const dueDay = config.dueDate

    // Check "This Month" instance
    const thisMonthDay = clampDay(currentYear, currentMonth, dueDay)
    const thisMonthDate = new Date(currentYear, currentMonth, thisMonthDay)
    thisMonthDate.setHours(23, 59, 59, 999) // End of day for comparison

    if (now <= thisMonthDate) {
      return thisMonthDate
    }

    // Else Next Month instance
    const nextMonthDay = clampDay(currentYear, currentMonth + 1, dueDay)
    return new Date(currentYear, currentMonth + 1, nextMonthDay)
  }

  // Priority 2: Statement Day + 15 days
  const statementDay = config.statementDay

  if (!statementDay) {
    return null
  }

  const addDays = (date: Date, days: number) => {
    const copy = new Date(date)
    copy.setDate(copy.getDate() + days)
    return copy
  }

  // Calculate this month's statement date
  const thisMonthStatement = new Date(
    currentYear,
    currentMonth,
    clampDay(currentYear, currentMonth, statementDay)
  )

  // Calculate this month's due date (statement + 15 days)
  const thisMonthDue = addDays(thisMonthStatement, 15)
  thisMonthDue.setHours(23, 59, 59, 999)

  // If today is before this month's due date, return it
  if (now <= thisMonthDue) {
    return thisMonthDue
  }

  // Otherwise, calculate next month's statement and due date
  const nextMonthStatement = new Date(
    currentYear,
    currentMonth + 1,
    clampDay(currentYear, currentMonth + 1, statementDay)
  )

  return addDays(nextMonthStatement, 15)
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

export function getSharedLimitParentId(raw: Json | null | undefined) {
  if (!raw) {
    return null
  }

  const parsed =
    typeof raw === 'object' ? (raw as Record<string, unknown>) : null

  if (!parsed) {
    return null
  }

  const candidate =
    parsed.sharedLimitParentId ??
    parsed.shared_limit_parent_id ??
    parsed.parentAccountId ??
    parsed.parent_account_id

  return typeof candidate === 'string' && candidate.trim() !== '' ? candidate.trim() : null
}
