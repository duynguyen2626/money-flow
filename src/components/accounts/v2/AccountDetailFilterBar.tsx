'use client'

import { Account, Person } from '@/types/moneyflow.types'
import { MonthYearPickerV2 } from '@/components/transactions-v2/header/MonthYearPickerV2'
import { TypeFilterDropdown } from '@/components/transactions-v2/header/TypeFilterDropdown'
import { StatusDropdown } from '@/components/transactions-v2/header/StatusDropdown'
import { AccountDetailAddDropdown } from '@/components/accounts/v2/AccountDetailAddDropdown'
import { FilterX, Search, User, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateRange } from 'react-day-picker'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
    SelectSeparator
} from '@/components/ui/select-shadcn'

export type FilterType = 'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer' | 'cashback'
export type StatusFilter = 'active' | 'void' | 'pending'

interface AccountDetailFilterBarProps {
    // Data
    account: Account // The current account being viewed
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

    // Cycle Filter (cycles array passed to MonthYearPickerV2 for smart auto-set)
    cycles: { label: string; value: string }[]
    disabledRange?: { start: Date; end: Date } | undefined

    // Available months for constraints
    availableMonths?: Set<string>

    // Dynamic Filter Options
    availableAccountIds?: Set<string>
    availablePersonIds?: Set<string>
}

export function AccountDetailFilterBar({
    account,
    accounts,
    people,
    date,
    dateRange,
    dateMode,
    onDateChange,
    onRangeChange,
    onModeChange,
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
    disabledRange,
    availableMonths,
    availableAccountIds,
    availablePersonIds
}: AccountDetailFilterBarProps) {
    // Filter available options
    const filteredAccounts = accounts.filter(a => !availableAccountIds || availableAccountIds.has(a.id))
    const filteredPeople = people.filter(p => !availablePersonIds || availablePersonIds.has(p.id))

    // Determine selected flow value (account or person)
    const selectedFlowValue = personId ? `person-${personId}` : undefined

    const handleFlowChange = (value: string) => {
        if (value === 'all') {
            onPersonChange(undefined)
        } else if (value.startsWith('person-')) {
            const id = value.replace('person-', '')
            onPersonChange(id)
        }
    }

    return (
        <div className="flex items-center gap-2 flex-1">
            {/* Flow Filter (People + Accounts merged) */}
            <Select value={selectedFlowValue || 'all'} onValueChange={handleFlowChange}>
                <SelectTrigger className="h-9 w-[180px] border-slate-200">
                    <SelectValue placeholder="All Flow" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Flow</SelectItem>

                    {filteredAccounts.length > 0 && (
                        <>
                            <SelectSeparator />
                            <SelectGroup>
                                <SelectLabel className="flex items-center gap-1.5 text-xs">
                                    <Building2 className="h-3 w-3" />
                                    Accounts
                                </SelectLabel>
                                {filteredAccounts.map(account => (
                                    <SelectItem key={`account-${account.id}`} value={`account-${account.id}`}>
                                        <div className="flex items-center gap-2">
                                            {account.image_url && (
                                                <img src={account.image_url} alt="" className="h-4 w-4 rounded-sm object-contain" />
                                            )}
                                            <span>{account.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </>
                    )}

                    {filteredPeople.length > 0 && (
                        <>
                            <SelectSeparator />
                            <SelectGroup>
                                <SelectLabel className="flex items-center gap-1.5 text-xs">
                                    <User className="h-3 w-3" />
                                    People
                                </SelectLabel>
                                {filteredPeople.map(person => (
                                    <SelectItem key={`person-${person.id}`} value={`person-${person.id}`}>
                                        <div className="flex items-center gap-2">
                                            {person.image_url && (
                                                <img src={person.image_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                                            )}
                                            <span>{person.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </>
                    )}
                </SelectContent>
            </Select>

            {/* Type Filter */}
            <TypeFilterDropdown
                value={filterType}
                onChange={onFilterChange}
            />

            {/* Status Filter */}
            <StatusDropdown
                value={statusFilter}
                onChange={onStatusChange}
            />

            {/* Date Picker with Smart Cycle Auto-set */}
            <MonthYearPickerV2
                date={date}
                dateRange={dateRange}
                mode={dateMode}
                onDateChange={onDateChange}
                onRangeChange={onRangeChange}
                onModeChange={onModeChange}
                disabledRange={disabledRange}
                availableMonths={availableMonths}
                accountCycleTags={cycles.map(c => c.value)}
            />

            {/* Search */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    type="text"
                    placeholder="Search by notes or ID..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="h-9 pl-9 pr-3 border-slate-200"
                />
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReset}
                    className="h-9 px-3 text-slate-600 hover:text-slate-900"
                >
                    <FilterX className="h-4 w-4 mr-1.5" />
                    Reset
                </Button>
            )}

            {/* Add Transaction Dropdown */}
            <AccountDetailAddDropdown
                account={account}
                onSelect={onAdd}
            />
        </div>
    )
}
