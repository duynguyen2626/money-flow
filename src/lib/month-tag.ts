import { format } from 'date-fns'

const legacyMonthMap: Record<string, string> = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12',
}

const reverseLegacyMonthMap: Record<string, string> = Object.fromEntries(
  Object.entries(legacyMonthMap).map(([month, num]) => [num, month]),
)

export function isYYYYMM(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function isLegacyMMMYY(value: string): boolean {
  if (!/^[A-Za-z]{3}\d{2}$/.test(value)) return false
  return value.slice(0, 3).toUpperCase() in legacyMonthMap
}

export function legacyToYYYYMM(value: string): string | null {
  if (!isLegacyMMMYY(value)) return null

  const monthAbbrev = value.slice(0, 3).toUpperCase()
  const month = legacyMonthMap[monthAbbrev]
  if (!month) return null

  const yearSuffix = value.slice(-2)
  const yearNum = Number.parseInt(yearSuffix, 10)
  if (Number.isNaN(yearNum)) return null

  const year = 2000 + yearNum
  return `${year}-${month}`
}

export function normalizeMonthTag(value: string | null | undefined): string | null | undefined {
  if (value == null) return value

  const trimmed = value.trim()
  if (trimmed === '') return trimmed
  if (isYYYYMM(trimmed)) return trimmed

  const converted = legacyToYYYYMM(trimmed)
  return converted ?? trimmed
}

export function toYYYYMMFromDate(date: Date): string {
  return format(date, 'yyyy-MM')
}

export function yyyyMMToLegacyMMMYY(value: string): string | null {
  if (!isYYYYMM(value)) return null

  const [year, month] = value.split('-')
  if (!year || !month) return null

  const monthAbbrev = reverseLegacyMonthMap[month]
  if (!monthAbbrev) return null

  return `${monthAbbrev}${year.slice(2)}`
}

export function toLegacyMMMYYFromDate(date: Date): string {
  return yyyyMMToLegacyMMMYY(toYYYYMMFromDate(date)) ?? ''
}
