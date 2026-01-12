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
import { PaidTransactionsModal } from '@/components/people/paid-transactions-modal'

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

    const resolveTab = (tab: string | null): 'timeline' | 'history' | 'split-bill' => {
        if (tab === 'split-bill') return 'split-bill'
        if (tab === 'history') return 'history'
        if (['active', 'void', 'pending', 'all'].includes(tab || '')) return 'history'
        return 'timeline'
    }

    const initialTab = resolveTab(searchParams.get('tab'))
    const [activeTab, setActiveTab] = useState<'timeline' | 'history' | 'split-bill'>(initialTab)
    const [activeCycleTag, setActiveCycleTag] = useState<string | null>(null)
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'lend' | 'repay' | 'transfer' | 'cashback'>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedYear, setSelectedYear] = useState<string | null>(new Date().getFullYear().toString())
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [showPaidModal, setShowPaidModal] = useState(false)

    // Sync tab with URL
    useEffect(() => {
        const tab = resolveTab(searchParams.get('tab'))
        setActiveTab(tab)
    }, [searchParams])

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
        { id: 'timeline' as const, label: 'Timeline', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'history' as const, label: 'All History', icon: <History className="h-4 w-4" /> },
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
                {activeTab === 'timeline' && (
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
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-10 rounded-full border bg-white px-3 flex items-center gap-1.5 text-sm font-medium transition-all shadow-sm",
                                                selectedYear
                                                    ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                                                    : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                            )}
                                        >
                                            <Filter className="h-3.5 w-3.5" />
                                            <span className="text-xs opacity-40">|</span>
                                            <span className="font-semibold">{selectedYear || 'All Years'}</span>
                                            <span className="opacity-50 text-xs">▼</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56 p-2 rounded-xl" align="start">
                                        <div className="max-h-[300px] overflow-y-auto space-y-1">
                                            <button
                                                className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors", !selectedYear ? "bg-slate-100 font-bold text-slate-900" : "hover:bg-slate-50 text-slate-600")}
                                                onClick={() => { setSelectedYear(null); setIsFilterOpen(false); }}
                                            >
                                                All Years
                                            </button>
                                            <div className="h-px bg-slate-100 my-1" />
                                            {availableYears.map(year => (
                                                <button
                                                    key={year}
                                                    className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors", selectedYear === year ? "bg-blue-50 text-blue-700 font-bold" : "hover:bg-slate-50 text-slate-600")}
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

                                {/* Interactive Stats Bar - Only visible in Timeline */}
                                <div className="flex items-center gap-1">
                                    <SmartFilterBar
                                        transactions={filteredTransactions}
                                        selectedType={filterType}
                                        onSelectType={setFilterType}
                                        onPaidClick={() => setShowPaidModal(true)}
                                        className="overflow-x-auto max-w-full pb-1 md:pb-0"
                                    />
                                </div>

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
                                        activeCycleTag // Use the active cycle tag if selected
                                            ? activeCycleTag
                                            : selectedYear
                                                ? `${selectedYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}` // Fallback if no cycle selected
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
                            </div>
                        </div>


                        {/* Timeline View */}
                        <div className="relative min-h-[500px]">
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
                                activeTag={activeCycleTag}
                                onTagChange={setActiveCycleTag}
                            />
                        </div>
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="flex flex-col space-y-4">
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

            {/* Paid Transactions Modal */}
            <PaidTransactionsModal
                open={showPaidModal}
                onOpenChange={setShowPaidModal}
                transactions={transactions}
                personId={personId}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
            />
        </div>
    )
}
