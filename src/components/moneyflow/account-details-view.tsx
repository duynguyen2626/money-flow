'use client'

import { useState, useMemo, useCallback } from 'react'
import { Account, Category, Person, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { UnifiedTransactionTable } from './unified-transaction-table'
import { FilterIcon, X } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { useTagFilter } from '@/context/tag-filter-context'
import { AccountSpendingStats } from '@/types/cashback.types'
import { AccountDetailHeader } from './account-detail-header'

type AccountDetailsViewProps = {
    account: Account
    transactions: TransactionWithDetails[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
    batchStats?: { waiting: number; confirmed: number }
    cashbackStats?: AccountSpendingStats | null
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

type SortKey = 'date' | 'amount'
type SortDir = 'asc' | 'desc'

type BulkActionState = {
    selectionCount: number
    currentTab: 'active' | 'void' | 'pending'
    onVoidSelected: () => Promise<void> | void
    onRestoreSelected: () => Promise<void> | void
    onDeleteSelected: () => Promise<void> | void
    isVoiding: boolean
    isRestoring: boolean
    isDeleting: boolean
}

export function AccountDetailsView({
    account,
    transactions,
    accounts,
    categories,
    people,
    shops,
    batchStats,
    cashbackStats,
}: AccountDetailsViewProps) {
    const isCreditCard = account.type === 'credit_card'

    // --- Filter Logic (Adapted from FilterableTransactions) ---
    const { selectedTag, setSelectedTag } = useTagFilter()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedTxnIds, setSelectedTxnIds] = useState(new Set<string>())
    const [showSelectedOnly, setShowSelectedOnly] = useState(false)
    const [showFilterMenu, setShowFilterMenu] = useState(false)
    const currentYear = String(new Date().getFullYear())
    const [selectedYear, setSelectedYear] = useState<string>('')
    const [selectedCycle, setSelectedCycle] = useState<string | null>(null)
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'active' | 'void' | 'pending'>('active')
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
    const [bulkActions, setBulkActions] = useState<BulkActionState | null>(null)
    const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense' | 'lend' | 'repay'>('all')
    const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir }>({ key: 'date', dir: 'desc' })

    const handleBulkActionStateChange = useCallback((next: BulkActionState) => {
        setBulkActions(next)
    }, [])

    // ... Helper functions for filters ...
    const categoryById = useMemo(() => {
        const map = new Map<string, Category>()
        categories.forEach(cat => map.set(cat.id, cat))
        return map
    }, [categories])

    const parentLookup = useMemo(() => {
        const map = new Map<string, string | undefined>()
        categories.forEach(cat => {
            map.set(cat.id, cat.parent_id ?? undefined)
        })
        return map
    }, [categories])

    const topLevelCategories = useMemo(
        () => categories.filter(cat => !cat.parent_id),
        [categories]
    )

    const availableSubcategories = useMemo(
        () => categories.filter(cat => cat.parent_id === selectedCategoryId),
        [categories, selectedCategoryId]
    )

    const availableYears = useMemo(() => {
        const years = new Set<string>([currentYear])
        transactions.forEach(txn => {
            const rawDate = txn.occurred_at ?? (txn as { created_at?: string }).created_at
            const parsed = rawDate ? new Date(rawDate) : null
            if (parsed && !Number.isNaN(parsed.getTime())) {
                years.add(String(parsed.getFullYear()))
            }
        })
        return Array.from(years).sort((a, b) => Number(b) - Number(a))
    }, [currentYear, transactions])

    const filteredByYear = useMemo(() => {
        if (!selectedYear) return transactions
        return transactions.filter(txn => {
            const rawDate = txn.occurred_at ?? (txn as { created_at?: string }).created_at
            const parsed = rawDate ? new Date(rawDate) : null
            if (!parsed || Number.isNaN(parsed.getTime())) {
                return false
            }
            return String(parsed.getFullYear()) === selectedYear
        })
    }, [selectedYear, transactions])

    const formatCycleLabel = (value: string | null | undefined) => {
        if (!value) return 'UNTAGGED'
        const monthNameMatch = value.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
        if (monthNameMatch) {
            return value
        }
        return value
    }

    const getDisplayTag = (txn: TransactionWithDetails) => {
        if (isCreditCard) {
            const persisted = txn.persisted_cycle_tag ?? txn.tag
            if (persisted) return persisted
            const rawDate = txn.occurred_at ?? (txn as { created_at?: string }).created_at
            const parsed = rawDate ? new Date(rawDate) : null
            if (parsed && !Number.isNaN(parsed.getTime())) {
                const month = String(parsed.getMonth() + 1).padStart(2, '0')
                return `${parsed.getFullYear()}-${month}`
            }
        }
        return txn.tag || 'UNTAGGED'
    }

    const tagMeta = useMemo(() => {
        const map = new Map<string, { tag: string; last: number }>()
        filteredByYear.forEach(txn => {
            const tag = getDisplayTag(txn)
            const ts = new Date(txn.occurred_at ?? txn.created_at ?? Date.now()).getTime()
            const prev = map.get(tag)
            if (!prev || ts > prev.last) {
                map.set(tag, { tag, last: ts })
            }
        })
        return Array.from(map.values())
            .filter(item => item.tag !== 'UNTAGGED')
            .sort((a, b) => b.last - a.last)
    }, [filteredByYear]) // eslint-disable-line react-hooks/exhaustive-deps

    const tagOptions = useMemo(
        () =>
            tagMeta.map(item => ({
                value: item.tag,
                label: formatCycleLabel(item.tag),
                searchValue: item.tag,
            })),
        [tagMeta]
    )

    const categoryItems = useMemo(
        () => topLevelCategories.map(cat => ({ value: cat.id, label: cat.name })),
        [topLevelCategories]
    )

    const peopleItems = useMemo(
        () => people.map(person => ({ value: person.id, label: person.name })),
        [people]
    )

    const subcategoryItems = useMemo(
        () => availableSubcategories.map(cat => ({ value: cat.id, label: cat.name })),
        [availableSubcategories]
    )

    const effectiveTag = isCreditCard ? selectedCycle ?? selectedTag : selectedTag

    const filteredByTag = effectiveTag
        ? filteredByYear.filter(txn => getDisplayTag(txn) === effectiveTag)
        : filteredByYear

    const filteredByPerson = useMemo(() => {
        if (!selectedPersonId) return filteredByTag
        return filteredByTag.filter(txn => ((txn as any).person_id ?? txn.person_id) === selectedPersonId)
    }, [filteredByTag, selectedPersonId])

    const filteredByCategory = useMemo(() => {
        if (!selectedCategoryId) {
            return filteredByPerson
        }
        const subSet = new Set(availableSubcategories.map(cat => cat.id))
        return filteredByPerson.filter(txn => {
            const txnCategoryId = txn.category_id ?? null
            if (selectedSubcategoryId) {
                return txnCategoryId === selectedSubcategoryId
            }
            if (txnCategoryId === selectedCategoryId) return true
            if (txnCategoryId && parentLookup.get(txnCategoryId) === selectedCategoryId) {
                return true
            }
            if (!txnCategoryId && txn.category_name) {
                const parentName = categoryById.get(selectedCategoryId)?.name
                if (parentName && txn.category_name.toLowerCase().includes(parentName.toLowerCase())) {
                    return true
                }
            }
            return txnCategoryId ? subSet.has(txnCategoryId) : false
        })
    }, [availableSubcategories, categoryById, filteredByPerson, parentLookup, selectedCategoryId, selectedSubcategoryId])

    const searchedTransactions = useMemo(() => {
        if (!searchTerm) {
            return filteredByCategory
        }
        return filteredByCategory.filter(txn =>
            txn.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            txn.id.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [filteredByCategory, searchTerm])

    const filteredByType = useMemo(() => {
        if (selectedType === 'all') return searchedTransactions
        return searchedTransactions.filter(txn => {
            const visualType = (txn as any).displayType ?? txn.type
            if (selectedType === 'lend') return visualType === 'debt'
            if (selectedType === 'repay') return visualType === 'repayment'
            return visualType === selectedType
        })
    }, [searchedTransactions, selectedType])

    const finalTransactions = useMemo(() => {
        if (showSelectedOnly && selectedTxnIds.size > 0) {
            return filteredByType.filter(txn => selectedTxnIds.has(txn.id))
        }
        return filteredByType
    }, [filteredByType, showSelectedOnly, selectedTxnIds])

    const totals = useMemo(() => {
        const source = selectedTxnIds.size > 0
            ? finalTransactions.filter(txn => selectedTxnIds.has(txn.id))
            : finalTransactions

        const effectiveSource = source.filter(txn => {
            if (activeTab === 'active') return txn.status !== 'void'
            return txn.status === 'void'
        })

        return effectiveSource.reduce(
            (acc, txn) => {
                const kind = txn.type ?? (txn as any).displayType ?? 'expense'
                const value = Math.abs(txn.amount ?? 0)
                const isPersonTxn = Boolean((txn as any).person_id ?? txn.person_id)

                if (isPersonTxn) {
                    if (kind === 'income' || kind === 'repayment') {
                        acc.collect += value
                    } else {
                        acc.lend += value
                    }
                    return acc
                }

                if (kind === 'income') {
                    acc.income += value
                } else if (kind === 'expense') {
                    acc.expense += value
                } else {
                    acc.expense += value
                }
                return acc
            },
            { income: 0, expense: 0, lend: 0, collect: 0 }
        )
    }, [finalTransactions, selectedTxnIds, activeTab])

    const currentBulkTab = bulkActions?.currentTab ?? activeTab
    const bulkActionLabel = currentBulkTab === 'void' ? 'Restore Selected' : 'Void Selected'
    const bulkActionHandler =
        currentBulkTab === 'void' ? bulkActions?.onRestoreSelected : bulkActions?.onVoidSelected
    const bulkActionBusy = currentBulkTab === 'void' ? bulkActions?.isRestoring : bulkActions?.isVoiding
    const bulkActionDisabled =
        !bulkActionHandler || (bulkActions?.selectionCount ?? 0) === 0 || !!bulkActionBusy

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="mx-6 mt-6 space-y-3">
                <AccountDetailHeader
                    account={account}
                    categories={categories}
                    people={people}
                    allAccounts={accounts}
                    savingsAccounts={accounts.filter(a => a.type === 'savings' || a.type === 'investment' || a.type === 'asset')}
                    collateralAccount={account.secured_by_account_id ? accounts.find(a => a.id === account.secured_by_account_id) ?? null : null}
                    statTotals={{ inflow: 0, outflow: 0, net: 0 }}
                    cashbackStats={cashbackStats ?? null}
                    isAssetAccount={account.type === 'asset'}
                    assetConfig={null}
                    shops={shops}
                    batchStats={batchStats}
                />
            </div>

            {/* Filters */}
            <div className="flex-none bg-white p-3 mx-6 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                    {/* Top Row (Mobile) / Left Side (Desktop): Search & Quick Filters */}
                    <div className="flex flex-1 flex-col md:flex-row gap-3">
                        {/* Quick Filters (All/Void/Pending) */}
                        <div className="flex items-center gap-2 shrink-0 overflow-x-auto">
                            <button
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'active' ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                onClick={() => setActiveTab('active')}
                            >
                                All
                            </button>
                            <button
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'void' ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                onClick={() => setActiveTab('void')}
                            >
                                Void
                            </button>
                            <button
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'pending' ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                onClick={() => setActiveTab('pending')}
                            >
                                Pending
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative flex-1 max-w-md">
                            <input
                                type="text"
                                placeholder="Search by note..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-8 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                            {searchTerm && (
                                <button
                                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
                                    onClick={() => setSearchTerm('')}
                                    title="Clear search"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {/* Type Filters */}
                        <div className="hidden md:flex items-center gap-2 shrink-0 overflow-x-auto">
                            <button
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${selectedType === 'all' ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                onClick={() => setSelectedType('all')}
                            >
                                All Type
                            </button>
                            <button
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${selectedType === 'income' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                onClick={() => setSelectedType('income')}
                            >
                                In
                            </button>
                            <button
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${selectedType === 'expense' ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-700'}`}
                                onClick={() => setSelectedType('expense')}
                            >
                                Out
                            </button>
                            <button
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${selectedType === 'lend' ? 'bg-purple-50 border-purple-200 text-purple-700 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-purple-50 hover:text-purple-700'}`}
                                onClick={() => setSelectedType('lend')}
                            >
                                Lend
                            </button>
                            <button
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${selectedType === 'repay' ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}
                                onClick={() => setSelectedType('repay')}
                            >
                                Repay
                            </button>
                        </div>
                    </div>

                    {/* Right Side: Filters, Year */}
                    <div className="flex items-center gap-3 ml-auto overflow-x-auto">
                        {/* Filter Menu Toggle (includes tags) */}
                        <div className="relative shrink-0">
                            <button
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                                onClick={() => setShowFilterMenu(prev => !prev)}
                            >
                                <FilterIcon className="h-4 w-4" />
                                Filters
                            </button>
                            {showFilterMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />
                                    <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg space-y-3">
                                        {/* Filter Menu Content */}
                                        {isCreditCard && (
                                            <div className="space-y-2">
                                                <p className="text-[11px] font-semibold text-slate-700">Cycle</p>
                                                <Combobox
                                                    items={tagOptions}
                                                    value={selectedCycle ?? undefined}
                                                    onValueChange={value => setSelectedCycle(value ?? null)}
                                                    placeholder="All cycles"
                                                    inputPlaceholder="Search cycle..."
                                                    emptyState="No cycles"
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <p className="text-[11px] font-semibold text-slate-700">Category</p>
                                            <Combobox
                                                items={categoryItems}
                                                value={selectedCategoryId ?? undefined}
                                                onValueChange={value => {
                                                    setSelectedCategoryId(value ?? null)
                                                    setSelectedSubcategoryId(null)
                                                }}
                                                placeholder="All categories"
                                                inputPlaceholder="Search category..."
                                                emptyState="No categories"
                                            />
                                            {selectedCategoryId && availableSubcategories.length > 0 && (
                                                <Combobox
                                                    items={subcategoryItems}
                                                    value={selectedSubcategoryId ?? undefined}
                                                    onValueChange={value => setSelectedSubcategoryId(value ?? null)}
                                                    placeholder="Subcategory"
                                                    inputPlaceholder="Search subcategory..."
                                                    emptyState="No subcategories"
                                                />
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[11px] font-semibold text-slate-700">People</p>
                                            <Combobox
                                                items={peopleItems}
                                                value={selectedPersonId ?? undefined}
                                                onValueChange={val => setSelectedPersonId(val ?? null)}
                                                placeholder="All people"
                                                inputPlaceholder="Search person..."
                                                emptyState="No people"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[11px] font-semibold text-slate-700">Transaction Type</p>
                                            <select
                                                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                                value={selectedType}
                                                onChange={e => setSelectedType(e.target.value as any)}
                                            >
                                                <option value="all">All Types</option>
                                                <option value="income">Income</option>
                                                <option value="expense">Expense</option>
                                                <option value="lend">Lend</option>
                                                <option value="repay">Repay</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 border-t pt-2">
                                            <button
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                                                onClick={() => {
                                                    setSelectedTag(null)
                                                    setSelectedCycle(null)
                                                    setSelectedCategoryId(null)
                                                    setSelectedSubcategoryId(null)
                                                    setSelectedPersonId(null)
                                                    setSelectedYear(currentYear)
                                                    setSelectedType('all')
                                                }}
                                            >
                                                Reset All
                                            </button>
                                            <button
                                                className="text-xs text-slate-600 hover:text-slate-800"
                                                onClick={() => setShowFilterMenu(false)}
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Year Select */}
                        <select
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 shrink-0"
                            value={selectedYear}
                            onChange={e => setSelectedYear(e.target.value)}
                        >
                            <option value="">All years</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Bulk Actions & Totals */}
            {selectedTxnIds.size > 0 && (
                <div className="flex-none flex flex-wrap items-center justify-between gap-3 border rounded-md border-slate-200 bg-slate-50 px-3 py-2 mx-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300"
                            onClick={() => { setSelectedTxnIds(new Set()); setShowSelectedOnly(false) }}
                        >
                            Deselect All ({selectedTxnIds.size})
                        </button>
                        <button
                            className={`px-3 py-1 rounded-full text-sm font-semibold shadow-sm ${currentBulkTab === 'void'
                                ? 'bg-green-600 text-white hover:bg-green-500'
                                : 'bg-red-600 text-white hover:bg-red-500'
                                }`}
                            onClick={() => bulkActionHandler?.()}
                            disabled={bulkActionDisabled}
                        >
                            {bulkActionBusy ? 'Working...' : `${bulkActionLabel} (${selectedTxnIds.size})`}
                        </button>
                        {currentBulkTab === 'void' && (
                            <button
                                className="px-3 py-1 rounded-full text-sm font-semibold shadow-sm bg-red-700 text-white hover:bg-red-800"
                                onClick={() => bulkActions?.onDeleteSelected?.()}
                                disabled={!bulkActions?.onDeleteSelected || bulkActions?.isDeleting}
                            >
                                {bulkActions?.isDeleting ? 'Deleting...' : `Delete Forever (${selectedTxnIds.size})`}
                            </button>
                        )}
                        <button
                            className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                            onClick={() => setShowSelectedOnly(prev => !prev)}
                        >
                            {showSelectedOnly ? 'Show All' : 'Show Selected'}
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                            Income: {numberFormatter.format(totals.income)}
                        </span>
                        <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">
                            Expense: {numberFormatter.format(totals.expense)}
                        </span>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-600">
                            Lend: {numberFormatter.format(totals.lend)}
                        </span>
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-600">
                            Collect: {numberFormatter.format(totals.collect)}
                        </span>
                    </div>
                </div>
            )}

            {/* Table Container */}
            <div className="flex-1 overflow-hidden mx-6 mb-6">
                <UnifiedTransactionTable
                    transactions={finalTransactions}
                    accountType={account.type}
                    accountId={account.id}
                    contextId={account.id}
                    accounts={accounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    selectedTxnIds={selectedTxnIds}
                    onSelectionChange={setSelectedTxnIds}
                    activeTab={activeTab}
                    onBulkActionStateChange={handleBulkActionStateChange}
                    sortState={sortState}
                    onSortChange={setSortState}
                    hiddenColumns={[]}
                    context="account"
                />
            </div>
        </div>
    )
}
