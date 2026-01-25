'use client'

import { Account, Person } from '@/types/moneyflow.types'
import { MonthYearPickerV2 } from './MonthYearPickerV2'
import { QuickFilterDropdown } from './QuickFilterDropdown'
import { SearchBar } from './SearchBar'
import { TypeFilterDropdown } from './TypeFilterDropdown'
import { StatusDropdown } from './StatusDropdown'
import { AddTransactionDropdown } from './AddTransactionDropdown'
import { CycleFilterDropdown } from './CycleFilterDropdown'
import { FilterX, ListFilter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DateRange } from 'react-day-picker'

export type FilterType = 'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer' | 'cashback'
export type StatusFilter = 'active' | 'void' | 'pending'

interface TransactionHeaderProps {
  // Data
  accounts: Account[]
  people: Person[]

  // Date State
  date: Date
  dateRange: DateRange | undefined
  dateMode: 'month' | 'range'
  onDateChange: (date: Date) => void
  onRangeChange: (range: DateRange | undefined) => void
  onModeChange: (mode: 'month' | 'range') => void

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
}: TransactionHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      {/* Unified Bar: title + filters + search + add */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {/* Title */}
        <div className="flex items-center gap-2 pr-2 border-r">
          <h1 className="text-lg font-semibold leading-none">Transactions</h1>
        </div>

        {/* Filters cluster */}
        <div className="flex items-center gap-2 flex-wrap">
          <TypeFilterDropdown
            value={filterType}
            onChange={onFilterChange}
          />

          <StatusDropdown
            value={statusFilter}
            onChange={onStatusChange}
          />

          <QuickFilterDropdown
            items={people.map(p => ({
              id: p.id,
              name: p.name,
              image: p.image_url,
              icon: 'person',
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
              icon: 'account',
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
          />

          {/* Reset Button (always visible, disabled state) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={!hasActiveFilters}
            className={cn(
              "h-9 px-2 text-muted-foreground hover:text-foreground",
              !hasActiveFilters && "opacity-50"
            )}
          >
            <FilterX className="w-4 h-4" />
          </Button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search + Add */}
        <div className="flex items-center gap-2">
          <SearchBar
            value={searchTerm}
            onChange={onSearchChange}
            className="w-[320px]"
          />
          <AddTransactionDropdown onSelect={onAdd} />
        </div>
      </div>
    </div>
  )
}
