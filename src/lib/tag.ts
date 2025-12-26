import { toYYYYMMFromDate } from './month-tag'

export function generateTag(date: Date) {
  return toYYYYMMFromDate(date)
}
