'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format, isSameMonth, startOfYear, endOfYear } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface MonthYearPickerV2Props {
  date: Date
  dateRange: DateRange | undefined
  mode: 'month' | 'range' | 'date' | 'all' | 'year'
  // These onChange handlers will now ONLY be called when "OK" is clicked
  onDateChange: (date: Date) => void
  onRangeChange: (range: DateRange | undefined) => void
  onModeChange: (mode: 'month' | 'range' | 'date' | 'all' | 'year') => void
  disabledRange?: { start: Date; end: Date } | undefined
  availableMonths?: Set<string>
  availableDateRange?: DateRange | undefined // Smart date range from filtered transactions
  accountCycleTags?: string[] // Cycle tags for auto-set (e.g., ['2025-01', '2025-02'])
  fullWidth?: boolean
  locked?: boolean
  disabled?: boolean // New: disable entire picker
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
  availableDateRange,
  accountCycleTags,
  fullWidth,
  locked,
  disabled = false,
}: MonthYearPickerV2Props) {
  const [open, setOpen] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setOpen(false)
    }, 120)
  }

  // Local state buffer
  const [localMode, setLocalMode] = useState<'month' | 'range' | 'date' | 'all' | 'year'>(mode)
  const [localDate, setLocalDate] = useState<Date>(date)
  const [localRange, setLocalRange] = useState<DateRange | undefined>(dateRange)

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    years.add(new Date().getFullYear())
    if (availableMonths) {
      availableMonths.forEach(m => {
        const y = parseInt(m.split('-')[0])
        if (!isNaN(y)) years.add(y)
      })
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [availableMonths])

  // Combine disabledRange and availableDateRange
  // Priority: disabledRange (cycle constraint) > availableDateRange (smart filter)
  const effectiveDisabledMatchers = disabledRange
    ? [{ before: disabledRange.start }, { after: disabledRange.end }]
    : availableDateRange?.from && availableDateRange?.to
      ? [{ before: availableDateRange.from }, { after: availableDateRange.to }]
      : undefined

  // Smart cycle detection: if account has cycles and filter not active, auto-set range
  useEffect(() => {
    if (!open && accountCycleTags && accountCycleTags.length > 0 && localMode === 'range') {
      // Parse first cycle tag (format: "2025-01" or "25.01-24.02")
      const cycleTag = accountCycleTags[0]
      if (cycleTag && cycleTag.includes('-') && !cycleTag.includes('.')) {
        // ISO format: "2025-01-25"
        const parsed = new Date(cycleTag)
        if (!isNaN(parsed.getTime())) {
          setLocalRange({
            from: parsed,
            to: parsed
          })
        }
      }
    }
  }, [accountCycleTags, localMode])

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
    if (localMode === 'month' || localMode === 'date' || localMode === 'year') {
      onDateChange(localDate)
      // Ensure range is cleared if switching to single date modes
      onRangeChange(undefined)
    } else if (localMode === 'all') {
      onRangeChange(undefined)
    } else {
      onRangeChange(localRange)
    }
    setOpen(false)
  }

  const displayText = (() => {
    if (mode === 'all') return 'All Time'
    if (mode === 'year') return format(date, 'yyyy')
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "gap-2 justify-between font-medium transition-all",
            fullWidth ? 'w-full h-10' : 'w-[200px] h-9',
            (locked || disabled) && "opacity-50 cursor-not-allowed bg-muted/50",
            mode !== 'all' && "border-primary/50 bg-primary/5 text-primary"
          )}
        >
          <div className="flex items-center gap-1.5 truncate pointer-events-none">
            <CalendarIcon className={cn("w-3.5 h-3.5 shrink-0", mode !== 'all' ? "text-primary" : "text-slate-500")} />
            <span className="truncate">{displayText}</span>
          </div>
          <ChevronDown className={cn("w-3 h-3 opacity-50 transition-transform pointer-events-none", open && "rotate-180")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-primary/20 shadow-xl"
        align="start"
        sideOffset={2}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          {/* Tabs */}
          <div className="p-2 border-b flex gap-1 bg-muted/40 text-[10px]">
            {(['month', 'date', 'range', 'all'] as const).map((m) => {
              const isActive = (m === 'all' && (localMode === 'all' || localMode === 'year')) || (m === localMode);
              return (
                <Button
                  key={m}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (m === 'all' && localMode === 'range') setLocalMode('all')
                    else setLocalMode(m)
                  }}
                  className="flex-1 h-7 text-xs capitalize"
                >
                  {m === 'all' ? 'Year' : m}
                </Button>
              )
            })}
          </div>

          {/* Content */}
          <div className="p-0">
            {(localMode === 'all' || localMode === 'year') && (
              <div className="p-3 w-[320px]">
                <Button
                  variant={localMode === 'all' ? 'secondary' : 'outline'}
                  className={cn("w-full mb-4 border-dashed", localMode === 'all' && "border-primary bg-primary/10")}
                  onClick={() => {
                    setLocalMode('all')
                    setLocalRange(undefined)
                    // Real-time apply for All Time
                    onModeChange('all')
                    onRangeChange(undefined)
                    setOpen(false)
                  }}
                >
                  {localMode === 'all' && "✓ "}Show All Time (Infinity)
                </Button>

                <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">Select Active Year</div>
                <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                  {availableYears.map(year => {
                    const isCurrentYear = year === new Date().getFullYear()
                    const isSelected = localMode === 'year' && localDate.getFullYear() === year
                    return (
                      <button
                        key={year}
                        className={cn(
                          "px-2 py-2 rounded-md border text-sm transition-colors hover:bg-accent flex flex-col items-center justify-center gap-0.5",
                          isSelected ? "bg-primary text-primary-foreground border-primary shadow-md" : (isCurrentYear ? "border-primary/50 bg-primary/5" : "bg-background")
                        )}
                        onClick={() => {
                          const newDate = new Date(year, 0, 1)
                          setLocalDate(newDate)
                          setLocalMode('year')
                          setLocalRange(undefined)
                          // Real-time apply for Year selection
                          onModeChange('year')
                          onDateChange(newDate)
                          onRangeChange(undefined)
                          setOpen(false)
                        }}
                      >
                        <span className="font-bold">{year}</span>
                        {isCurrentYear && <span className={cn("text-[9px] uppercase tracking-tighter opacity-80", isSelected ? "text-primary-foreground" : "text-primary")}>Actual</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
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
                disabled={effectiveDisabledMatchers}
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
                disabled={effectiveDisabledMatchers}
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
