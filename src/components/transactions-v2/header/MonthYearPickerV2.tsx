'use client'


import { useState } from 'react'
import { toast } from 'sonner'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'

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
  onDateChange,
  onRangeChange,
  onModeChange,
  disabledRange,
  availableMonths,
  fullWidth,
  locked,
}: MonthYearPickerV2Props) {
  const [open, setOpen] = useState(false)

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

  const handleModeSelect = (nextMode: 'month' | 'date' | 'range') => {
    onModeChange(nextMode)
    setOpen(true) // keep popover open when switching tabs
  }

  const disabledMatchers = disabledRange
    ? [{ before: disabledRange.start }, { after: disabledRange.end }]
    : undefined

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 justify-between font-medium",
            fullWidth ? 'w-full h-10' : 'w-[200px] h-9'
          )}
          onClick={(e) => {
            if (locked) {
              e.preventDefault()
              toast.error("Please select Cycle 'All' to pick a custom date.")
            }
          }}
        >
          <div className="flex items-center gap-1.5 truncate">
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{displayText}</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {mode === 'date' && (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  onRangeChange(undefined)
                  onModeChange('month')
                  onDateChange(new Date())
                }}
                className="hover:bg-current hover:bg-opacity-10 rounded p-0.5 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3 opacity-70 hover:opacity-100" />
              </div>
            )}
            {mode === 'range' && dateRange?.from && dateRange?.to && (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  onRangeChange(undefined)
                }}
                className="hover:bg-current hover:bg-opacity-10 rounded p-0.5 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3 opacity-70 hover:opacity-100" />
              </div>
            )}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div>
          <div className="p-2 border-b flex gap-1">
            <Button
              variant={mode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeSelect('month')}
              className="flex-1 h-7 text-xs"
            >
              Month
            </Button>
            <Button
              variant={mode === 'date' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeSelect('date')}
              className="flex-1 h-7 text-xs"
            >
              Date
            </Button>
            <Button
              variant={mode === 'range' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeSelect('range')}
              className="flex-1 h-7 text-xs"
            >
              Range
            </Button>
          </div>

          {mode === 'month' && (
            <MonthGrid
              value={date}
              onChange={(d) => { onDateChange(d) }}
              availableMonths={availableMonths}
            />
          )}
          {mode === 'date' && (
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (d) {
                  onDateChange(d)
                }
              }}
              disabled={disabledMatchers}
            />
          )}
          {mode === 'range' && (
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                onRangeChange(range)
                // Keep popover open until user dismisses
              }}
              numberOfMonths={2}
              disabled={disabledMatchers}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function MonthGrid({ value, onChange, availableMonths }: { value: Date; onChange: (d: Date) => void; availableMonths?: Set<string> }) {
  const [year, setYear] = useState(value.getFullYear())
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [yearSearch, setYearSearch] = useState('')
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1))
  const yearRange = Array.from({ length: 110 }, (_, i) => (currentYear + 10) - i)
  const filteredYears = yearSearch
    ? yearRange.filter(y => String(y).includes(yearSearch))
    : yearRange

  const isMonthDisabled = (monthIndex: number) => {
    // Disable future months
    if (year > currentYear || (year === currentYear && monthIndex > currentMonth)) {
      // Check if transactions exist in this future month
      const key = `${year}-${monthIndex}`
      return !availableMonths?.has(key)
    }
    return false
  }

  return (
    <div className="p-3 w-[320px]">
      {!showYearPicker ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <button className="p-1 rounded hover:bg-accent" onClick={() => setYear(y => y - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className="text-sm font-semibold px-2 py-1 rounded hover:bg-accent"
              onClick={() => setShowYearPicker(true)}
            >
              {year}
            </button>
            <button className="p-1 rounded hover:bg-accent" onClick={() => setYear(y => y + 1)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {months.map((m, idx) => {
              const disabled = isMonthDisabled(idx)
              return (
                <button
                  key={idx}
                  disabled={disabled}
                  className={`px-2 py-2 rounded-md border hover:bg-accent text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !disabled && onChange(new Date(year, idx, 1))}
                >
                  {format(m, 'MMM')}
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div>
          <div className="mb-2">
            <input
              type="text"
              placeholder="Search year..."
              value={yearSearch}
              onChange={(e) => setYearSearch(e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded"
              autoFocus
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto space-y-1">
            {filteredYears.map(y => (
              <button
                key={y}
                className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent"
                onClick={() => {
                  setYear(y)
                  setShowYearPicker(false)
                  setYearSearch('')
                }}
              >
                {y}
              </button>
            ))}
          </div>
          <button
            className="mt-2 w-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setShowYearPicker(false)
              setYearSearch('')
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
