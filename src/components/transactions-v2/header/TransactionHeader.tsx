'use client'

import { useState, useEffect } from 'react'
import { Account, Person } from '@/types/moneyflow.types'
import { MonthYearPickerV2 } from '@/components/transactions-v2/header/MonthYearPickerV2'
import { QuickFilterDropdown } from '@/components/transactions-v2/header/QuickFilterDropdown'
import { TypeFilterDropdown } from '@/components/transactions-v2/header/TypeFilterDropdown'
import { StatusDropdown } from '@/components/transactions-v2/header/StatusDropdown'
import { AddTransactionDropdown } from '@/components/transactions-v2/header/AddTransactionDropdown'
import { CycleFilterDropdown } from '@/components/transactions-v2/header/CycleFilterDropdown'
import { FilterX, ListFilter, X, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { DateRange } from 'react-day-picker'
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
  dateMode: 'month' | 'range' | 'date'
  onDateChange: (date: Date) => void
  onRangeChange: (range: DateRange | undefined) => void
  onModeChange: (mode: 'month' | 'range' | 'date') => void

  // Filter State (Parent)
  accountId?: string
  onAccountChange: (id: string | undefined) => void

  personId?: string
  onPersonChange: (id: string | undefined) => void

  searchTerm: string
  onSearchChange: (val: string) => void

  filterType: FilterType
  onFilterChange: (type: FilterType) => void

  statusFilter: StatusFilter
  onStatusChange: (status: StatusFilter) => void

  hasActiveFilters?: boolean
  onReset?: () => void

  // Actions
  onAdd: (type?: string) => void

  // Cycle Filter
  cycles: { label: string; value: string }[]
  selectedCycle?: string
  onCycleChange: (cycle?: string) => void
  disabledRange?: { start: Date; end: Date } | undefined

  // Available months for constraints
  availableMonths?: Set<string>
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
  searchTerm,
  onSearchChange,
  filterType,
  onFilterChange,
  statusFilter,
  onStatusChange,
  hasActiveFilters,
  onReset,
  onAdd,
  cycles,
  selectedCycle,
  onCycleChange,
  disabledRange,
  availableMonths,
}: TransactionHeaderProps) {
  // Local State Buffer
  const [localAccountId, setLocalAccountId] = useState(accountId)
  const [localPersonId, setLocalPersonId] = useState(personId)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [localFilterType, setLocalFilterType] = useState(filterType)
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilter)
  const [localCycle, setLocalCycle] = useState(selectedCycle)

  // Date State Buffer
  const [localDate, setLocalDate] = useState(date)
  const [localDateRange, setLocalDateRange] = useState(dateRange)
  const [localDateMode, setLocalDateMode] = useState(dateMode)

  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  // Sync props to local state when they change externally (or after apply)
  useEffect(() => {
    setLocalAccountId(accountId)
    setLocalPersonId(personId)
    setLocalSearchTerm(searchTerm)
    setLocalFilterType(filterType)
    setLocalStatusFilter(statusFilter)
    setLocalCycle(selectedCycle)
    setLocalDate(date)
    setLocalDateRange(dateRange)
    setLocalDateMode(dateMode)
  }, [
    accountId, personId, searchTerm, filterType, statusFilter,
    selectedCycle, date, dateRange, dateMode
  ])

  const isRangeFilterActive = localDateMode === 'range' && !!localDateRange && !localCycle
  const isCycleDisabled = !localAccountId || cycles.length === 0 || isRangeFilterActive

  // Apply Handlers
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
      <TypeFilterDropdown
        value={localFilterType}
        onChange={setLocalFilterType}
        fullWidth
      />

      <StatusDropdown
        value={localStatusFilter}
        onChange={setLocalStatusFilter}
        fullWidth
      />

      <QuickFilterDropdown
        items={people.map(p => ({
          id: p.id,
          name: p.name,
          image: p.image_url,
        }))}
        value={localPersonId}
        onValueChange={setLocalPersonId}
        placeholder="People"
        emptyText="No people"
      />

      <QuickFilterDropdown
        items={accounts.map(a => ({
          id: a.id,
          name: a.name,
          image: a.image_url,
        }))}
        value={localAccountId}
        onValueChange={setLocalAccountId}
        placeholder="Account"
        emptyText="No accounts"
      />

      <CycleFilterDropdown
        cycles={cycles}
        value={localCycle}
        onChange={setLocalCycle}
        disabled={cycles.length === 0}
      />

      <MonthYearPickerV2
        date={localDate}
        dateRange={localDateRange}
        mode={localDateMode}
        onDateChange={setLocalDate}
        onRangeChange={setLocalDateRange}
        onModeChange={setLocalDateMode}
        disabledRange={disabledRange}
        availableMonths={availableMonths}
        locked={!!localCycle}
      />

      {/* Filter Action Button */}
      <Button
        variant={hasActiveFilters ? 'destructive' : 'default'}
        size="sm"
        onClick={() => {
          if (hasActiveFilters) {
            setConfirmClearOpen(true)
          } else {
            handleApplyFilters()
          }
        }}
        className={cn(
          "h-9 px-3 gap-1.5 font-medium transition-all min-w-[90px]",
          hasActiveFilters ? "" : "bg-primary text-primary-foreground"
        )}
      >
        {hasActiveFilters ? (
          <>
            <X className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Clear</span>
          </>
        ) : (
          <>
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Filter</span>
          </>
        )}
      </Button>
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
        <div className="flex items-center gap-2 pr-2 border-r shrink-0">
          <h1 className="text-lg font-semibold leading-none">Transactions</h1>
        </div>

        <DesktopFilters />

        <div className="flex items-center gap-2 flex-1 ml-2 relative">
          <div className="relative flex-1 max-w-sm">
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
            {/* Same fields as desktop but vertical */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <TypeFilterDropdown value={localFilterType} onChange={setLocalFilterType} fullWidth />
            </div>
            {/* ... (Repeat other fields similarly using local state) ... */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Account</label>
              <QuickFilterDropdown
                items={accounts.map(a => ({ id: a.id, name: a.name, image: a.image_url }))}
                value={localAccountId}
                onValueChange={setLocalAccountId}
                placeholder="Account"
                fullWidth
              />
            </div>
            {/* Add other mobile fields if needed for completeness */}
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
