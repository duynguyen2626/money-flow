'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Link as LinkIcon, History, DollarSign, Filter, UserMinus, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Account, Category, Person, PersonCycleSheet, Shop } from '@/types/moneyflow.types'
import { SmartFilterBar } from '@/components/moneyflow/smart-filter-bar'
import { DebtCycleList } from '@/components/moneyflow/debt-cycle-list'
import { SplitBillManager } from '@/components/people/split-bill-manager'
import { ManageSheetButton } from '@/components/people/manage-sheet-button'
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { isYYYYMM, normalizeMonthTag } from '@/lib/month-tag'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'

interface PersonDetailTabsProps {
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    personId: string
    sheetProfileId: string
    sheetLink?: string | null
    googleSheetUrl?: string | null
    sheetFullImg?: string | null
    showBankAccount?: boolean
    showQrImage?: boolean
    transactions: any[]
    cycleSheets?: PersonCycleSheet[]
    debtTags?: any[]
}

export function PersonDetailTabs({
    accounts,
    categories,
    people,
    shops,
    personId,
    sheetProfileId,
    sheetLink,
    googleSheetUrl,
    sheetFullImg,
    showBankAccount = false,
    showQrImage = false,
    transactions,
    cycleSheets = [],
    debtTags = [],
}: PersonDetailTabsProps) {
    const searchParams = useSearchParams()

    const resolveTab = (tab: string | null): 'details' | 'active' | 'void' | 'pending' | 'split-bill' => {
        if (tab === 'split-bill') return 'split-bill'
        if (tab === 'active') return 'active'
        if (tab === 'void') return 'void'
        if (tab === 'pending') return 'pending'
        return 'details'
    }

    const initialTab = resolveTab(searchParams.get('tab'))
    const [activeTab, setActiveTab] = useState<'details' | 'active' | 'void' | 'pending' | 'split-bill'>(initialTab)
    const [viewMode, setViewMode] = useState<'timeline' | 'all'>('timeline')
    const [isLoadingMode, setIsLoadingMode] = useState(false)
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer' | 'cashback'>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedYear, setSelectedYear] = useState<string | null>(null)
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    // Sync tab with URL
    useEffect(() => {
        const tab = resolveTab(searchParams.get('tab'))
        setActiveTab(tab)
    }, [searchParams])

    const handleModeChange = async (mode: 'timeline' | 'all') => {
        setIsLoadingMode(true)
        setViewMode(mode)
        await new Promise(resolve => setTimeout(resolve, 300))
        setIsLoadingMode(false)
    }

    const person = people.find(p => p.id === personId) || ({} as Person)

    const yearsWithDebt = useMemo(() => {
        const years = new Set<string>()
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [] // Avoid server checks (hacky)
        // Usually calculated from transactions?
        // Reuse logic from previous if available or debtTags?
        // previous logic used transactions.
        const debts = transactions.filter(t => t.type === 'debt' && (Number(t.amount) < 0 || (t.final_price !== null && Number(t.final_price) !== 0)))
        debts.forEach(t => {
            const tag = normalizeMonthTag(t.tag || '') || ''
            if (isYYYYMM(tag)) {
                years.add(tag.split('-')[0])
            }
        })
        return Array.from(years)
    }, [transactions])

    const availableYears = useMemo(() => {
        const years = new Set<string>()
        transactions.forEach(txn => {
            const normalizedTag = normalizeMonthTag(txn.tag || '')
            const tag = normalizedTag?.trim() ? normalizedTag.trim() : (txn.tag?.trim() || '')
            if (isYYYYMM(tag)) {
                years.add(tag.split('-')[0])
            } else if (tag) {
                years.add('Other')
            }
        })
        const currentYear = new Date().getFullYear().toString()
        years.add(currentYear)
        return Array.from(years).sort().reverse()
    }, [transactions])

    // Filter transactions for SmartFilterBar stats to reflect selected timeline AND search
    const filteredTransactions = useMemo(() => {
        let result = transactions

        // 1. Year Filter
        if (selectedYear) {
            result = result.filter(txn => {
                const normalizedTag = normalizeMonthTag(txn.tag)
                const tag = normalizedTag?.trim() ? normalizedTag.trim() : (txn.tag?.trim() || '')
                const year = isYYYYMM(tag) ? tag.split('-')[0] : 'Other'
                return year === selectedYear
            })
        }

        // 2. Search Filter (Syncs Stats with Search)
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase()
            result = result.filter(txn => {
                const note = txn.note?.toLowerCase() || ''
                const amount = txn.amount?.toString() || ''
                const id = txn.id?.toLowerCase() || '' // Added ID search
                return note.includes(lower) || amount.includes(lower) || id.includes(lower)
            })
        }

        return result
    }, [transactions, selectedYear, searchTerm])

    const tabs = [
        { id: 'details' as const, label: 'Details', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'active' as const, label: 'Active', icon: <History className="h-4 w-4" /> },
        { id: 'void' as const, label: 'Void', icon: <History className="h-4 w-4" /> },
        { id: 'pending' as const, label: 'Pending', icon: <History className="h-4 w-4" /> },
        { id: 'split-bill' as const, label: 'Split Bill', icon: <DollarSign className="h-4 w-4" /> },
    ]

    return (
        <div className="flex flex-col w-full h-full space-y-4">
            {/* Tab Header */}
            <div className="flex-none flex border-b border-slate-200 overflow-x-auto bg-white px-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                            activeTab === tab.id
                                ? "border-slate-900 text-slate-900"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300",
                            tab.id === 'split-bill' && "ml-auto"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="px-4 pb-8 flex-1">
                {activeTab === 'details' && (
                    <div className="flex flex-col space-y-4">
                        {/* Unified Header: Search | Filter | Stats | Actions */}
                        <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">

                            {/* Left: Search & Year Filter */}
                            <div className="flex items-center gap-2 w-full xl:w-auto flex-1 min-w-0">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search transactions..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="pl-9 h-9 bg-slate-50 border-slate-200"
                                    />
                                </div>

                                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className={cn("h-9 border-slate-200 bg-slate-50 min-w-[100px]", selectedYear && "bg-blue-50 border-blue-200 text-blue-700")}>
                                            <Filter className="h-4 w-4 mr-2" />
                                            {selectedYear || 'All Years'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-40 p-0" align="start">
                                        <div className="max-h-[300px] overflow-y-auto">
                                            <button
                                                className={cn("w-full text-left px-4 py-2 text-sm hover:bg-slate-50", !selectedYear && "bg-slate-100 font-medium")}
                                                onClick={() => { setSelectedYear(null); setIsFilterOpen(false); }}
                                            >
                                                All Years
                                            </button>
                                            {availableYears.map(year => (
                                                <button
                                                    key={year}
                                                    className={cn("w-full text-left px-4 py-2 text-sm hover:bg-slate-50", selectedYear === year && "bg-blue-50 text-blue-700 font-medium")}
                                                    onClick={() => { setSelectedYear(year); setIsFilterOpen(false); }}
                                                >
                                                    {year}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {/* Debt Warning Badge */}
                                {yearsWithDebt.length > 0 && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700 whitespace-nowrap">
                                        <span className="text-amber-500">⚠️</span>
                                        {yearsWithDebt.length > 0 && selectedYear && yearsWithDebt.includes(selectedYear)
                                            ? <span>Unpaid debts in {selectedYear}</span>
                                            : <span>{yearsWithDebt.length} year{yearsWithDebt.length > 1 ? 's' : ''} with debt</span>
                                        }
                                    </div>
                                )}
                            </div>

                            {/* Right: Stats & Actions */}
                            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">

                                {/* Stats Bar - Only visible in Timeline */}
                                {viewMode === 'timeline' && (
                                    <SmartFilterBar
                                        transactions={filteredTransactions}
                                        selectedType={filterType}
                                        onSelectType={setFilterType}
                                        className="overflow-x-auto max-w-full pb-1 md:pb-0"
                                    />
                                )}

                                <div className="h-6 w-px bg-slate-200 hidden xl:block" />

                                {/* Debt Actions */}
                                <div className="flex items-center gap-2">
                                    <AddTransactionDialog
                                        accounts={accounts}
                                        categories={categories}
                                        people={people}
                                        shops={shops}
                                        defaultType="debt"
                                        defaultPersonId={personId}
                                        asChild
                                        triggerContent={
                                            <Button variant="outline" size="sm" className="h-9 text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300">
                                                <UserMinus className="h-3 w-3 mr-1" />Debt
                                            </Button>
                                        }
                                    />
                                    <AddTransactionDialog
                                        accounts={accounts}
                                        categories={categories}
                                        people={people}
                                        shops={shops}
                                        defaultType="repayment"
                                        defaultPersonId={personId}
                                        asChild
                                        triggerContent={
                                            <Button variant="outline" size="sm" className="h-9 text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-300">
                                                <Plus className="h-3 w-3 mr-1" />Repay
                                            </Button>
                                        }
                                    />
                                </div>

                                <div className="h-6 w-px bg-slate-200 hidden xl:block" />

                                {/* Manage Sheet */}
                                <ManageSheetButton
                                    personId={personId}
                                    cycleTag={
                                        selectedYear
                                            ? `${selectedYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
                                            : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
                                    }
                                    scriptLink={sheetLink}
                                    googleSheetUrl={googleSheetUrl}
                                    sheetFullImg={sheetFullImg}
                                    showBankAccount={showBankAccount}
                                    showQrImage={showQrImage}
                                    buttonClassName="h-9 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300"
                                    size="sm"
                                    showCycleAction={true}
                                />

                                {/* View Toggle */}
                                <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-100 gap-1 h-9 items-center">
                                    <button
                                        onClick={() => handleModeChange('timeline')}
                                        className={cn(
                                            "px-3 py-1 rounded text-xs font-medium transition-all",
                                            viewMode === 'timeline' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                        )}
                                    >
                                        Timeline
                                    </button>
                                    <button
                                        onClick={() => handleModeChange('all')}
                                        className={cn(
                                            "px-3 py-1 rounded text-xs font-medium transition-all",
                                            viewMode === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                        )}
                                    >
                                        All
                                    </button>
                                </div>
                            </div>
                        </div>


                        {/* Main View */}
                        <div className="relative min-h-[500px]">
                            {isLoadingMode ? (
                                <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center backdrop-blur-sm">
                                    <div className="animate-spin h-8 w-8 border-4 border-slate-200 border-t-slate-600 rounded-full" />
                                </div>
                            ) : viewMode === 'timeline' ? (
                                <DebtCycleList
                                    transactions={transactions}
                                    accounts={accounts}
                                    categories={categories}
                                    people={people}
                                    shops={shops}
                                    personId={personId}
                                    sheetProfileId={sheetProfileId}
                                    cycleSheets={cycleSheets}
                                    filterType={filterType}
                                    searchTerm={searchTerm}
                                    debtTags={debtTags}
                                    selectedYear={selectedYear}
                                    onYearChange={setSelectedYear}
                                />
                            ) : (
                                <FilterableTransactions
                                    transactions={filteredTransactions}
                                    accounts={accounts}
                                    categories={categories}
                                    people={people}
                                    shops={shops}
                                    context="person"
                                    contextId={personId}
                                    variant="embedded"
                                    hidePeopleColumn={true}
                                    searchTerm={searchTerm}
                                    onSearchChange={setSearchTerm}
                                    hideTypeFilters={true}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Active Tab */}
                {activeTab === 'active' && (
                    <div className="flex flex-col space-y-4">
                        <FilterableTransactions
                            transactions={filteredTransactions.filter(t => t.status === 'posted')}
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            context="person"
                            contextId={personId}
                            variant="embedded"
                            hidePeopleColumn={true}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            hideStatusTabs={true}
                            hideTypeFilters={true}
                        />
                    </div>
                )}

                {/* Void Tab */}
                {activeTab === 'void' && (
                    <div className="flex flex-col space-y-4">
                        <FilterableTransactions
                            transactions={filteredTransactions.filter(t => t.status === 'void')}
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            context="person"
                            contextId={personId}
                            variant="embedded"
                            hidePeopleColumn={true}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            hideStatusTabs={true}
                            hideTypeFilters={true}
                        />
                    </div>
                )}

                {/* Pending Tab */}
                {activeTab === 'pending' && (
                    <div className="flex flex-col space-y-4">
                        <FilterableTransactions
                            transactions={filteredTransactions.filter(t => t.status === 'pending')}
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            context="person"
                            contextId={personId}
                            variant="embedded"
                            hidePeopleColumn={true}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            hideStatusTabs={true}
                            hideTypeFilters={true}
                        />
                    </div>
                )}

                {activeTab === 'split-bill' && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden p-4">
                        <SplitBillManager
                            transactions={transactions}
                            personId={personId}
                            people={people}
                            accounts={accounts}
                            categories={categories}
                            shops={shops}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
