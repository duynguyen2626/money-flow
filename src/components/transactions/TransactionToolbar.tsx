'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, Trash2, CheckCircle2, Clock, FilterX } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox' // Assuming generic usage
import { MonthYearPicker } from './MonthYearPicker'
import { cn } from '@/lib/utils'
import { Account, Person } from '@/types/moneyflow.types'
import { DateRange } from 'react-day-picker'

export type FilterType = 'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer' | 'cashback'
export type StatusFilter = 'active' | 'void' | 'pending'

interface TransactionToolbarProps {
    // Data
    accounts: Account[]
    people: Person[]

    // State
    date: Date
    dateRange: DateRange | undefined
    mode: 'month' | 'range'
    onModeChange: (mode: 'month' | 'range') => void
    onDateChange: (date: Date) => void
    onRangeChange: (range: DateRange | undefined) => void

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

    onAdd: () => void
    onAddWithState?: (type: string) => void
    className?: string
}

export function TransactionToolbar({
    accounts,
    people,
    date,
    dateRange,
    mode,
    onModeChange,
    onDateChange,
    onRangeChange,
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
    onAddWithState,
    className
}: TransactionToolbarProps) {

    // Combobox Items
    const accountItems = React.useMemo(() =>
        accounts.map(a => ({
            value: a.id,
            label: a.name,
            icon: a.image_url ? (
                <img
                    src={a.image_url}
                    alt={a.name}
                    className="h-4 w-4 rounded object-contain bg-white"
                />
            ) : undefined
        })),
        [accounts])

    const personItems = React.useMemo(() =>
        people.map(p => ({
            value: p.id,
            label: p.name,
            icon: p.image_url ? (
                <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-4 w-4 rounded-md object-cover"
                />
            ) : undefined
        })),
        [people])

    const filterButtons = [
        { id: 'all', label: 'All', addType: 'expense', colorClass: 'bg-slate-800 text-white hover:bg-slate-700', activeClass: 'ring-2 ring-slate-800 ring-offset-1' },
        { id: 'income', label: 'In', addType: 'income', colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100', activeClass: 'ring-2 ring-emerald-500 ring-offset-1 bg-emerald-100' },
        { id: 'expense', label: 'Out', addType: 'expense', colorClass: 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100', activeClass: 'ring-2 ring-rose-500 ring-offset-1 bg-rose-100' },
        { id: 'lend', label: 'Lend', addType: 'debt', colorClass: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100', activeClass: 'ring-2 ring-amber-500 ring-offset-1 bg-amber-100' },
        { id: 'repay', label: 'Repay', addType: 'repayment', colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100', activeClass: 'ring-2 ring-indigo-500 ring-offset-1 bg-indigo-100' },
    ] as const

    return (
        <div className={cn("flex flex-col gap-2 w-full", className)}>
            <div className="flex flex-wrap items-center gap-2 w-full p-2 bg-background border-b">
                {/* 1. Month Picker */}
                <div className="shrink-0">
                    <MonthYearPicker
                        date={date}
                        dateRange={dateRange}
                        mode={mode}
                        onModeChange={onModeChange}
                        onDateChange={onDateChange}
                        onRangeChange={onRangeChange}
                    />
                </div>

                {/* 2. Filters (Account + People) */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-[140px]">
                        <Combobox
                            items={accountItems}
                            value={accountId}
                            onValueChange={onAccountChange}
                            placeholder="Account"
                            inputPlaceholder="Search account..."
                            className="h-9 text-xs"
                            emptyState="No accounts"
                        />
                    </div>
                    <div className="w-[140px]">
                        <Combobox
                            items={personItems}
                            value={personId}
                            onValueChange={onPersonChange}
                            placeholder="People"
                            inputPlaceholder="Search person..."
                            className="h-9 text-xs"
                            emptyState="No people"
                        />
                    </div>
                </div>

                {/* 3. Search (Flex) - Expanded Width */}
                <div className="relative flex-1 min-w-[200px] shrink-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 pr-8 h-9 text-xs bg-muted/30 w-full"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                            <span className="sr-only">Clear</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    )}
                </div>

                {/* Reset Button */}
                {onReset && (
                    <button
                        onClick={onReset}
                        disabled={!hasActiveFilters}
                        className={cn(
                            "p-2 rounded-md transition-colors shrink-0",
                            hasActiveFilters ? "hover:bg-slate-100 text-slate-600" : "text-slate-300 cursor-not-allowed"
                        )}
                        title="Reset Filters"
                    >
                        <FilterX className="w-5 h-5" />
                    </button>
                )}

                {/* 4. Type Filters (Split Buttons) */}
                <div className="flex items-center gap-1 shrink-0 ml-auto">
                    {filterButtons.map(btn => {
                        const isActive = filterType === btn.id
                        const baseClass = "h-8 flex items-center justify-center transition-all border border-transparent"

                        return (
                            <div
                                key={btn.id}
                                className={cn(
                                    "flex items-center rounded-md overflow-hidden transition-all bg-muted/20 border-border",
                                    isActive ? "shadow-sm ring-1 ring-slate-200" : "hover:bg-muted/40"
                                )}
                            >
                                <button
                                    onClick={() => onFilterChange(btn.id as FilterType)}
                                    className={cn(
                                        baseClass,
                                        "px-2.5 text-xs font-bold rounded-l-md border-r-0",
                                        isActive ? btn.colorClass : "text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {btn.label}
                                </button>
                                <div className={cn("w-[1px] h-4", isActive ? "bg-black/10" : "bg-border")} />
                                <button
                                    onClick={() => onAddWithState?.(btn.addType)}
                                    className={cn(
                                        baseClass,
                                        "px-1.5 rounded-r-md border-l-0",
                                        isActive ? btn.colorClass : "text-muted-foreground hover:bg-muted hover:text-primary"
                                    )}
                                    title={`Add ${btn.label}`}
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )
                    })}
                </div>

                {/* 5. Status & Add */}
                <div className="flex items-center gap-2 shrink-0 pl-2 border-l">
                    {/* Status Toggle */}
                    <div className="flex bg-muted rounded-md p-0.5 gap-0.5">
                        <button
                            onClick={() => onStatusChange('active')}
                            className={cn(
                                "flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded-sm transition-all",
                                statusFilter === 'active'
                                    ? "bg-emerald-100 text-emerald-700 shadow-sm"
                                    : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50/50"
                            )}
                        >
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                        </button>
                        <button
                            onClick={() => onStatusChange('pending')}
                            className={cn(
                                "flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded-sm transition-all",
                                statusFilter === 'pending'
                                    ? "bg-amber-100 text-amber-700 shadow-sm"
                                    : "text-muted-foreground hover:text-amber-600 hover:bg-amber-50/50"
                            )}
                        >
                            <Clock className="h-3 w-3" />
                            Pend
                        </button>
                        <button
                            onClick={() => onStatusChange('void')}
                            className={cn(
                                "flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded-sm transition-all",
                                statusFilter === 'void'
                                    ? "bg-slate-200 text-slate-700 shadow-sm"
                                    : "text-muted-foreground hover:text-slate-700 hover:bg-slate-100"
                            )}
                        >
                            <Trash2 className="h-3 w-3" />
                            Void
                        </button>
                    </div>

                    {/* Add Button */}
                    <Button size="sm" onClick={onAdd} className="h-8 gap-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Add</span>
                    </Button>
                </div>
            </div>
        </div>
    )
}
