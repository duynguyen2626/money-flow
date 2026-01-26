'use client'

import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface MonthYearPickerV2Props {
  date: Date
  dateRange: DateRange | undefined
  mode: 'month' | 'range' | 'date'
  onDateChange: (date: Date) => void
  onRangeChange: (range: DateRange | undefined) => void
  onModeChange: (mode: 'month' | 'range' | 'date') => void
  disabledRange?: { start: Date; end: Date } | undefined
  availableMonths?: Set<string>
  fullWidth?: boolean
  locked?: boolean
}

export function MonthYearPickerV2({
  date,
  dateRange,
  mode,
  fullWidth,
}: MonthYearPickerV2Props) {
  const displayText = (() => {
    if (mode === 'month') return format(date, 'MMM yyyy')
    if (mode === 'date') return format(date, 'dd MMM yyyy')
    if (mode === 'range') {
      if (dateRange?.from) {
        return dateRange.to
          ? `${format(dateRange.from, 'dd MMM')} - ${format(dateRange.to, 'dd MMM')}`
          : format(dateRange.from, 'dd MMM yyyy')
      }
      return 'Date Select'
    }
    return 'Select date'
  })()

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "gap-2 justify-between font-medium",
        fullWidth ? 'w-full h-10' : 'w-[200px] h-9'
      )}
      disabled
    >
      <div className="flex items-center gap-1.5 truncate">
        <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{displayText}</span>
      </div>
    </Button>
  )
}
