'use client'

import { useState } from 'react'
import { Account, Person } from '@/types/moneyflow.types'
import { MonthYearPickerV2 } from '@/components/transactions-v2/header/MonthYearPickerV2'
import { QuickFilterDropdown } from '@/components/transactions-v2/header/QuickFilterDropdown'
import { SearchBar } from '@/components/transactions-v2/header/SearchBar'
import { TypeFilterDropdown } from '@/components/transactions-v2/header/TypeFilterDropdown'
import { StatusDropdown } from '@/components/transactions-v2/header/StatusDropdown'
import { AddTransactionDropdown } from '@/components/transactions-v2/header/AddTransactionDropdown'
import { CycleFilterDropdown } from '@/components/transactions-v2/header/CycleFilterDropdown'
import { FilterX, ListFilter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DateRange } from 'react-day-picker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type FilterType = 'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer' | 'cashback'
export type StatusFilter = 'active' | 'void' | 'pending'

interface TransactionHeaderProps {
  // Data
  accounts: Account[]
  people: Person[]

  // Date State
  date: Date
  dateRange: DateRange | undefined
  dateMode: 'month' | 'range' | 'date'
  onDateChange: (date: Date) => void
  onRangeChange: (range: DateRange | undefined) => void
  onModeChange: (mode: 'month' | 'range' | 'date') => void

  // Filter State
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
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  const isRangeFilterActive = dateMode === 'range' && !!dateRange && !selectedCycle
  const isCycleDisabled = !accountId || cycles.length === 0 || isRangeFilterActive

  // Desktop filters component
  const DesktopFilters = () => (
    <div className="hidden md:flex items-center gap-2 shrink-0">
      <TypeFilterDropdown
        value={filterType}
        onChange={onFilterChange}
        fullWidth
      />

      <StatusDropdown
        value={statusFilter}
        onChange={onStatusChange}
        fullWidth
      />

      <QuickFilterDropdown
        items={people.map(p => ({
          id: p.id,
          name: p.name,
          image: p.image_url,
        }))}
        value={personId}
        onValueChange={onPersonChange}
        placeholder="People"
        emptyText="No people"
      />

      <QuickFilterDropdown
        items={accounts.map(a => ({
          id: a.id,
          name: a.name,
          image: a.image_url,
        }))}
        value={accountId}
        onValueChange={onAccountChange}
        placeholder="Account"
        emptyText="No accounts"
      />

      <CycleFilterDropdown
        cycles={cycles}
        value={selectedCycle}
        onChange={onCycleChange}
        disabled={cycles.length === 0}
      />

      <MonthYearPickerV2
        date={date}
        dateRange={dateRange}
        mode={dateMode}
        onDateChange={onDateChange}
        onRangeChange={onRangeChange}
        onModeChange={onModeChange}
        disabledRange={disabledRange}
        availableMonths={availableMonths}
        locked={!!selectedCycle}
      />

      {/* Smart Filter/Clear Toggle Button */}
      <Button
        variant={hasActiveFilters ? 'destructive' : 'ghost'}
        size="sm"
        onClick={onReset}
        className={cn(
          "h-9 px-3 gap-1.5 font-medium transition-all",
          hasActiveFilters
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
      >
        {hasActiveFilters ? (
          <>
            <X className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Clear</span>
          </>
        ) : (
          <>
            <ListFilter className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Filter</span>
          </>
        )}
      </Button>
    </div>
  )

  // Mobile filter button
  const MobileFilterButton = () => (
    <Button
      variant={hasActiveFilters ? 'destructive' : 'ghost'}
      size="sm"
      onClick={mobileFilterOpen ? onReset : () => setMobileFilterOpen(true)}
      className={cn(
        "h-9 px-2.5 gap-1 font-medium transition-all shrink-0",
        hasActiveFilters
          ? 'bg-red-100 text-red-700 hover:bg-red-200'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {hasActiveFilters ? (
        <X className="w-4 h-4" />
      ) : (
        <ListFilter className="w-4 h-4" />
      )}
    </Button>
  )

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      {/* Mobile Header: Title + Search + Filter + Add */}
      <div className="md:hidden flex items-center gap-2 px-4 py-3 h-14">
        {/* Search bar - extended */}
        <div className="flex items-center flex-1 min-w-0">
          <SearchBar
            value={searchTerm}
            onChange={onSearchChange}
          />
        </div>

        {/* Filter Button */}
        <MobileFilterButton />

        {/* Add Button */}
        <div className="shrink-0">
          <AddTransactionDropdown onSelect={onAdd} />
        </div>
      </div>

      {/* Desktop Header: Title + Filters + Search + Add */}
      <div className="hidden md:flex items-center gap-2 px-4 py-3">
        {/* Title */}
        <div className="flex items-center gap-2 pr-2 border-r shrink-0">
          <h1 className="text-lg font-semibold leading-none">Transactions</h1>
        </div>

        {/* Desktop Filters */}
        <DesktopFilters />

        {/* Search + Add (responsive) */}
        <div className="flex items-center gap-2 flex-1 ml-2">
          <SearchBar
            value={searchTerm}
            onChange={onSearchChange}
          />
          <AddTransactionDropdown onSelect={onAdd} />
        </div>
      </div>

      {/* Mobile Filter Modal */}
      <Dialog open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <DialogContent className="max-w-full md:max-w-[500px] max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>

          {/* Filter Items */}
          <div className="flex-1 space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <TypeFilterDropdown
                  value={filterType}
                  onChange={onFilterChange}
                  fullWidth
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <StatusDropdown
                  value={statusFilter}
                  onChange={onStatusChange}
                  fullWidth
                />
              </div>
            </div>

            {/* People Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">People</label>
              <QuickFilterDropdown
                items={people.map(p => ({
                  id: p.id,
                  name: p.name,
                  image: p.image_url,
                }))}
                value={personId}
                onValueChange={onPersonChange}
                placeholder="Select people"
                emptyText="No people"
                fullWidth
              />
            </div>

            {/* Account Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Account</label>
              <QuickFilterDropdown
                items={accounts.map(a => ({
                  id: a.id,
                  name: a.name,
                  image: a.image_url,
                }))}
                value={accountId}
                onValueChange={onAccountChange}
                placeholder="Select account"
                emptyText="No accounts"
                fullWidth
              />
            </div>

            {/* Cycle Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Cycle</label>
              <CycleFilterDropdown
                cycles={cycles}
                value={selectedCycle}
                onChange={onCycleChange}
                disabled={cycles.length === 0}
                fullWidth
              />
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Date</label>
              <MonthYearPickerV2
                date={date}
                dateRange={dateRange}
                mode={dateMode}
                onDateChange={onDateChange}
                onRangeChange={onRangeChange}
                onModeChange={onModeChange}
                disabledRange={disabledRange}
                availableMonths={availableMonths}
                fullWidth
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setMobileFilterOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                onReset?.()
                setMobileFilterOpen(false)
              }}
            >
              Clear All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

