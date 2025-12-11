'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ListFilter, X, Trash2, Undo, FileSpreadsheet, ArrowLeft, RotateCcw } from 'lucide-react'
import { UnifiedTransactionTable } from '@/components/moneyflow/unified-transaction-table'
import { Account, Category, Person, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { useTagFilter } from '@/context/tag-filter-context'
import { Combobox } from '@/components/ui/combobox'
import { AddTransactionDialog } from './add-transaction-dialog'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Select,
} from "@/components/ui/select"

type SortKey = 'date' | 'amount'
type SortDir = 'asc' | 'desc'

type FilterableTransactionsProps = {
    transactions: TransactionWithDetails[]
    categories?: Category[]
    accounts?: Account[]
    people?: Person[]
    accountType?: Account['type']
    accountId?: string
    contextId?: string // NEW: Pass through to UnifiedTransactionTable
    searchTerm?: string
    onSearchChange?: (next: string) => void
    shops?: Shop[]
    hidePeopleColumn?: boolean
    context?: 'person' | 'account' | 'general'
    // Controlled Props Support
    selectedType?: 'all' | 'income' | 'expense' | 'transfer' | 'lend' | 'repay'
    onTypeChange?: (type: 'all' | 'income' | 'expense' | 'transfer' | 'lend' | 'repay') => void
}

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

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
});

export function FilterableTransactions({
    transactions,
    categories = [],
    accounts = [],
    people = [],
    accountType,
    accountId,
    contextId,
    searchTerm: externalSearch,
    onSearchChange,
    shops = [],
    context,
    selectedType: externalType,
    onTypeChange,
}: FilterableTransactionsProps) {
    const { selectedTag, setSelectedTag } = useTagFilter()
    const [searchTermInternal, setSearchTermInternal] = useState('');
    const searchTerm = externalSearch ?? searchTermInternal
    const setSearchTerm = onSearchChange ?? setSearchTermInternal

    // Controlled Type State
    const [selectedTypeInternal, setSelectedTypeInternal] = useState<'all' | 'income' | 'expense' | 'transfer' | 'lend' | 'repay'>('all')
    const selectedType = externalType ?? selectedTypeInternal
    const setSelectedType = onTypeChange ?? setSelectedTypeInternal

    const [selectedTxnIds, setSelectedTxnIds] = useState(new Set<string>());
    const [showSelectedOnly, setShowSelectedOnly] = useState(false)
    const currentYear = String(new Date().getFullYear())
    const [selectedYear, setSelectedYear] = useState<string>('')
    const [moreTagsOpen, setMoreTagsOpen] = useState(false)
    const [selectedCycle, setSelectedCycle] = useState<string | null>(null)
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'active' | 'void' | 'pending'>('active')
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
    const [bulkActions, setBulkActions] = useState<BulkActionState | null>(null)
    // removed local selectedType state definition as it's now handled above
    const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir }>({ key: 'date', dir: 'desc' })
    const [isExcelMode, setIsExcelMode] = useState(false)

    const handleBulkActionStateChange = useCallback((next: BulkActionState) => {
        setBulkActions(next);
    }, [])

    const router = useRouter()

    // [M2-SP1] Realtime: Subscribe to transaction changes
    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel('transactions-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'transactions' },
                () => {
                    console.log('Realtime update detected in transactions, refreshing...')
                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [router])

    // ... (memoized values remain same)

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
        const abbrev = value.slice(0, 3).toLowerCase()
        const monthMap: Record<string, string> = {
            jan: 'January', feb: 'February', mar: 'March', apr: 'April', may: 'May', jun: 'June',
            jul: 'July', aug: 'August', sep: 'September', oct: 'October', nov: 'November', dec: 'December',
        }
        if (monthMap[abbrev]) {
            return monthMap[abbrev]
        }
        return value
    }

    const getDisplayTag = (txn: TransactionWithDetails) => {
        if (accountType === 'credit_card') {
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
    }, [filteredByYear])

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

    const primaryTags = tagMeta.slice(0, 5).map(item => item.tag)
    const extraTags = tagMeta.slice(5).map(item => item.tag)

    const effectiveTag = accountType === 'credit_card' ? selectedCycle ?? selectedTag : selectedTag

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
    }, [availableSubcategories, categoryById, filteredByTag, parentLookup, selectedCategoryId, selectedSubcategoryId])

    const searchedTransactions = useMemo(() => {
        if (!searchTerm) {
            return filteredByCategory;
        }
        const lowerTerm = searchTerm.toLowerCase();
        return filteredByCategory.filter(txn =>
            txn.note?.toLowerCase().includes(lowerTerm) ||
            txn.id.toLowerCase().includes(lowerTerm) ||
            // Search in metadata for linked IDs
            (txn.metadata && (
                (typeof (txn.metadata as any).original_transaction_id === 'string' && (txn.metadata as any).original_transaction_id.toLowerCase().includes(lowerTerm)) ||
                (typeof (txn.metadata as any).pending_refund_id === 'string' && (txn.metadata as any).pending_refund_id.toLowerCase().includes(lowerTerm)) ||
                (typeof (txn.metadata as any).linked_transaction_id === 'string' && (txn.metadata as any).linked_transaction_id.toLowerCase().includes(lowerTerm))
            ))
        );
    }, [filteredByCategory, searchTerm]);

    const filteredByType = useMemo(() => {
        if (selectedType === 'all') return searchedTransactions
        return searchedTransactions.filter(txn => {
            const visualType = (txn as any).displayType ?? txn.type
            const hasPerson = Boolean((txn as any).person_id)

            // Unified Logic (User Defined):
            // Lend = Debt (negative) OR Expense with Person (if not purely classified as Expense)
            // But since 'Out' is 'My Expenses' (without person), and Lend implies Person/Debt...

            // LEND: Matches Type Debt OR (Expense + Person)
            if (selectedType === 'lend') {
                return (txn.type === 'debt' && (txn.amount ?? 0) < 0) || (visualType === 'expense' && hasPerson)
            }
            // REPAY: Matches Type Repayment OR (Debt + Positive) OR (Income + Person)
            if (selectedType === 'repay') {
                return txn.type === 'repayment' || (txn.type === 'debt' && (txn.amount ?? 0) > 0) || (visualType === 'income' && hasPerson)
            }
            // MY EXPENSES (Out): Matches pure Expense (no person)
            if (selectedType === 'expense') {
                return visualType === 'expense' && !hasPerson && txn.type !== 'debt'
            }
            // MY INCOME (In): Matches pure Income (no person)
            if (selectedType === 'income') {
                return visualType === 'income' && !hasPerson && txn.type !== 'repayment'
            }

            return visualType === selectedType
        })
    }, [searchedTransactions, selectedType])

    const finalTransactions = useMemo(() => {
        const applyTab = (list: TransactionWithDetails[]) => {
            if (activeTab === 'void') return list.filter(txn => txn.status === 'void')
            if (activeTab === 'pending') return list.filter(txn => txn.status === 'pending' || txn.status === 'waiting_refund')
            return list.filter(txn => txn.status !== 'void')
        }

        const base = applyTab(filteredByType)
        if (showSelectedOnly && selectedTxnIds.size > 0) {
            return base.filter(txn => selectedTxnIds.has(txn.id))
        }
        return base
    }, [filteredByType, showSelectedOnly, selectedTxnIds, activeTab])

    const totals = useMemo(() => {
        // Calculate totals from searchedTransactions (BEFORE type filtering) 
        // so filter buttons show correct totals regardless of which type is selected
        const source = selectedTxnIds.size > 0
            ? searchedTransactions.filter(txn => selectedTxnIds.has(txn.id))
            : searchedTransactions

        // Apply activeTab filter for voided vs active transactions
        const effectiveSource = source.filter(txn => {
            if (activeTab === 'void') return txn.status === 'void'
            if (activeTab === 'pending') return txn.status === 'pending' || txn.status === 'waiting_refund'
            return txn.status !== 'void' // 'active' shows all non-voided
        })

        return effectiveSource.reduce(
            (acc, txn) => {
                const kind = txn.type ?? (txn as any).displayType ?? 'expense'
                const value = Math.abs(txn.amount ?? 0)
                const hasPerson = Boolean((txn as any).person_id)

                // Debt/repayment transactions
                if (kind === 'debt' || (kind === 'expense' && hasPerson)) {
                    acc.lend += value
                } else if (kind === 'repayment' || (kind === 'income' && hasPerson)) {
                    acc.collect += value
                } else if (kind === 'income') {
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
    }, [searchedTransactions, selectedTxnIds, activeTab])

    const currentBulkTab = bulkActions?.currentTab ?? activeTab
    const bulkActionLabel = currentBulkTab === 'void' ? 'Restore Selected' : 'Void Selected'
    const bulkActionHandler =
        currentBulkTab === 'void' ? bulkActions?.onRestoreSelected : bulkActions?.onVoidSelected
    const bulkActionBusy = currentBulkTab === 'void' ? bulkActions?.isRestoring : bulkActions?.isVoiding
    const bulkActionDisabled =
        !bulkActionHandler || (bulkActions?.selectionCount ?? 0) === 0 || !!bulkActionBusy

    const clearTagFilter = () => {
        setSelectedTag(null)
        setSelectedCycle(null)
    }

    const clearCategoryFilters = () => {
        setSelectedCategoryId(null)
        setSelectedSubcategoryId(null)
    }

    const isSortActive = sortState.key !== 'date' || sortState.dir !== 'desc'

    // Sort Logic
    const sortedTransactions = useMemo(() => {
        const data = [...finalTransactions]
        return data.sort((a, b) => {
            const dateA = new Date(a.occurred_at ?? a.created_at ?? 0).getTime()
            const dateB = new Date(b.occurred_at ?? b.created_at ?? 0).getTime()

            if (sortState.key === 'date') {
                return sortState.dir === 'asc' ? dateA - dateB : dateB - dateA
            } else if (sortState.key === 'amount') {
                const amtA = Math.abs(a.amount ?? 0)
                const amtB = Math.abs(b.amount ?? 0)
                return sortState.dir === 'asc' ? amtA - amtB : amtB - amtA
            }
            return 0
        })
    }, [finalTransactions, sortState])

    // Pagination Logic
    const [pageSize, setPageSize] = useState(20)
    const [currentPage, setCurrentPage] = useState(1)
    const [fontSize, setFontSize] = useState(14)

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [
        contextId, searchTerm, selectedType, selectedTag,
        selectedCategoryId, selectedSubcategoryId,
        selectedPersonId, selectedTxnIds.size, activeTab,
        selectedYear, sortState
    ])

    const totalPages = Math.ceil(sortedTransactions.length / pageSize)
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return sortedTransactions.slice(start, start + pageSize)
    }, [sortedTransactions, currentPage, pageSize])

    return (
        <div className="flex flex-col h-full overflow-hidden space-y-0">
            {/* 1. Header Toolbar - Static */}
            {!onSearchChange && (
                <div className="flex-none flex flex-col gap-3 md:flex-row md:items-center bg-slate-100 py-3 px-1 z-10 border-b shadow-sm transition-all duration-200">
                    {!context && (
                        <div className="order-first md:order-last shrink-0">
                            {!isExcelMode && (
                                <AddTransactionDialog
                                    accounts={accounts}
                                    categories={categories}
                                    people={people}
                                    shops={shops}
                                    listenToUrlParams={true}
                                />
                            )}
                        </div>
                    )}
                    <div className="flex flex-1 items-center gap-2">
                        {/* Quick Filters (All/Void/Pending) */}
                        <div className="flex items-center gap-2 shrink-0 overflow-visible">
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

                        {selectedTxnIds.size > 0 && (
                            <button
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shadow-sm text-white transition-colors ${currentBulkTab === 'void'
                                    ? 'bg-green-600 hover:bg-green-500'
                                    : 'bg-red-600 hover:bg-red-500'
                                    }`}
                                onClick={() => bulkActionHandler?.()}
                                disabled={bulkActionDisabled}
                            >
                                {currentBulkTab === 'void' ? <Undo className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                                {bulkActionBusy ? 'Working...' : `${bulkActionLabel} (${selectedTxnIds.size})`}
                            </button>
                        )}

                        <div className="relative flex-1 flex items-center gap-2">
                            <div className="relative flex-1">
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
                            {selectedTxnIds.size > 0 && (
                                <>
                                    {currentBulkTab === 'void' && (
                                        <button
                                            className="px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap shadow-sm bg-red-700 text-white hover:bg-red-800"
                                            onClick={() => bulkActions?.onDeleteSelected?.()}
                                            disabled={!bulkActions?.onDeleteSelected || bulkActions?.isDeleting}
                                        >
                                            {bulkActions?.isDeleting ? 'Deleting...' : `Delete Forever (${selectedTxnIds.size})`}
                                        </button>
                                    )}
                                    <button
                                        className="px-3 py-2 rounded-md text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 whitespace-nowrap"
                                        onClick={() => { setSelectedTxnIds(new Set()); setShowSelectedOnly(false) }}
                                    >
                                        Deselect ({selectedTxnIds.size})
                                    </button>
                                    <button
                                        className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${showSelectedOnly ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                        onClick={() => setShowSelectedOnly(prev => !prev)}
                                    >
                                        {showSelectedOnly ? 'Show All' : 'Show Selected'}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Type Filters */}
                        <div className="flex items-center gap-2 shrink-0 overflow-visible">
                            <button
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${selectedType === 'all' ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                onClick={() => setSelectedType('all')}
                            >
                                All Types
                            </button>
                            <button
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${selectedType === 'income' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                onClick={() => setSelectedType('income')}
                            >
                                My Income: {numberFormatter.format(totals.income)}
                            </button>
                            <button
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${selectedType === 'expense' ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-700'}`}
                                onClick={() => setSelectedType('expense')}
                            >
                                My Expenses: {numberFormatter.format(totals.expense)}
                            </button>

                            <button
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${selectedType === 'lend' ? 'bg-amber-50 border-amber-200 text-amber-700 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-amber-50 hover:text-amber-700'}`}
                                onClick={() => setSelectedType('lend')}
                            >
                                Lend: {numberFormatter.format(totals.lend)}
                            </button>
                            <button
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${selectedType === 'repay' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700'}`}
                                onClick={() => setSelectedType('repay')}
                            >
                                Repay: {numberFormatter.format(totals.collect)}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-visible">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    className="relative z-20 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 shrink-0"
                                    title="Filter options"
                                >
                                    <ListFilter className="h-4 w-4" />
                                    Filters
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72 p-3 z-50 shadow-xl">
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-semibold text-slate-700">Tag / Cycle</p>
                                        <Combobox
                                            items={tagOptions}
                                            value={selectedTag ?? undefined}
                                            onValueChange={value => {
                                                const next = value ?? null
                                                setSelectedTag(next)
                                                if (accountType === 'credit_card') {
                                                    setSelectedCycle(next)
                                                }
                                            }}
                                            placeholder="Select Tag..."
                                            inputPlaceholder="Search tag..."
                                            emptyState="No tags found"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-semibold text-slate-700">Category</p>
                                        <Combobox
                                            items={categoryItems}
                                            value={selectedCategoryId ?? undefined}
                                            onValueChange={value => {
                                                const next = value ?? null
                                                setSelectedCategoryId(next)
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
                                    <div className="flex items-center justify-between gap-2 border-t pt-2">
                                        <button
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                                            onClick={() => {
                                                setSelectedTag(null)
                                                setSelectedCycle(null)
                                                clearCategoryFilters()
                                                setSelectedPersonId(null)
                                                setSelectedYear(currentYear)
                                                setSelectedType('all')
                                            }}
                                        >
                                            Reset All
                                        </button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Select
                            value={selectedYear || "all"}
                            onValueChange={(val) => setSelectedYear(val === "all" ? "" : val || "")}
                            items={[
                                { value: "all", label: "All years" },
                                ...availableYears.map(year => ({ value: String(year), label: String(year) }))
                            ]}
                            placeholder="Year"
                            className="w-[120px]"
                        />

                        <div className="h-6 w-px bg-slate-300 mx-1" />

                        <button
                            onClick={() => setIsExcelMode(prev => !prev)}
                            className={`relative z-20 inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium shadow-sm shrink-0 transition-colors ${isExcelMode
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            title={isExcelMode ? "Exit Excel Mode" : "Enter Excel Mode"}
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            {isExcelMode ? 'Excel Mode' : 'Excel Mode'}
                        </button>
                    </div>
                </div>
            )}


            {/* 2. Table Container - Flexible & Scrollable */}
            <div className="flex-1 overflow-hidden bg-white border-t relative">
                <UnifiedTransactionTable
                    transactions={paginatedTransactions}
                    accountType={accountType}
                    accountId={accountId}
                    contextId={contextId ?? accountId}
                    accounts={accounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    selectedTxnIds={selectedTxnIds}
                    onSelectionChange={setSelectedTxnIds}
                    activeTab={activeTab}
                    context={context}
                    onBulkActionStateChange={handleBulkActionStateChange}
                    sortState={sortState}
                    onSortChange={setSortState}
                    hiddenColumns={[]}
                    isExcelMode={isExcelMode}
                    showPagination={false}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                />
            </div>

            {/* 3. Footer Pagination - Static */}
            <div className="flex-none p-4 bg-background z-10 border-t sticky bottom-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <button
                                className="rounded p-1 hover:bg-slate-100 disabled:opacity-50"
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            >
                                <ArrowLeft className="h-4 w-4 text-slate-600" />
                            </button>
                            <div className="flex items-center gap-1">
                                <span className="rounded px-2 py-1 text-xs font-semibold bg-blue-600 text-white">{currentPage}</span>
                                <span className="text-xs text-slate-500">/ {Math.max(1, totalPages)}</span>
                            </div>
                            <button
                                className="rounded p-1 hover:bg-slate-100 disabled:opacity-50"
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(currentPage + 1)}
                            >
                                <ArrowLeft className="h-4 w-4 text-slate-600 rotate-180" />
                            </button>
                        </div>
                        <div className="h-4 w-px bg-slate-200" />
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="h-7 rounded border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                        >
                            <option value={10}>10 / p</option>
                            <option value={20}>20 / p</option>
                            <option value={50}>50 / p</option>
                            <option value={100}>100 / p</option>
                        </select>
                        <div className="h-4 w-px bg-slate-200" />
                        <button
                            onClick={() => {
                                setSortState({ key: 'date', dir: 'desc' });
                                setSelectedTxnIds(new Set());
                                setCurrentPage(1);
                            }}
                            className="flex items-center gap-1 text-slate-600 hover:text-red-600 transition-colors pointer-events-auto"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Reset</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <p className="text-slate-500 font-medium text-xs">
                            Showing <span className="text-slate-900 font-bold">{Math.min((currentPage - 1) * pageSize + 1, sortedTransactions.length)}</span> - <span className="text-slate-900 font-bold">{Math.min(currentPage * pageSize, sortedTransactions.length)}</span> of <span className="text-slate-900 font-bold">{sortedTransactions.length}</span> rows
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
