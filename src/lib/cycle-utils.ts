import { isYYYYMM, normalizeMonthTag } from './month-tag'

/**
 * Utility functions for formatting month tags into readable date ranges.
 *
 * Canonical month tag format: YYYY-MM (e.g. 2025-12)
 * Legacy month tags (MMMYY) are supported on read for back-compat.
 */

/**
 * Formats a month tag into a readable date range (e.g. "25.11 - 24.12").
 */
export function formatCycleTag(tag: string): string {
  const normalized = normalizeMonthTag(tag)
  if (!normalized || !isYYYYMM(normalized)) return tag

  const [yearStr, monthStr] = normalized.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr) // 1..12
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return tag

  const cycleStartDay = 25
  const cycleEndDay = 24

  const startMonth = month === 1 ? 12 : month - 1
  const endMonth = month

  const formatDay = (day: number) => String(day).padStart(2, '0')
  const formatMonth = (m: number) => String(m).padStart(2, '0')

  return `${formatDay(cycleStartDay)}.${formatMonth(startMonth)} - ${formatDay(cycleEndDay)}.${formatMonth(endMonth)}`
}

/**
 * Formats a month tag into a date range including year (e.g. "25.11.2025 - 24.12.2025").
 */
export function formatCycleTagWithYear(tag: string): string {
  const normalized = normalizeMonthTag(tag)
  if (!normalized || !isYYYYMM(normalized)) return tag

  const [yearStr, monthStr] = normalized.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr) // 1..12
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return tag

  const cycleStartDay = 25
  const cycleEndDay = 24

  const startMonth = month === 1 ? 12 : month - 1
  const startYear = month === 1 ? year - 1 : year
  const endMonth = month
  const endYear = year

  const formatDay = (day: number) => String(day).padStart(2, '0')
  const formatMonth = (m: number) => String(m).padStart(2, '0')

  return `${formatDay(cycleStartDay)}.${formatMonth(startMonth)}.${startYear} - ${formatDay(cycleEndDay)}.${formatMonth(endMonth)}.${endYear}`
}
