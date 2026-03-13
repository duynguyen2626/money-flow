'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X, Loader2, RotateCcw } from 'lucide-react'
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
  disabledRange?: { start: Date; end: Date } | undefined
  availableMonths?: Set<string>
  availableDateRange?: DateRange | undefined // Smart date range from filtered transactions
  accountCycleTags?: string[] // Cycle tags for auto-set (e.g., ['2025-01', '2025-02'])
  cycles?: Array<{ label: string; value: string }> // Cycle dropdown options from account
  selectedCycleValue?: string // Currently selected cycle
  onCycleSelect?: (cycleValue: string) => void // Called when cycle is selected
  isCycleLoading?: boolean // Loading state for cycles
  fullWidth?: boolean
  locked?: boolean
  disabled?: boolean // New: disable entire picker
  onResetToCurrent?: () => void
  resetLoading?: boolean
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
  cycles,
  selectedCycleValue,
  onCycleSelect,
  isCycleLoading,
  fullWidth,
  locked,
  disabled = false,
  onResetToCurrent,
  resetLoading = false,
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
  const [localCycle, setLocalCycle] = useState<string | undefined>(selectedCycleValue)
  const [cycleSearch, setCycleSearch] = useState('')
  const [cycleYearFilter, setCycleYearFilter] = useState<string>(String(new Date().getFullYear()))
  const hasCycleOptions = (Array.isArray(cycles) && cycles.length > 0) || (Array.isArray(accountCycleTags) && accountCycleTags.length > 0)
  const hasCycleContext = hasCycleOptions || mode === 'cycle' || selectedCycleValue !== undefined
  const filteredCycles = useMemo(() => {
    const q = cycleSearch.trim().toLowerCase()
    if (!q) return cycles || []
    return (cycles || []).filter(cycle =>
      cycle.label.toLowerCase().includes(q) || cycle.value.toLowerCase().includes(q)
    )
  }, [cycles, cycleSearch])

  const cyclesWithAll = useMemo(() => {
    const base = cycles || []
    const hasAll = base.some(cycle => cycle.value === 'all')
    return hasAll ? base : [{ label: 'All cycles', value: 'all' }, ...base]
  }, [cycles])

  const cycleYears = useMemo(() => {
    const years = new Set<string>()
    ;(cycles || []).forEach((cycle) => {
      const yearMatch = cycle.value.match(/^(\d{4})-/)
      if (yearMatch?.[1]) years.add(yearMatch[1])
    })

    const sorted = Array.from(years).sort((a, b) => Number(b) - Number(a))
    return sorted
  }, [cycles])

  const filteredCyclesWithAll = useMemo(() => {
    const q = cycleSearch.trim().toLowerCase()
    const byYear = cyclesWithAll.filter((cycle) => {
      if (cycle.value === 'all') return true
      if (cycleYearFilter === 'all') return true
      const yearMatch = cycle.value.match(/^(\d{4})-/)
      return yearMatch?.[1] === cycleYearFilter
    })

    if (!q) return byYear
    return byYear.filter(cycle =>
      cycle.label.toLowerCase().includes(q) || cycle.value.toLowerCase().includes(q)
    )
  }, [cyclesWithAll, cycleSearch, cycleYearFilter])

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
      if (hasCycleContext) {
        setLocalMode('cycle')
      } else {
        setLocalMode(mode)
      }
      setLocalDate(date)
      setLocalRange(dateRange)
      setLocalCycle(selectedCycleValue)
      if (cycleYears.length > 0) {
        const currentYear = String(new Date().getFullYear())
        setCycleYearFilter(cycleYears.includes(currentYear) ? currentYear : cycleYears[0])
      } else {
        setCycleYearFilter('all')
      }
    }
  }, [open, mode, date, dateRange, selectedCycleValue, hasCycleContext, cycleYears])

  const handleOpenChange = (newOpen: boolean) => {
    if (locked && newOpen) {
      toast.error("Please select Cycle 'All' to pick a custom date.")
      return
    }
    setOpen(newOpen)
    if (!newOpen) {
      // Reset local state to props on cancel/close without OK
      if (hasCycleContext) {
        setLocalMode('cycle')
      } else {
        setLocalMode(mode)
      }
      setLocalDate(date)
      setLocalRange(dateRange)
      setLocalCycle(selectedCycleValue)
      if (cycleYears.length > 0) {
        const currentYear = String(new Date().getFullYear())
        setCycleYearFilter(cycleYears.includes(currentYear) ? currentYear : cycleYears[0])
      } else {
        setCycleYearFilter('all')
      }
      setCycleSearch('')
    }
  }

  const handleApply = () => {
    if (localMode === 'cycle') {
      onModeChange('cycle')
      if (onCycleSelect && localCycle) {
        onCycleSelect(localCycle)
      }
      setOpen(false)
      return
    }

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
    if (selectedCycleValue === 'all') return 'All cycles'
    if (selectedCycleValue && selectedCycleValue !== 'all') {
      const selected = cycles?.find(c => c.value === selectedCycleValue)
      return selected?.label || selectedCycleValue
    }
    if (mode === 'all') return 'All Time'
    if (mode === 'year') return format(date, 'yyyy')
    if (mode === 'month') return format(date, 'MMM yyyy')
    if (mode === 'date') return format(date, 'dd MMM yyyy')
    if (mode === 'cycle') {
      const selected = cycles?.find(c => c.value === selectedCycleValue)
      return selected?.label || 'Select Cycle'
    }
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

  const shouldShowCycleTab = hasCycleContext

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("flex items-center gap-1.5", fullWidth && "w-full")}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || resetLoading}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
              "gap-2 justify-between font-medium transition-all",
              fullWidth ? 'flex-1 h-10' : 'w-[200px] h-9',
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
        {onResetToCurrent && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled || resetLoading}
            onClick={(e) => {
              e.stopPropagation()
              onResetToCurrent()
            }}
            className={cn(
              "h-9 w-9 text-slate-500 hover:text-slate-700",
              fullWidth && "h-10 w-10"
            )}
            title="Reset to current month"
          >
            {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          </Button>
        )}
      </div>
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
            {shouldShowCycleTab && (
              <Button
                key="cycle"
                variant={localMode === 'cycle' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLocalMode('cycle')}
                disabled={isCycleLoading}
                className="flex-1 h-7 text-xs capitalize flex items-center justify-center gap-1"
              >
                {isCycleLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Cycle'}
              </Button>
            )}
            {['month', 'date', 'range', 'all'].map((m) => {
              const isActive = m === localMode || (m === 'all' && localMode === 'year');
              return (
                <Button
                  key={m}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (m === 'all' && (localMode === 'range' || localMode === 'all')) {
                      setLocalMode('all')
                    } else {
                      setLocalMode(m as any)
                    }
                  }}
                  className="flex-1 h-7 text-[10px] capitalize px-1"
                >
                  {m === 'all' ? 'All' : m}
                </Button>
              )
            })}
          </div>

          {/* Content */}
          <div className="p-0">
            {localMode === 'cycle' && (
              <div className="w-[280px] p-3">
                {isCycleLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Loading cycles...</span>
                  </div>
                ) : cyclesWithAll.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={cycleSearch}
                          onChange={(e) => setCycleSearch(e.target.value)}
                          placeholder="Search cycle..."
                          className="w-full h-8 rounded-md border border-slate-200 bg-white px-2.5 pr-8 text-xs outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                        />
                        {cycleSearch && (
                          <button
                            type="button"
                            onClick={() => setCycleSearch('')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-100"
                          >
                            <X className="h-3 w-3 text-slate-400" />
                          </button>
                        )}
                      </div>
                      <select
                        value={cycleYearFilter}
                        onChange={(e) => setCycleYearFilter(e.target.value)}
                        className="h-8 min-w-[86px] rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                      >
                        {cycleYears.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                        {cycleYears.length === 0 && <option value="all">All</option>}
                      </select>
                    </div>

                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {filteredCyclesWithAll.map((cycle) => (
                      <button
                        key={cycle.value}
                        onClick={() => {
                          setLocalCycle(cycle.value)
                        }}
                        className={cn(
                          "w-full px-3 py-2 rounded-md border text-sm transition-colors text-left",
                          localCycle === cycle.value
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "border-slate-200 hover:bg-accent"
                        )}
                      >
                        <span className="font-medium">{cycle.label}</span>
                      </button>
                    ))}
                    </div>

                    {filteredCyclesWithAll.length === 0 && (
                      <div className="flex items-center justify-center py-4 text-xs text-muted-foreground italic">
                        No matching cycles
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <svg className="h-12 w-12 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-muted-foreground">No cycles found</span>
                    <span className="text-xs text-muted-foreground/70">Select an account with cashback config</span>
                  </div>
                )}
              </div>
            )}
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
              disabled={(localMode === 'range' && (!localRange?.from || !localRange?.to)) || (localMode === 'cycle' && !!cycles?.length && !localCycle)}
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
