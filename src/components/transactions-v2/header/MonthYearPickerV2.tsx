'use client'

import { useRef, useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'

interface MonthYearPickerV2Props {
  date: Date
  dateRange: DateRange | undefined
  mode: 'month' | 'range'
  onDateChange: (date: Date) => void
  onRangeChange: (range: DateRange | undefined) => void
  onModeChange: (mode: 'month' | 'range') => void
}

export function MonthYearPickerV2({
  date,
  dateRange,
  mode,
  onDateChange,
  onRangeChange,
  onModeChange,
}: MonthYearPickerV2Props) {
  const [open, setOpen] = useState(false)
  const closeTimeout = useRef<NodeJS.Timeout | null>(null)

  const displayText = mode === 'month' 
    ? format(date, 'MMM yyyy')
    : dateRange?.from
      ? dateRange.to
        ? `${format(dateRange.from, 'dd MMM')} - ${format(dateRange.to, 'dd MMM')}`
        : format(dateRange.from, 'dd MMM yyyy')
      : 'Select range'

  const handleMouseEnter = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 min-w-[140px] justify-between font-medium"
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>{displayText}</span>
          </div>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <div className="p-2 border-b flex gap-1">
          <Button
            variant={mode === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onModeChange('month')}
            className="flex-1 h-7 text-xs"
          >
            Month
          </Button>
          <Button
            variant={mode === 'range' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onModeChange('range')}
            className="flex-1 h-7 text-xs"
          >
            Range
          </Button>
        </div>

        {mode === 'month' ? (
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              if (newDate) {
                onDateChange(newDate)
                setOpen(false)
              }
            }}
            initialFocus
          />
        ) : (
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={(range) => {
              onRangeChange(range)
              if (range?.from && range?.to) {
                setOpen(false)
              }
            }}
            numberOfMonths={2}
            initialFocus
          />
        )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
