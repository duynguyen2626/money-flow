'use client'

import { Account, Person } from '@/types/moneyflow.types'
import { MonthYearPickerV2 } from './MonthYearPickerV2'
import { QuickFilterDropdown } from './QuickFilterDropdown'
import { SearchBar } from './SearchBar'
import { TypeFilterDropdown } from './TypeFilterDropdown'
import { StatusDropdown } from './StatusDropdown'
import { AddTransactionDropdown } from './AddTransactionDropdown'
import { FilterX } from 'lucide-react'
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
}: TransactionHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-4 h-14 border-b">
        <h1 className="text-lg font-semibold">Transactions</h1>
        <AddTransactionDropdown onSelect={onAdd} />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        {/* Left: Date + Quick Filters */}
        <div className="flex items-center gap-2 flex-1">
          <MonthYearPickerV2
            date={date}
            dateRange={dateRange}
            mode={dateMode}
            onDateChange={onDateChange}
            onRangeChange={onRangeChange}
            onModeChange={onModeChange}
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

          {/* Reset Button */}
          {hasActiveFilters && onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 px-2 text-muted-foreground hover:text-foreground"
            >
              <FilterX className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Right: Search + Type + Status */}
        <div className="flex items-center gap-2">
          <SearchBar
            value={searchTerm}
            onChange={onSearchChange}
            className="w-[280px]"
          />

          <TypeFilterDropdown
            value={filterType}
            onChange={onFilterChange}
          />

          <StatusDropdown
            value={statusFilter}
            onChange={onStatusChange}
          />
        </div>
      </div>
    </div>
  )
}
