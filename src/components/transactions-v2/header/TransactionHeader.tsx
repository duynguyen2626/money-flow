'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Account, Person } from '@/types/moneyflow.types'
import { MonthYearPickerV2 } from '@/components/transactions-v2/header/MonthYearPickerV2'
import { QuickFilterDropdown } from '@/components/transactions-v2/header/QuickFilterDropdown'
import { TypeFilterDropdown } from '@/components/transactions-v2/header/TypeFilterDropdown'
import { StatusDropdown } from '@/components/transactions-v2/header/StatusDropdown'
import { AddTransactionDropdown } from '@/components/transactions-v2/header/AddTransactionDropdown'
import { CycleFilterDropdown } from '@/components/transactions-v2/header/CycleFilterDropdown'
import { FilterX, ListFilter, X, Search, Filter, Trash2, ChevronDown, Clipboard, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateRange } from 'react-day-picker'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

export type FilterType = 'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer' | 'cashback'
export type StatusFilter = 'active' | 'void' | 'pending'

interface TransactionHeaderProps {
  // Data
  accounts: Account[]
  people: Person[]

  // Date State (Parent)
  date: Date
  dateRange: DateRange | undefined
  dateMode: 'month' | 'range' | 'date' | 'all' | 'year'
  onDateChange: (date: Date) => void
  onRangeChange: (range: DateRange | undefined) => void
  onModeChange: (mode: 'month' | 'range' | 'date' | 'all' | 'year') => void

  // Filter State (Parent)
  accountId?: string
  onAccountChange: (id: string | undefined) => void

  personId?: string
  onPersonChange: (id: string | undefined) => void

  categoryId?: string
  onCategoryChange: (id: string | undefined) => void

  searchTerm: string
  onSearchChange: (val: string) => void

  filterType: FilterType
  onFilterChange: (type: FilterType) => void

  statusFilter: StatusFilter
  onStatusChange: (status: StatusFilter) => void

  hasActiveFilters?: boolean
  onReset?: () => void
  onClearFilters?: () => void
  onRefresh?: () => void

  // Actions
  onAdd: (type?: string) => void

  // Cycle Filter
  cycles: { label: string; value: string }[]
  selectedCycle?: string
  onCycleChange: (cycle?: string) => void
  disabledRange?: { start: Date; end: Date } | undefined

  // Available months for constraints
  availableMonths?: Set<string>

  // Available date range for smart filtering
  availableDateRange?: DateRange | undefined

  // Dynamic Filter Options
  availableAccountIds?: Set<string>
  availablePersonIds?: Set<string>
  availableCategoryIds?: Set<string>

  // Categories
  categories?: { id: string; name: string; image?: string | null }[]
}

interface ClearDropdownButtonProps {
  onReset?: () => void
  onClearFilters?: () => void
  setConfirmClearOpen: (open: boolean) => void
  handleApplyFilters: () => void
}

function ClearDropdownButton({ onReset, onClearFilters, setConfirmClearOpen, handleApplyFilters }: ClearDropdownButtonProps) {
  const [open, setOpen] = useState(false)
  const closeTimeout = useRef<NodeJS.Timeout | null>(null)

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
          variant="destructive"
          size="sm"
          className="h-9 px-3 gap-1.5 font-medium"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <FilterX className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Clear</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[260px] p-1"
        align="start"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-0.5">
          {/* Clear Filter */}
          <button
            onClick={() => {
              onClearFilters?.()
              setOpen(false)
            }}
            className="w-full flex items-start gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent transition-colors text-left"
          >
            <FilterX className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />
            <div className="flex-1">
              <div className="font-medium">Clear Filter</div>
              <div className="text-xs text-muted-foreground">Keep search</div>
            </div>
          </button>

          {/* Clear All */}
          <button
            onClick={() => {
              setConfirmClearOpen(true)
              setOpen(false)
            }}
            className="w-full flex items-start gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent transition-colors text-left text-destructive"
          >
            <Trash2 className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />
            <div className="flex-1">
              <div className="font-medium">Clear All</div>
              <div className="text-xs text-muted-foreground">Including search</div>
            </div>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function TransactionHeader({
  accounts,
  people,
  date,
  dateRange,
  dateMode,
  onDateChange,
  onRangeChange,
  onModeChange,
  accountId,
  onAccountChange,
  personId,
  onPersonChange,
  categoryId,
  onCategoryChange,
  searchTerm,
  onSearchChange,
  filterType,
  onFilterChange,
  statusFilter,
  onStatusChange,
  hasActiveFilters,
  onReset,
  onClearFilters,
  onRefresh,
  onAdd,
  cycles,
  selectedCycle,
  onCycleChange,
  disabledRange,
  availableMonths,
  availableDateRange,
  availableAccountIds,
  availablePersonIds,
  availableCategoryIds,
  categories = [],
}: TransactionHeaderProps) {
  // Local State Buffer
  const [localAccountId, setLocalAccountId] = useState(accountId)
  const [localPersonId, setLocalPersonId] = useState(personId)
  const [localCategoryId, setLocalCategoryId] = useState(categoryId)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [localFilterType, setLocalFilterType] = useState(filterType)
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilter)
  const [localCycle, setLocalCycle] = useState(selectedCycle)

  // Date State Buffer
  const [localDate, setLocalDate] = useState(date)
  const [localDateRange, setLocalDateRange] = useState(dateRange)
  const [localDateMode, setLocalDateMode] = useState<'month' | 'range' | 'date' | 'all' | 'year'>(dateMode)

  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  // Sync props to local state when they change externally (or after apply)
  useEffect(() => {
    setLocalAccountId(accountId)
    setLocalPersonId(personId)
    setLocalCategoryId(categoryId)
    setLocalSearchTerm(searchTerm)
    setLocalFilterType(filterType)
    setLocalStatusFilter(statusFilter)
    setLocalCycle(selectedCycle)
    setLocalDate(date)
    setLocalDateRange(dateRange)
    setLocalDateMode(dateMode)
  }, [
    accountId, personId, categoryId, searchTerm, filterType, statusFilter,
    selectedCycle, date, dateRange, dateMode
  ])

  // Debounced Search Effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearchTerm !== searchTerm) {
        onSearchChange(localSearchTerm)
      }
    }, 500) // 500ms delay

    return () => clearTimeout(handler)
  }, [localSearchTerm, searchTerm, onSearchChange])

  // --- Filter Options Logic ---
  const filteredPeople = useMemo(() => {
    if (!availablePersonIds) return people
    // Always include the currently selected one to prevent it from disappearing
    return people.filter(p => availablePersonIds.has(p.id) || p.id === localPersonId)
  }, [people, availablePersonIds, localPersonId])

  const filteredAccounts = useMemo(() => {
    if (!availableAccountIds) return accounts
    // Always include the currently selected one
    return accounts.filter(a => availableAccountIds.has(a.id) || a.id === localAccountId)
  }, [accounts, availableAccountIds, localAccountId])


  // --- Hybrid Real-time Handlers ---
  const handleFilterChange = <T,>(setter: (val: T) => void, propHandler: (val: T) => void) => (val: T) => {
    setter(val)
    if (hasActiveFilters) {
      propHandler(val)
    }
  }

  // Wrapper for Cycle Change
  const handleCycleChange = (val: string | undefined) => {
    setLocalCycle(val)
    if (hasActiveFilters) {
      onCycleChange(val)
    }
  }

  // Wrapper for MonthYearPicker
  const handleDateUpdate = (
    updates: Partial<{
      date: Date
      range: DateRange | undefined
      mode: 'month' | 'range' | 'date' | 'all' | 'year'
    }>
  ) => {
    if (updates.date !== undefined) setLocalDate(updates.date)
    if (updates.range !== undefined) setLocalDateRange(updates.range)
    if (updates.mode !== undefined) setLocalDateMode(updates.mode)

    if (hasActiveFilters) {
      // Apply immediately if filtering
      if (updates.mode !== undefined) onModeChange(updates.mode)
      if (updates.date !== undefined) onDateChange(updates.date)
      if (updates.range !== undefined) onRangeChange(updates.range)
    }
  }

  const handleApplyFilters = () => {
    onAccountChange(localAccountId)
    onPersonChange(localPersonId)
    onSearchChange(localSearchTerm)
    onFilterChange(localFilterType)
    onStatusChange(localStatusFilter)
    onCycleChange(localCycle)

    // Apply Date Changes
    onModeChange(localDateMode)
    onDateChange(localDate)
    onRangeChange(localDateRange)
  }

  const handleClearConfirm = () => {
    if (onReset) onReset()
    setConfirmClearOpen(false)
    toast.success("Filters cleared")
  }

  // Handle Search Input (Manual)
  const handleSearchConfirm = () => {
    onSearchChange(localSearchTerm)
  }

  const DesktopFilters = () => (
    <div className="hidden md:flex items-center gap-2 shrink-0">
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-9 w-9 p-0 shrink-0 hover:bg-muted"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </Button>
      )}

      <TypeFilterDropdown
        value={localFilterType}
        onChange={handleFilterChange(setLocalFilterType, onFilterChange)}
        fullWidth
      />

      <StatusDropdown
        value={localStatusFilter}
        onChange={handleFilterChange(setLocalStatusFilter, onStatusChange)}
        fullWidth
      />

      <QuickFilterDropdown
        items={filteredPeople.map(p => ({
          id: p.id,
          name: p.name,
          image: p.image_url,
        }))}
        value={localPersonId}
        onValueChange={handleFilterChange(setLocalPersonId, onPersonChange)}
        placeholder="People"
        emptyText="No people found"
      />

      <QuickFilterDropdown
        items={filteredAccounts.map(a => ({
          id: a.id,
          name: a.name,
          image: a.image_url,
        }))}
        value={localAccountId}
        onValueChange={handleFilterChange(setLocalAccountId, onAccountChange)}
        placeholder="Account"
        emptyText="No accounts found"
      />

      <CycleFilterDropdown
        cycles={cycles}
        value={localCycle}
        onChange={handleCycleChange}
        disabled={cycles.length === 0}
      />

      <MonthYearPickerV2
        date={localDate}
        dateRange={localDateRange}
        mode={localDateMode}
        onDateChange={(d) => handleDateUpdate({ date: d })}
        onRangeChange={(r) => handleDateUpdate({ range: r })}
        onModeChange={(m) => handleDateUpdate({ mode: m })}
        disabledRange={disabledRange}
        availableMonths={availableMonths}
        availableDateRange={availableDateRange}
        locked={!!localCycle}
      />

      {/* Filter Action Button */}
      {!hasActiveFilters ? (
        <Button
          variant="default"
          size="sm"
          onClick={handleApplyFilters}
          className="h-9 px-3 gap-1.5 font-medium bg-primary text-primary-foreground"
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Filter</span>
        </Button>
      ) : (
        <ClearDropdownButton
          onReset={onReset}
          onClearFilters={onClearFilters}
          setConfirmClearOpen={setConfirmClearOpen}
          handleApplyFilters={handleApplyFilters}
        />
      )}
    </div>
  )

  const MobileFilterButton = () => (
    <Button
      variant={hasActiveFilters ? 'destructive' : 'default'}
      size="sm"
      onClick={() => {
        if (hasActiveFilters) {
          setConfirmClearOpen(true)
        } else {
          setMobileFilterOpen(true)
        }
      }}
      className="h-9 w-9 p-0 shrink-0"
    >
      {hasActiveFilters ? <X className="w-4 h-4" /> : <ListFilter className="w-4 h-4" />}
    </Button>
  )

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-2 px-4 py-3 h-14">
        <div className="flex items-center flex-1 min-w-0 relative">
          <Input
            placeholder="Search by notes or ID..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="pr-8"
            onKeyDown={(e) => e.key === 'Enter' && handleSearchConfirm()}
          />
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
            onClick={handleSearchConfirm}
          >
            <Search className="w-4 h-4 opacity-50" />
          </button>
        </div>

        <MobileFilterButton />

        <div className="shrink-0">
          <AddTransactionDropdown onSelect={onAdd} />
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center gap-2 px-4 py-3">
        <DesktopFilters />

        <div className="flex items-center gap-2 flex-1 ml-2 relative">
          <div className="relative flex-1 max-w-sm">
            <Clipboard
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText()
                  setLocalSearchTerm(text)
                } catch (err) {
                  const error = err as Error & { name?: string }
                  if (error.name === 'NotAllowedError') {
                    toast.error("Clipboard permission denied")
                  } else {
                    toast.error("Failed to read clipboard")
                  }
                }
              }}
            />
            <Input
              placeholder="Search by notes or ID..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="pl-9 pr-16"
              onKeyDown={(e) => e.key === 'Enter' && handleSearchConfirm()}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {localSearchTerm && (
                <button
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => {
                    setLocalSearchTerm('')
                    onSearchChange('') // Clear immediately
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                className="p-1 hover:bg-slate-100 rounded"
                onClick={handleSearchConfirm}
                disabled={!localSearchTerm.trim()}
              >
                <Search className="w-4 h-4 opacity-50" />
              </button>
            </div>
          </div>
          <AddTransactionDropdown onSelect={onAdd} />
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all filters?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all your current filters to default settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear Filters
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Filter Modal */}
      <Dialog open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <DialogContent className="max-w-full md:max-w-[500px] max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-4 py-4">
            {/* Mobile filters handled with local state only for now, Apply button commits them */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <TypeFilterDropdown value={localFilterType} onChange={setLocalFilterType} fullWidth />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <StatusDropdown value={localStatusFilter} onChange={setLocalStatusFilter} fullWidth />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">People</label>
              <QuickFilterDropdown
                items={filteredPeople.map(p => ({ id: p.id, name: p.name, image: p.image_url }))}
                value={localPersonId}
                onValueChange={setLocalPersonId}
                placeholder="People"
                fullWidth
                emptyText="No people found"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Account</label>
              <QuickFilterDropdown
                items={filteredAccounts.map(a => ({ id: a.id, name: a.name, image: a.image_url }))}
                value={localAccountId}
                onValueChange={setLocalAccountId}
                placeholder="Account"
                fullWidth
                emptyText="No accounts found"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Cycle</label>
              <CycleFilterDropdown
                cycles={cycles}
                value={localCycle}
                onChange={setLocalCycle}
                disabled={cycles.length === 0}
                fullWidth
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Date</label>
              <MonthYearPickerV2
                date={localDate}
                dateRange={localDateRange}
                mode={localDateMode}
                // Mobile doesn't use hybrid real-time, just local buffer until Apply
                onDateChange={setLocalDate}
                onRangeChange={setLocalDateRange}
                onModeChange={setLocalDateMode}
                disabledRange={disabledRange}
                availableMonths={availableMonths}
                fullWidth
                locked={!!localCycle}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setMobileFilterOpen(false)}>
              Close
            </Button>
            <Button className="flex-1" onClick={() => {
              handleApplyFilters()
              setMobileFilterOpen(false)
            }}>
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
