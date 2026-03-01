'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X, Check } from 'lucide-react'
import { format, isSameMonth, startOfYear, endOfYear } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface MonthYearPickerV2Props {
  date: Date
  dateRange: DateRange | undefined
  mode: 'month' | 'range' | 'date' | 'all' | 'year' | 'cycle'
  // These onChange handlers will now ONLY be called when "OK" is clicked
  onDateChange: (date: Date) => void
  onRangeChange: (range: DateRange | undefined) => void
  onModeChange: (mode: 'month' | 'range' | 'date' | 'all' | 'year' | 'cycle') => void
  onCycleChange?: (cycle: string) => void
  selectedCycle?: string
  disabledRange?: { start: Date; end: Date } | undefined
  availableMonths?: Set<string>
  availableDateRange?: DateRange | undefined // Smart date range from filtered transactions
  accountCycles?: Array<{ label: string; value: string }> // Cycle options with labels
  isLoadingCycles?: boolean
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
  onCycleChange,
  selectedCycle,
  disabledRange,
  availableMonths,
  availableDateRange,
  accountCycles,
  isLoadingCycles,
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
  const [localMode, setLocalMode] = useState<'month' | 'range' | 'date' | 'all' | 'year' | 'cycle'>(mode)
  const [localDate, setLocalDate] = useState<Date>(date)
  const [localRange, setLocalRange] = useState<DateRange | undefined>(dateRange)
  const [localCycle, setLocalCycle] = useState<string | undefined>(selectedCycle)

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
    if (!open && accountCycles && accountCycles.length > 0 && localMode === 'range') {
      // Parse first cycle tag (format: "2025-01" or "25.01-24.02")
      const cycleValue = accountCycles[0].value
      if (cycleValue && cycleValue.includes('-') && !cycleValue.includes('.')) {
        // ISO format: "2025-01-25"
        const parsed = new Date(cycleValue)
        if (!isNaN(parsed.getTime())) {
          setLocalRange({
            from: parsed,
            to: parsed
          })
        }
      }
    }
  }, [accountCycles, localMode, open])

  // Sync local state when prop changes (only if closed)
  useEffect(() => {
    if (!open) {
      setLocalMode(mode)
      setLocalDate(date)
      setLocalRange(dateRange)
      setLocalCycle(selectedCycle)
    }
  }, [open, mode, date, dateRange, selectedCycle])

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
      setLocalCycle(selectedCycle)
    }
  }

  const handleApply = () => {
    onModeChange(localMode)
    if (localMode === 'cycle' && onCycleChange && localCycle) {
      onCycleChange(localCycle)
    } else if (localMode === 'month' || localMode === 'date' || localMode === 'year') {
      onDateChange(localDate)
      // Ensure range is cleared if switching to single date modes
      onRangeChange(undefined)
      if (onCycleChange) onCycleChange('')
    } else if (localMode === 'all') {
      onRangeChange(undefined)
      if (onCycleChange) onCycleChange('')
    } else {
      onRangeChange(localRange)
      if (onCycleChange) onCycleChange('')
    }
    setOpen(false)
  }

  const displayText = (() => {
    if (mode === 'cycle' && selectedCycle) return selectedCycle === 'all' ? 'All Cycles' : selectedCycle
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

  const tabs = useMemo(() => {
    const defaultTabs: ('cycle' | 'month' | 'date' | 'range' | 'all')[] = ['month', 'date', 'range', 'all']
    // Always include cycle tab if mode is 'cycle' (requested for Account Details)
    // or if we have cycles
    if (mode === 'cycle' || (accountCycles && accountCycles.length > 0) || isLoadingCycles) {
      return ['cycle', ...defaultTabs]
    }
    return defaultTabs
  }, [accountCycles, mode, isLoadingCycles])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "gap-2 justify-between font-medium transition-all text-xs",
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
        className="w-auto p-0 border-primary/20 shadow-xl z-[200]"
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
            {tabs.map((m) => {
              const isActive = (m === 'all' && (localMode === 'all' || localMode === 'year')) || (m === localMode);
              return (
                <Button
                  key={m}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (m === 'all' && (localMode === 'range' || localMode === 'cycle')) setLocalMode('all')
                    else setLocalMode(m)
                  }}
                  className="flex-1 h-7 text-[10px] capitalize px-1.5"
                >
                  {m === 'all' ? 'Year' : m}
                </Button>
              )
            })}
          </div>

          {/* Content */}
          <div className="p-0">
            {localMode === 'cycle' && (
              isLoadingCycles ? (
                <div className="w-[320px] flex flex-col items-center justify-center py-20 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                  <p className="text-xs text-slate-500 font-medium italic animate-pulse">Loading cycles...</p>
                </div>
              ) : (
                <CycleGrid
                  value={localCycle}
                  onChange={setLocalCycle}
                  cycles={accountCycles || []}
                />
              )
            )}
            {(localMode === 'all' || localMode === 'year') && (
              <div className="p-3 w-[320px]">
                <Button
                  variant={localMode === 'all' ? 'secondary' : 'outline'}
                  className={cn("w-full mb-4 border-dashed", localMode === 'all' && "border-primary bg-primary/10")}
                  onClick={() => {
                    setLocalMode('all')
                    setLocalRange(undefined)
                    setLocalCycle(undefined)
                    // Real-time apply for All Time
                    onModeChange('all')
                    if (onCycleChange) onCycleChange('')
                    onRangeChange(undefined)
                    setOpen(false)
                  }}
                >
                  {localMode === 'all' && "✓ "}Show All Time (Infinity)
                </Button>

                <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">Select Active Year</div>
                <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1">
                  {availableYears.map(year => {
                    const isCurrentYear = year === new Date().getFullYear()
                    const isSelected = localMode === 'year' && localDate.getFullYear() === year
                    return (
                      <button
                        key={year}
                        className={cn(
                          "px-2 py-3 rounded-md border text-sm transition-colors hover:bg-accent flex flex-col items-center justify-center gap-0.5",
                          isSelected ? "bg-primary text-primary-foreground border-primary shadow-md" : (isCurrentYear ? "border-primary/50 bg-primary/5" : "bg-background")
                        )}
                        onClick={() => {
                          const newDate = new Date(year, 0, 1)
                          setLocalDate(newDate)
                          setLocalMode('year')
                          setLocalRange(undefined)
                          setLocalCycle(undefined)
                          // Real-time apply for Year selection
                          onModeChange('year')
                          onDateChange(newDate)
                          onRangeChange(undefined)
                          if (onCycleChange) onCycleChange('')
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
              <div className="p-1">
                <Calendar
                  mode="single"
                  selected={localDate}
                  onSelect={(d) => d && setLocalDate(d)}
                  disabled={effectiveDisabledMatchers}
                  initialFocus
                  className="rounded-md"
                />
              </div>
            )}
            {localMode === 'range' && (
              <div className="p-1">
                <Calendar
                  mode="range"
                  selected={localRange}
                  onSelect={setLocalRange}
                  numberOfMonths={2}
                  disabled={effectiveDisabledMatchers}
                  initialFocus
                  className="rounded-md"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-2 border-t flex items-center justify-between bg-muted/40 text-[10px]">
            <div className="flex-1 opacity-60 px-2 italic truncate">
              {localMode === 'cycle' ? 'Showing tags from history' : (localMode === 'range' ? 'Select start & end date' : '')}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-8 px-2 text-[11px]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="h-8 px-4 text-[11px]"
                disabled={(localMode === 'range' && (!localRange?.from || !localRange?.to)) || (localMode === 'cycle' && !localCycle && accountCycles && accountCycles.length > 0)}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function CycleGrid({ value, onChange, cycles }: { value?: string; onChange: (v: string) => void; cycles: Array<{ label: string; value: string }> }) {
  const [search, setSearch] = useState('')
  const filtered = cycles.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.value.toLowerCase().includes(search.toLowerCase()) ||
    search === ''
  )

  if (cycles.length === 0) {
    return (
      <div className="p-10 w-[320px] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-dashed border-slate-200">
          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2a4 4 0 118 0v2M9 17h8" />
          </svg>
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-600">No Cycles Found</h3>
          <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
            This account doesn&apos;t have any recorded billing cycles. Try selecting a specific month instead.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 w-[320px]">
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Search cycle (e.g. 26.01 - 25.02)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-md bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
          autoFocus
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
            <X className="w-3 h-3 opacity-40 hover:opacity-100" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
        <button
          className={cn(
            "px-2 py-2 rounded-md border text-sm text-left transition-colors font-medium flex items-center justify-between",
            value === 'all' ? "bg-primary text-primary-foreground border-primary shadow-sm" : "hover:bg-accent"
          )}
          onClick={() => onChange('all')}
        >
          All
          {value === 'all' && <Check className="w-3 h-3" />}
        </button>

        {filtered.length === 0 && search && (
          <div className="col-span-2 py-8 text-center text-xs text-muted-foreground italic bg-muted/20 rounded-lg">
            No matching cycles found
          </div>
        )}

        {filtered.map(c => {
          const isSelected = value === c.value
          return (
            <button
              key={c.value}
              className={cn(
                "px-2 py-2 rounded-md border text-[11px] text-left transition-colors flex items-center justify-between",
                isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm" : "hover:bg-accent"
              )}
              onClick={() => onChange(c.value)}
            >
              <span className="truncate">{c.label}</span>
              {isSelected && <Check className="w-3 h-3 ml-1" />}
            </button>
          )
        })}
      </div>
    </div>
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
      const key = `${year}-${monthIndex + 1 < 10 ? '0' : ''}${monthIndex + 1}`
      // Also check yyyy-MM
      const key2 = format(new Date(year, monthIndex, 1), 'yyyy-MM')
      return !availableMonths?.has(key) && !availableMonths?.has(key2)
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
                    "px-2 py-3 rounded-md border text-sm transition-colors",
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
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
              autoFocus
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {filteredYears.map(y => (
              <button
                key={y}
                className="w-full px-2 py-2 text-sm text-left rounded hover:bg-accent transition-colors"
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
          <Button variant="ghost" className="w-full h-8 mt-2 text-xs" onClick={() => setShowYearPicker(false)}>Cancel</Button>
        </div>
      )}
    </div>
  )
}
