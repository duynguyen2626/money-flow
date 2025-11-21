import { format } from 'date-fns'

export function generateTag(date: Date) {
  return format(date, 'MMMyy').toUpperCase()
}
