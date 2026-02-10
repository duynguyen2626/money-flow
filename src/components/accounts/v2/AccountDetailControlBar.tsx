"use client"

import React from 'react'
import {
    Plus,
    Minus,
    ArrowLeftRight,
    User,
    Zap,
    Clock4,
    Loader2,
    CreditCard
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'
import { AccountDetailFilterBar, FilterType, StatusFilter } from '@/components/accounts/v2/AccountDetailFilterBar'
import { DateRange } from 'react-day-picker'

interface AccountDetailControlBarProps {
    account: Account
    allAccounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]

    // Filter State
    searchTerm: string
    onSearchChange: (value: string) => void
    filterType: FilterType
    onFilterChange: (type: FilterType) => void
    statusFilter: StatusFilter
    onStatusChange: (status: StatusFilter) => void
    selectedPersonId?: string
    onPersonChange: (id: string | undefined) => void

    // Date State
    date: Date
    dateRange: DateRange | undefined
    dateMode: 'all' | 'date' | 'month' | 'range' | 'year'
    onDateChange: (date: Date) => void
    onRangeChange: (range: DateRange | undefined) => void
    onModeChange: (mode: 'all' | 'date' | 'month' | 'range' | 'year') => void

    // Cycle State (cycles passed to MonthYearPickerV2 for smart auto-set)
    cycles: { label: string; value: string }[]

    // Filter Control
    hasActiveFilters?: boolean
    onReset?: () => void

    // Batch/Pending
    pendingTotal: number
    isConfirmingPending: boolean
    onConfirmPending: () => void
    transactionCount: number
}

const numberFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

export function AccountDetailControlBar({
    account,
    allAccounts,
    categories,
    people,
    shops,
    searchTerm,
    onSearchChange,
    filterType,
    onFilterChange,
    statusFilter,
    onStatusChange,
    selectedPersonId,
    onPersonChange,
    date,
    dateRange,
    dateMode,
    onDateChange,
    onRangeChange,
    onModeChange,
    cycles,
    hasActiveFilters,
    onReset,
    pendingTotal,
    isConfirmingPending,
    onConfirmPending,
    transactionCount
}: AccountDetailControlBarProps) {
    const [transactionSlideOpen, setTransactionSlideOpen] = React.useState(false)
    const [transactionSlideInitialData, setTransactionSlideInitialData] = React.useState<any>({})

    const openTransactionSlide = (data: any) => {
        setTransactionSlideInitialData(data)
        setTransactionSlideOpen(true)
    }

    const isCreditCard = account.type === 'credit_card'

    // Custom "Add" handler that opens the transaction slide
    const handleAdd = (type?: string) => {
        if (type === 'pay-card') {
            // For credit cards, "Pay Card" is a credit_pay transaction
            openTransactionSlide({
                source_account_id: account.id,
                type: 'credit_pay'
            })
        } else if (type) {
            openTransactionSlide({ source_account_id: account.id, type })
        } else {
            openTransactionSlide({ source_account_id: account.id })
        }
    }

    return (
        <div className="flex flex-col gap-0">
            <TransactionSlideV2
                open={transactionSlideOpen}
                onOpenChange={setTransactionSlideOpen}
                initialData={transactionSlideInitialData}
                accounts={allAccounts}
                categories={categories}
                people={people}
                shops={shops}
            />

            {/* Unified Filter Header - Account Context (No Account Selector) */}
            <div className="bg-white border-b border-slate-200">
                <div className="px-4 py-3">
                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-center gap-2">
                        {/* Pending Batch Indicator */}
                        {pendingTotal > 0 && (
                            <button
                                onClick={onConfirmPending}
                                disabled={isConfirmingPending}
                                className="flex items-center gap-1.5 h-9 px-3 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 rounded-md text-xs font-bold transition-all animate-pulse shrink-0"
                            >
                                {isConfirmingPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock4 className="h-3.5 w-3.5" />}
                                {numberFormatter.format(pendingTotal)} Pending
                            </button>
                        )}

                        {/* Filters - Using custom AccountDetailFilterBar */}
                        <AccountDetailFilterBar
                            account={account}
                            accounts={[]} // Hide account selector since we're in account context
                            people={people}
                            date={date}
                            dateRange={dateRange}
                            dateMode={dateMode}
                            onDateChange={onDateChange}
                            onRangeChange={onRangeChange}
                            onModeChange={onModeChange}
                            personId={selectedPersonId}
                            onPersonChange={onPersonChange}
                            searchTerm={searchTerm}
                            onSearchChange={onSearchChange}
                            filterType={filterType}
                            onFilterChange={onFilterChange}
                            statusFilter={statusFilter}
                            onStatusChange={onStatusChange}
                            hasActiveFilters={hasActiveFilters}
                            onReset={onReset}
                            onAdd={handleAdd}
                            cycles={cycles}
                        />
                    </div>

                    {/* Mobile Layout */}
                    <div className="md:hidden">
                        <AccountDetailFilterBar
                            account={account}
                            accounts={[]} // Hide account selector
                            people={people}
                            date={date}
                            dateRange={dateRange}
                            dateMode={dateMode}
                            onDateChange={onDateChange}
                            onRangeChange={onRangeChange}
                            onModeChange={onModeChange}
                            personId={selectedPersonId}
                            onPersonChange={onPersonChange}
                            searchTerm={searchTerm}
                            onSearchChange={onSearchChange}
                            filterType={filterType}
                            onFilterChange={onFilterChange}
                            statusFilter={statusFilter}
                            onStatusChange={onStatusChange}
                            hasActiveFilters={hasActiveFilters}
                            onReset={onReset}
                            onAdd={handleAdd}
                            cycles={cycles}
                        />
                    </div>
                </div>
            </div>

        </div>
    )
}
