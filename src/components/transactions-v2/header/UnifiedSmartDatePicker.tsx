'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { CalendarIcon, Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type PickerMode = 'month' | 'range' | 'date' | 'all' | 'year' | 'cycle'

interface UnifiedSmartDatePickerProps {
  date: Date
  dateRange: DateRange | undefined
  mode: PickerMode
  onDateChange: (date: Date) => void
  onRangeChange: (range: DateRange | undefined) => void
  onModeChange: (mode: PickerMode) => void
  disabledRange?: { start: Date; end: Date } | undefined
  availableMonths?: Set<string>
  availableDateRange?: DateRange | undefined
  cycles?: Array<{ label: string; value: string; count?: number; highlight?: boolean }>
  selectedCycleValue?: string
  onCycleSelect?: (cycleValue: string) => void
  isCycleLoading?: boolean
  fullWidth?: boolean
  locked?: boolean
  disabled?: boolean
  selectedYearValue?: string | null
  onYearSelect?: (year: string | null) => void
}

function parseStrictDate(input: string): Date | null {
  const match = input.trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const parsed = new Date(year, month - 1, day)

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return parsed
}

function parseSmartDateInput(input: string): { mode: 'date'; date: Date } | { mode: 'range'; range: DateRange } | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const single = parseStrictDate(trimmed)
  if (single) {
    return { mode: 'date', date: single }
  }

  const matches = trimmed.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/g) || []
  if (matches.length < 2) return null

  const first = parseStrictDate(matches[0])
  const second = parseStrictDate(matches[1])
  if (!first || !second) return null

  const from = first <= second ? first : second
  const to = first <= second ? second : first
  return { mode: 'range', range: { from, to } }
}

function formatDateDigits(digits: string): string {
  const raw = digits.replace(/\D/g, '').slice(0, 8)
  if (raw.length <= 2) return raw
  if (raw.length <= 4) return `${raw.slice(0, 2)}-${raw.slice(2)}`
  return `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4)}`
}

function formatSmartInputMask(rawInput: string): string {
  const digits = rawInput.replace(/\D/g, '').slice(0, 16)
  if (digits.length <= 8) return formatDateDigits(digits)
  const first = formatDateDigits(digits.slice(0, 8))
  const second = formatDateDigits(digits.slice(8))
  return second ? `${first} - ${second}` : first
}

export function UnifiedSmartDatePicker({
  date,
  dateRange,
  mode,
  onDateChange,
  onRangeChange,
  onModeChange,
  disabledRange,
  availableMonths,
  availableDateRange,
  cycles,
  selectedCycleValue,
  onCycleSelect,
  isCycleLoading,
  fullWidth,
  locked,
  disabled = false,
  selectedYearValue,
  onYearSelect,
}: UnifiedSmartDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [yearOpen, setYearOpen] = useState(false)
  const [localMode, setLocalMode] = useState<PickerMode>(mode)
  const [localDate, setLocalDate] = useState<Date>(date)
  const [localRange, setLocalRange] = useState<DateRange | undefined>(dateRange)
  const [localCycle, setLocalCycle] = useState<string>(selectedCycleValue || 'all')
  const [cycleSearch, setCycleSearch] = useState('')
  const [typedInput, setTypedInput] = useState('')
  const [inputWarning, setInputWarning] = useState<string | null>(null)

  const cycleYears = useMemo(() => {
    const years = new Set<string>()
    ;(cycles || []).forEach((cycle) => {
      const valueYear = cycle.value.match(/^(\d{4})-/)?.[1]
      if (valueYear) years.add(valueYear)
    })
    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }, [cycles])

  const [cycleYearFilter, setCycleYearFilter] = useState<string>('all')

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    years.add(new Date().getFullYear())
    if (availableMonths) {
      availableMonths.forEach((monthTag) => {
        const year = Number(monthTag.slice(0, 4))
        if (!Number.isNaN(year)) years.add(year)
      })
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [availableMonths])

  const [localAllYear, setLocalAllYear] = useState<string>(selectedYearValue || String(new Date().getFullYear()))
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const cyclesWithAll = useMemo(() => {
    const base = cycles || []
    return base.some((c) => c.value === 'all') ? base : [{ label: 'All cycles', value: 'all' }, ...base]
  }, [cycles])

  const filteredCycles = useMemo(() => {
    const keyword = cycleSearch.trim().toLowerCase()
    return cyclesWithAll.filter((cycle) => {
      if (cycle.value !== 'all' && cycleYearFilter !== 'all') {
        const year = cycle.value.match(/^(\d{4})-/)?.[1]
        if (year !== cycleYearFilter) return false
      }
      if (!keyword) return true
      return cycle.label.toLowerCase().includes(keyword) || cycle.value.toLowerCase().includes(keyword)
    })
  }, [cyclesWithAll, cycleSearch, cycleYearFilter])

  const disabledMatchers = disabledRange
    ? [{ before: disabledRange.start }, { after: disabledRange.end }]
    : availableDateRange?.from && availableDateRange?.to
      ? [{ before: availableDateRange.from }, { after: availableDateRange.to }]
      : undefined

  const resetDraftFromProps = () => {
    setLocalMode(mode)
    setLocalDate(date)
    setLocalRange(dateRange)
    setLocalCycle(selectedCycleValue || 'all')
    setTypedInput('')
    setInputWarning(null)
    const defaultCycleYear = cycleYears.includes(String(new Date().getFullYear()))
      ? String(new Date().getFullYear())
      : cycleYears[0] || 'all'
    setCycleYearFilter(defaultCycleYear)
    setLocalAllYear(selectedYearValue || String(new Date().getFullYear()))
  }

  const selectedCycleLabel = cyclesWithAll.find((cycle) => cycle.value === (selectedCycleValue || 'all'))?.label
  const displayText = (() => {
    if (mode === 'cycle') return selectedCycleLabel || 'All cycles'
    if (mode === 'all') {
      if (selectedYearValue) return `All ${selectedYearValue}`
      return 'All Time'
    }
    if (mode === 'year') return format(date, 'yyyy')
    if (mode === 'month') return format(date, 'MMM yyyy')
    if (mode === 'date') return format(date, 'dd MMM yyyy')
    if (mode === 'range') {
      if (!dateRange?.from) return 'Date Range'
      if (!dateRange.to) return format(dateRange.from, 'dd MMM yyyy')
      return `${format(dateRange.from, 'dd MMM')} - ${format(dateRange.to, 'dd MMM')}`
    }
    return 'Select date'
  })()

  const applyTypedInput = (): boolean => {
    const parsed = parseSmartDateInput(typedInput)
    if (!parsed) {
      setInputWarning('Invalid date input. Use dd-mm-yyyy or a two-date range.')
      toast.warning('Invalid date input. Use dd-mm-yyyy or enter 2 dates for range.')
      return false
    }

    setInputWarning(null)
    if (parsed.mode === 'date') {
      onModeChange('date')
      onDateChange(parsed.date)
      onRangeChange(undefined)
      return true
    }

    onModeChange('range')
    onRangeChange(parsed.range)
    return true
  }

  const handleApply = () => {
    if (typedInput.trim()) {
      const ok = applyTypedInput()
      if (ok) setOpen(false)
      return
    }

    if (localMode === 'cycle') {
      onModeChange('cycle')
      if (onCycleSelect) onCycleSelect(localCycle || 'all')
      setOpen(false)
      return
    }

    if (localMode === 'all') {
      onModeChange('all')
      onRangeChange(undefined)
      if (onYearSelect) {
        onYearSelect(localAllYear === 'all' ? null : localAllYear)
      }
      setOpen(false)
      return
    }

    if (localMode === 'month' || localMode === 'date' || localMode === 'year') {
      onModeChange(localMode)
      onDateChange(localDate)
      onRangeChange(undefined)
      if (localMode === 'year' && onYearSelect) {
        onYearSelect(format(localDate, 'yyyy'))
      }
      setOpen(false)
      return
    }

    onModeChange('range')
    onRangeChange(localRange)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        if (locked && value) {
          toast.error("Please select Cycle 'All' to pick a custom date.")
          return
        }
        resetDraftFromProps()
        setOpen(value)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn('gap-2 justify-between font-medium', fullWidth ? 'w-full h-10' : 'w-[200px] h-9')}
        >
          <span className="flex items-center gap-1.5 truncate">
            <CalendarIcon className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span className="truncate">{displayText}</span>
          </span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className={cn(
          'p-0 border-primary/20 shadow-xl w-auto',
          localMode === 'range' ? 'min-w-[360px]' : 'w-[360px]'
        )}
        align="start"
        sideOffset={4}
      >
        <div className="p-2 border-b grid grid-cols-6 gap-1 bg-muted/30">
          {(['cycle', 'date', 'range', 'month', 'year', 'all'] as PickerMode[]).map((tab) => (
            <Button
              key={tab}
              variant={localMode === tab ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-[10px] capitalize px-1"
              onClick={() => setLocalMode(tab)}
            >
              {tab}
            </Button>
          ))}
        </div>

        <div className={cn('p-3 space-y-3', localMode === 'range' && 'pr-3')}>
          <div>
            <Input
              value={typedInput}
              onChange={(e) => {
                setTypedInput(formatSmartInputMask(e.target.value))
                if (inputWarning) setInputWarning(null)
              }}
              placeholder="Type: dd-mm-yyyy or dd-mm-yyyy to dd-mm-yyyy"
              className="h-9 text-xs"
            />
            {inputWarning && <p className="text-[11px] text-amber-600 mt-1">{inputWarning}</p>}
          </div>

          {localMode === 'cycle' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <Input
                    value={cycleSearch}
                    onChange={(e) => setCycleSearch(e.target.value)}
                    className="h-8 pl-7 pr-7 text-xs"
                    placeholder="Search cycle"
                  />
                  {cycleSearch && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                      onClick={() => setCycleSearch('')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <Popover open={yearOpen} onOpenChange={setYearOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 min-w-[92px] text-xs justify-between">
                      {cycleYearFilter === 'all' ? 'All years' : cycleYearFilter}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[180px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Find year" />
                      <CommandList>
                        <CommandEmpty>No years</CommandEmpty>
                        <CommandItem
                          value="all-years"
                          onSelect={() => {
                            setCycleYearFilter('all')
                            setYearOpen(false)
                          }}
                          className="flex items-center justify-between"
                        >
                          <span>All years</span>
                          {cycleYearFilter === 'all' && <Check className="w-3.5 h-3.5" />}
                        </CommandItem>
                        {cycleYears.map((year) => (
                          <CommandItem
                            key={year}
                            value={year}
                            onSelect={() => {
                              setCycleYearFilter(year)
                              setYearOpen(false)
                            }}
                            className="flex items-center justify-between"
                          >
                            <span>{year}</span>
                            {cycleYearFilter === year && <Check className="w-3.5 h-3.5" />}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="max-h-48 overflow-y-auto border rounded-md p-1">
                {isCycleLoading ? (
                  <div className="h-24 flex items-center justify-center text-xs text-slate-500 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading cycles...
                  </div>
                ) : filteredCycles.length === 0 ? (
                  <div className="h-16 flex items-center justify-center text-xs text-slate-500">No cycles</div>
                ) : (
                  filteredCycles.map((cycle) => (
                    <button
                      key={cycle.value}
                      type="button"
                      className={cn(
                        'w-full rounded-md border px-2.5 py-2 text-left text-xs transition-colors',
                        localCycle === cycle.value
                          ? 'border-primary/30 bg-primary/10 text-primary shadow-sm'
                          : cycle.highlight
                            ? 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                            : 'border-transparent hover:border-slate-200 hover:bg-slate-100'
                      )}
                      onClick={() => setLocalCycle(cycle.value)}
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="truncate font-medium">{cycle.label}</div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {cycle.value !== 'all' && (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              {cycle.value}
                            </span>
                          )}
                          {cycle.highlight && cycle.value !== 'all' && (
                            <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900">
                              Current
                            </span>
                          )}
                          {cycle.value !== 'all' && (
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {cycle.count ?? 0}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {localMode === 'date' && (
            <Calendar
              mode="single"
              selected={localDate}
              onSelect={(d) => {
                if (!d) return
                setLocalDate(d)
                setTypedInput(format(d, 'dd-MM-yyyy'))
              }}
              captionLayout="label"
              disabled={disabledMatchers}
            />
          )}

          {localMode === 'month' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setLocalDate(new Date(localDate.getFullYear() - 1, localDate.getMonth(), 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-slate-700">{localDate.getFullYear()}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setLocalDate(new Date(localDate.getFullYear() + 1, localDate.getMonth(), 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {monthLabels.map((label, index) => {
                  const isSelected = localDate.getMonth() === index
                  return (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      className="h-8"
                      onClick={() => {
                        const next = new Date(localDate.getFullYear(), index, 1)
                        setLocalDate(next)
                        setTypedInput(format(next, 'MM-yyyy'))
                      }}
                    >
                      {label}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {localMode === 'range' && (
            <div className="w-fit max-w-[calc(100vw-80px)] overflow-x-auto">
              <Calendar
                mode="range"
                selected={localRange}
                onSelect={(range) => {
                  setLocalRange(range)
                  if (range?.from && range?.to) {
                    setTypedInput(`${format(range.from, 'dd-MM-yyyy')} - ${format(range.to, 'dd-MM-yyyy')}`)
                  } else if (range?.from) {
                    setTypedInput(format(range.from, 'dd-MM-yyyy'))
                  }
                }}
                disabled={disabledMatchers}
                numberOfMonths={2}
                className="w-fit"
                classNames={{
                  months: 'flex flex-row gap-3 w-fit',
                  month: 'space-y-4 w-[280px]'
                }}
              />
            </div>
          )}

          {localMode === 'year' && (
            <div className="grid grid-cols-3 gap-2">
              {availableYears.map((year) => (
                <Button
                  key={year}
                  size="sm"
                  variant={format(localDate, 'yyyy') === String(year) ? 'default' : 'outline'}
                  onClick={() => setLocalDate(new Date(year, 0, 1))}
                  className="h-8"
                >
                  {year}
                </Button>
              ))}
            </div>
          )}

          {localMode === 'all' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-600">All-time scope with optional year focus</p>
              <Popover open={yearOpen} onOpenChange={setYearOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-full justify-between text-xs">
                    {localAllYear === 'all' ? 'All years' : localAllYear}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Find year" />
                    <CommandList>
                      <CommandItem
                        value="all-years"
                        onSelect={() => {
                          setLocalAllYear('all')
                          setYearOpen(false)
                        }}
                        className="flex items-center justify-between"
                      >
                        <span>All years</span>
                        {localAllYear === 'all' && <Check className="w-3.5 h-3.5" />}
                      </CommandItem>
                      {availableYears.map((year) => (
                        <CommandItem
                          key={year}
                          value={String(year)}
                          onSelect={() => {
                            setLocalAllYear(String(year))
                            setYearOpen(false)
                          }}
                          className="flex items-center justify-between"
                        >
                          <span>{year}</span>
                          {localAllYear === String(year) && <Check className="w-3.5 h-3.5" />}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <div className="p-2 border-t flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false)
              setTypedInput('')
              setInputWarning(null)
            }}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
