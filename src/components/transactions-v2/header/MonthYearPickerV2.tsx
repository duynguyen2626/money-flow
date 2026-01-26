'use client'

import { useState, useEffect } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format, isSameMonth } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface MonthYearPickerV2Props {
  date: Date
  dateRange: DateRange | undefined
  mode: 'month' | 'range' | 'date'
  // These onChange handlers will now ONLY be called when "OK" is clicked
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

  // Local state buffer
  const [localMode, setLocalMode] = useState<'month' | 'range' | 'date'>(mode)
  const [localDate, setLocalDate] = useState<Date>(date)
  const [localRange, setLocalRange] = useState<DateRange | undefined>(dateRange)

  // Sync local state when prop changes (only if closed)
  useEffect(() => {
    if (!open) {
      setLocalMode(mode)
      setLocalDate(date)
      setLocalRange(dateRange)
    }
  }, [open, mode, date, dateRange])

  const handleOpenChange = (newOpen: boolean) => {
    if (locked && newOpen) {
      toast.error("Please select Cycle 'All' to pick a custom date.")
      return
    }
    setOpen(newOpen)
    if (!newOpen) {
      // Reset local state to props on cancel/close without OK
      setLocalMode(mode)
      setLocalDate(date)
      setLocalRange(dateRange)
    }
  }

  const handleApply = () => {
    onModeChange(localMode)
    if (localMode === 'month' || localMode === 'date') {
      onDateChange(localDate)
      // Ensure range is cleared if switching to single date modes
      onRangeChange(undefined)
    } else {
      onRangeChange(localRange)
    }
    setOpen(false)
  }

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

  const disabledMatchers = disabledRange
    ? [{ before: disabledRange.start }, { after: disabledRange.end }]
    : undefined

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 justify-between font-medium",
            fullWidth ? 'w-full h-10' : 'w-[200px] h-9',
            locked && "opacity-50 cursor-not-allowed bg-muted/50"
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{displayText}</span>
          </div>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          {/* Tabs */}
          <div className="p-2 border-b flex gap-1 bg-muted/40">
            {(['month', 'date', 'range'] as const).map((m) => (
              <Button
                key={m}
                variant={localMode === m ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLocalMode(m)}
                className="flex-1 h-7 text-xs capitalize"
              >
                {m}
              </Button>
            ))}
          </div>

          {/* Content */}
          <div className="p-0">
            {localMode === 'month' && (
              <MonthGrid
                value={localDate}
                onChange={setLocalDate}
                availableMonths={availableMonths}
              />
            )}
            {localMode === 'date' && (
              <Calendar
                mode="single"
                selected={localDate}
                onSelect={(d) => d && setLocalDate(d)}
                disabled={disabledMatchers}
                initialFocus
                className="p-3"
              />
            )}
            {localMode === 'range' && (
              <Calendar
                mode="range"
                selected={localRange}
                onSelect={setLocalRange}
                numberOfMonths={2}
                disabled={disabledMatchers}
                initialFocus
                className="p-3"
              />
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-2 border-t flex justify-end gap-2 bg-muted/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="h-8 px-2"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="h-8 px-4"
              disabled={localMode === 'range' && (!localRange?.from || !localRange?.to)}
            >
              Apply
            </Button>
          </div>
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

  // Sync year if value prop changes externally (though less likely with local buffer)
  useEffect(() => {
    setYear(value.getFullYear())
  }, [value])

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
              const isSelected = isSameMonth(m, value)
              return (
                <button
                  key={idx}
                  disabled={disabled}
                  className={cn(
                    "px-2 py-2 rounded-md border text-sm transition-colors",
                    isSelected ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
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
          {/* Year picker implementation stays same */}
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
          <Button variant="ghost" className="w-full h-8 mt-2" onClick={() => setShowYearPicker(false)}>Cancel</Button>
        </div>
      )}
    </div>
  )
}
