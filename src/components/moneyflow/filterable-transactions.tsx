'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Filter, X, Trash2, Undo, ArrowLeft, RotateCcw, RefreshCw, History, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from "sonner"
import { UnifiedTransactionTable } from '@/components/moneyflow/unified-transaction-table'
import { filterTransactionByType } from '@/lib/transaction-filters'
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
import { SmartFilterBar } from './smart-filter-bar'
// import { UnifiedFilterBar } from './unified-filter-bar'
import { SummaryDropdown } from './toolbar/SummaryDropdown'
import { SearchBox } from './toolbar/SearchBox'
import { QuickTabs } from './toolbar/QuickTabs'
import { ToolbarActions } from './toolbar/ToolbarActions'
import { DateRangeControl } from './toolbar/DateRangeControl'
import { ColumnKey, defaultColumns } from "@/components/app/table/transactionColumns"
import { TableViewOptions } from './toolbar/TableViewOptions'

type SortKey = 'date' | 'amount' | 'final_price'
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
    selectedType?: 'all' | 'income' | 'expense' | 'transfer' | 'lend' | 'repay' | 'cashback'
    onTypeChange?: (type: 'all' | 'income' | 'expense' | 'transfer' | 'lend' | 'repay' | 'cashback') => void
    className?: string
    hideStatusTabs?: boolean // Hide Active/Void/Pending tabs when managed by parent
    hideTypeFilters?: boolean // Hide All/Income/Expense/Lend/Repay filters
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
    className,
    variant = 'page',
    hideStatusTabs = false,
    hideTypeFilters = false,
    hidePeopleColumn = false,
}: FilterableTransactionsProps & { variant?: 'page' | 'embedded' }) {
    const { selectedTag, setSelectedTag } = useTagFilter()
    const [searchTermInternal, setSearchTermInternal] = useState('');
    const searchTerm = externalSearch ?? searchTermInternal
    const setSearchTerm = onSearchChange ?? setSearchTermInternal

    // Controlled Type State
    const [selectedTypeInternal, setSelectedTypeInternal] = useState<'all' | 'income' | 'expense' | 'transfer' | 'lend' | 'repay' | 'cashback'>('all')
    const selectedType = externalType ?? selectedTypeInternal
    const setSelectedType = onTypeChange ?? setSelectedTypeInternal

    const [selectedTxnIds, setSelectedTxnIds] = useState(new Set<string>());
    const [showSelectedOnly, setShowSelectedOnly] = useState(false)
    const currentYear = String(new Date().getFullYear())
    const [selectedYear, setSelectedYear] = useState<string>('')
    const [selectedCycle, setSelectedCycle] = useState<string | null>(null)
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'active' | 'void' | 'pending'>('active')
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
    const [bulkActions, setBulkActions] = useState<BulkActionState | null>(null)
    // removed local selectedType state definition as it's now handled above
    const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir }>({ key: 'date', dir: 'desc' })
    const [isExcelMode, setIsExcelMode] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)
    const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false)
    const [dateFrom, setDateFrom] = useState<string>('')
    const [dateTo, setDateTo] = useState<string>('')
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
        const initial: Record<ColumnKey, boolean> = {
            date: true,
            shop: true,
            note: false,
            category: true,
            tag: false,
            account: true,
            amount: true,
            back_info: false,
            final_price: true,
            id: false,
            people: false,
            actions: true,
        }
        return initial
    })

    // Default order from definitions
    const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(defaultColumns.map(c => c.key))

    const handleBulkActionStateChange = useCallback((next: BulkActionState) => {
        setBulkActions(next);
    }, [])

    // ... (existing code)



    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

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

    useEffect(() => {
        const updateIsMobile = () => {
            if (typeof window !== 'undefined') {
                setIsMobile(window.innerWidth < 640)
            }
        }
        updateIsMobile()
        window.addEventListener('resize', updateIsMobile)
        return () => window.removeEventListener('resize', updateIsMobile)
    }, [])

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

    const accountItems = useMemo(
        () => accounts.map(acc => ({ value: acc.id, label: acc.name })),
        [accounts]
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

    const filteredByDate = useMemo(() => {
        if (!dateFrom && !dateTo) return filteredByTag
        const fromTs = dateFrom ? new Date(dateFrom).getTime() : null
        const toTs = dateTo ? new Date(dateTo).getTime() : null
        return filteredByTag.filter(txn => {
            const rawDate = txn.occurred_at ?? (txn as { created_at?: string }).created_at
            const parsed = rawDate ? new Date(rawDate) : null
            if (!parsed || Number.isNaN(parsed.getTime())) {
                return false
            }
            const ts = parsed.getTime()
            if (fromTs && ts < fromTs) return false
            if (toTs && ts > toTs) return false
            return true
        })
    }, [filteredByTag, dateFrom, dateTo])

    const filteredByPerson = useMemo(() => {
        if (!selectedPersonId) return filteredByDate
        return filteredByDate.filter(txn => ((txn as any).person_id ?? txn.person_id) === selectedPersonId)
    }, [filteredByDate, selectedPersonId])

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

    const filteredByAccount = useMemo(() => {
        if (!selectedAccountId) return filteredByCategory
        return filteredByCategory.filter(txn => {
            const candidates = [
                (txn as any).account_id ?? (txn as any).source_account_id ?? null,
                (txn as any).source_account_id ?? null,
                (txn as any).destination_account_id ?? null,
                (txn as any).target_account_id ?? null,
            ].filter(Boolean) as string[]
            return candidates.includes(selectedAccountId)
        })
    }, [filteredByCategory, selectedAccountId])

    const searchedTransactions = useMemo(() => {
        if (!searchTerm) {
            return filteredByAccount;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const matches = (value?: string | null) => value?.toLowerCase().includes(lowerTerm);
        return filteredByAccount.filter(txn =>
            matches(txn.note) ||
            matches(txn.id) ||
            matches(txn.category_name) ||
            matches(txn.shop_name) ||
            matches((txn as any).person_name) ||
            matches(txn.source_name) ||
            matches(txn.destination_name) ||
            // Search in metadata for linked IDs
            (txn.metadata && (
                (typeof (txn.metadata as any).original_transaction_id === 'string' && (txn.metadata as any).original_transaction_id.toLowerCase().includes(lowerTerm)) ||
                (typeof (txn.metadata as any).pending_refund_id === 'string' && (txn.metadata as any).pending_refund_id.toLowerCase().includes(lowerTerm)) ||
                (typeof (txn.metadata as any).linked_transaction_id === 'string' && (txn.metadata as any).linked_transaction_id.toLowerCase().includes(lowerTerm))
            ))
        );
    }, [filteredByAccount, searchTerm]);

    const filteredByType = useMemo(() => {
        if (selectedType === 'all') return searchedTransactions
        return searchedTransactions.filter(txn => filterTransactionByType(txn, selectedType))
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

    const clearCategoryFilters = () => {
        setSelectedCategoryId(null)
        setSelectedSubcategoryId(null)
    }

    const resetAllFilters = () => {
        setSelectedTag(null)
        setSelectedCycle(null)
        clearCategoryFilters()
        setSelectedPersonId(null)
        setSelectedYear(currentYear)
        setSelectedType('all')
        setDateFrom('')
        setDateTo('')
        setSelectedAccountId(null)
        setSearchTerm('')
    }

    const filterPopoverContent = (
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
            <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-700">Account</p>
                <Combobox
                    items={accountItems}
                    value={selectedAccountId ?? undefined}
                    onValueChange={val => setSelectedAccountId(val ?? null)}
                    placeholder="All accounts"
                    inputPlaceholder="Search account..."
                    emptyState="No accounts"
                />
            </div>
            <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-700">Year</p>
                <Select
                    value={selectedYear || "all"}
                    onValueChange={(val) => setSelectedYear(val === "all" ? "" : val || "")}
                    items={[
                        { value: "all", label: "All years" },
                        ...availableYears.map(year => ({ value: String(year), label: String(year) }))
                    ]}
                    placeholder="Year"
                    className="w-full"
                />
            </div>
            <div className="flex items-center justify-between gap-2 border-t pt-2">
                <button
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    onClick={resetAllFilters}
                >
                    Reset All
                </button>
            </div>
        </div>
    )

    const summaryStyleMap = {
        income: { active: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-700' },
        expense: { active: 'border-rose-200 bg-rose-50', text: 'text-rose-700' },
        lend: { active: 'border-amber-200 bg-amber-50', text: 'text-amber-700' },
        repay: { active: 'border-indigo-200 bg-indigo-50', text: 'text-indigo-700' },
    }

    const summaryItems: Array<{ key: 'income' | 'expense' | 'lend' | 'repay'; label: string; value: number }> = [
        { key: 'income', label: 'Income', value: totals.income },
        { key: 'expense', label: 'Expenses', value: totals.expense },
        { key: 'lend', label: 'Lend', value: totals.lend },
        { key: 'repay', label: 'Repay', value: totals.collect },
    ]

    const currentBulkTab = bulkActions?.currentTab ?? activeTab
    const bulkActionLabel = currentBulkTab === 'void' ? 'Restore Selected' : 'Void Selected'
    const bulkActionHandler =
        currentBulkTab === 'void' ? bulkActions?.onRestoreSelected : bulkActions?.onVoidSelected
    const bulkActionBusy = currentBulkTab === 'void' ? bulkActions?.isRestoring : bulkActions?.isVoiding
    const bulkActionDisabled =
        !bulkActionHandler || (bulkActions?.selectionCount ?? 0) === 0 || !!bulkActionBusy

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
    const [currentPage, setCurrentPageState] = useState(1)

    // Sync with URL on mount and updates
    useEffect(() => {
        const page = Number(searchParams?.get('page')) || 1
        setCurrentPageState(page)
    }, [searchParams])

    const setCurrentPage = (page: number) => {
        setCurrentPageState(page)
        const params = new URLSearchParams(searchParams?.toString())
        params.set('page', String(page))
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const [fontSize, setFontSize] = useState(14)
    const [isSummaryOpenDesktop, setIsSummaryOpenDesktop] = useState(false)
    const [isSummaryOpenMobile, setIsSummaryOpenMobile] = useState(false)

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [
        contextId, searchTerm, selectedType, selectedTag,
        selectedCategoryId, selectedSubcategoryId,
        selectedPersonId, selectedTxnIds.size, activeTab,
        selectedYear, sortState, dateFrom, dateTo, selectedAccountId
    ])

    const totalPages = Math.ceil(sortedTransactions.length / pageSize)
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return sortedTransactions.slice(start, start + pageSize)
    }, [sortedTransactions, currentPage, pageSize])

    const isEmbedded = variant === 'embedded'
    return (
        <div className={cn(
            "flex flex-col w-full bg-white",
            isEmbedded ? "h-auto overflow-visible" : "h-full overflow-hidden",
            className
        )}>
            <div className={cn(
                "flex-1 flex flex-col min-h-0",
                isEmbedded ? "overflow-visible" : "overflow-hidden"
            )}>
                <div className="w-full px-6 py-4 flex flex-col gap-4">
                    {/* Desktop Toolbar: One Row Design */}
                    <div className="hidden lg:flex items-center gap-3">
                        {!isEmbedded && (
                            <div className="flex-1 max-w-sm">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search transactions..."
                                        className="w-full pl-9 pr-4 h-9 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                                    />
                                </div>
                            </div>
                        )}

                        {!hideStatusTabs && !isEmbedded && (
                            <QuickTabs
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                                size="sm"
                            />
                        )}

                        {/* Removed old filter buttons - use TypeFilterDropdown component instead */}

                        <div className="h-6 w-px bg-slate-200" />

                        <div className="flex items-center gap-2 shrink-0">
                            {/* People Filter Inline */}
                            {!hidePeopleColumn && (
                                <div className="w-36">
                                    <Combobox
                                        items={peopleItems}
                                        value={selectedPersonId ?? undefined}
                                        onValueChange={val => setSelectedPersonId(val ?? null)}
                                        placeholder="All People"
                                        className="h-9 text-[11px]"
                                    />
                                </div>
                            )}

                            <DateRangeControl
                                dateFrom={dateFrom}
                                dateTo={dateTo}
                                onDateFromChange={setDateFrom}
                                onDateToChange={setDateTo}
                                onClear={() => { setDateFrom(''); setDateTo(''); }}
                            />

                            <ToolbarActions
                                isExcelMode={isExcelMode}
                                onExcelModeChange={setIsExcelMode}
                                filterContent={filterPopoverContent}
                            >
                                <TableViewOptions
                                    visibleColumns={visibleColumns}
                                    onVisibilityChange={setVisibleColumns}
                                    columnOrder={columnOrder}
                                    onOrderChange={setColumnOrder}
                                />
                                {!context && !isExcelMode && (
                                    <AddTransactionDialog
                                        accounts={accounts}
                                        categories={categories}
                                        people={people}
                                        shops={shops}
                                        listenToUrlParams={true}
                                    />
                                )}
                            </ToolbarActions>
                        </div>
                    </div>

                    {/* MOBILE LAYOUT (Visible on Mobile) */}
                    <div className="flex lg:hidden flex-col gap-3">
                        {/* Row 1: Tabs + Icons */}
                        <div className="flex items-center justify-between gap-2">
                            {!hideStatusTabs && (
                                <QuickTabs
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                    size="xs"
                                />
                            )}

                            <div className="flex items-center gap-1.5">
                                <DateRangeControl
                                    dateFrom={dateFrom}
                                    dateTo={dateTo}
                                    onDateFromChange={setDateFrom}
                                    onDateToChange={setDateTo}
                                    onClear={() => { setDateFrom(''); setDateTo(''); }}
                                    variant="mobile"
                                />

                                {/* Filter (Category/Type etc) - Kept inline as it has distinct mobile behavior */}
                                <Popover
                                    open={isTypePopoverOpen}
                                    onOpenChange={(open) => {
                                        setIsTypePopoverOpen(open)
                                        if (open) setIsMobileFilterOpen(false) // Close filter when type opens
                                    }}
                                >
                                    <PopoverTrigger asChild>
                                        <button
                                            className={cn(
                                                "relative inline-flex items-center justify-center p-1.5 rounded-md border text-sm font-medium shadow-sm transition-colors h-8 w-8",
                                                selectedType !== 'all' ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                            )}
                                        >
                                            <Filter className="h-3.5 w-3.5" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 p-3 space-y-3" align="end">
                                        <div className="space-y-2">
                                            <h4 className="font-medium text-xs text-slate-900">Transaction Type</h4>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {(['all', 'income', 'expense', 'lend', 'repay'] as const).map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => { setSelectedType(type); setIsTypePopoverOpen(false); }}
                                                        className={cn(
                                                            "px-2 py-1.5 text-[10px] font-bold rounded-md border transition-all capitalize text-center",
                                                            selectedType === type
                                                                ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                                                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                <SummaryDropdown
                                    isOpen={isSummaryOpenMobile}
                                    onOpenChange={setIsSummaryOpenMobile}
                                    items={summaryItems}
                                    selectedType={selectedType}
                                    variant="mobile"
                                />
                            </div>
                        </div>

                        {/* Row 2: Search + Add Button */}
                        {!isEmbedded && (
                            <div className="flex items-center gap-2 w-full">
                                <SearchBox
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    variant="mobile"
                                />
                                <AddTransactionDialog
                                    accounts={accounts}
                                    categories={categories}
                                    people={people}
                                    shops={shops}
                                />
                            </div>
                        )}
                    </div>

                    {/* Floating Action Bar (Replaces Mobile/Inline Actions) */}
                    {selectedTxnIds.size > 0 && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-xl border border-slate-200 ring-1 ring-slate-100">
                                {/* Void/Restore Button */}
                                <button
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm transition-all active:scale-95",
                                        currentBulkTab === 'void'
                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                                            : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700'
                                    )}
                                    onClick={() => bulkActionHandler?.()}
                                    disabled={bulkActionDisabled}
                                >
                                    {currentBulkTab === 'void' ? <Undo className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                                    <span>{bulkActionLabel} ({selectedTxnIds.size})</span>
                                </button>

                                <div className="h-4 w-px bg-slate-200 mx-1" />

                                {/* Deselect Button */}
                                <button
                                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                    onClick={() => { setSelectedTxnIds(new Set()); setShowSelectedOnly(false) }}
                                >
                                    Deselect ({selectedTxnIds.size})
                                </button>

                                <div className="h-4 w-px bg-slate-200 mx-1" />

                                {/* Recalc Cashback Button */}
                                <button
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    onClick={async () => {
                                        const ids = Array.from(selectedTxnIds)
                                        const toastId = toast.loading(`Recalculating cashback for ${ids.length} transactions...`)
                                        let successCount = 0
                                        let failCount = 0
                                        for (const id of ids) {
                                            try {
                                                const res = await fetch(`/api/debug/recalc-cashback?id=${id}`)
                                                if (res.ok) successCount++
                                                else failCount++
                                            } catch (e) {
                                                failCount++
                                            }
                                        }
                                        toast.dismiss(toastId)
                                        if (successCount > 0) toast.success(`Recalculated ${successCount} transactions`)
                                        if (failCount > 0) toast.error(`Failed to recalculate ${failCount} transactions`)
                                        router.refresh()
                                    }}
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    <span>Recalc Cashback</span>
                                </button>

                                <div className="h-4 w-px bg-slate-200 mx-1" />

                                {/* Show Selected Only Toggle */}
                                <button
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                                        showSelectedOnly
                                            ? "bg-blue-100 text-blue-700"
                                            : "text-slate-600 hover:bg-slate-100"
                                    )}
                                    onClick={() => setShowSelectedOnly(!showSelectedOnly)}
                                >
                                    Show Selected
                                </button>
                            </div>
                        </div>
                    )}
                </div>


                {isMobile && isMobileFilterOpen && (
                    <div className="fixed inset-0 z-40 flex flex-col">
                        <div className="absolute inset-0 bg-black/50" onClick={() => {
                            setIsMobileFilterOpen(false)
                            setIsTypePopoverOpen(false) // Close type popover when clicking backdrop
                        }} />
                        <div className="relative mt-auto bg-white rounded-t-2xl shadow-2xl max-h-[90dvh] w-full overflow-hidden">
                            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white">
                                <p className="text-sm font-semibold text-slate-900">Filter &amp; Search</p>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="text-xs font-semibold text-blue-600"
                                        onClick={resetAllFilters}
                                    >
                                        Reset
                                    </button>
                                    <button
                                        className="rounded-md border px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                        onClick={() => {
                                            setIsMobileFilterOpen(false)
                                            setIsTypePopoverOpen(false) // Close type popover when filter closes
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-y-auto px-4 py-4 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Search</label>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search by note, category, or entity..."
                                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Date Range</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                        />
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Type</label>
                                    <SmartFilterBar
                                        transactions={sortedTransactions}
                                        selectedType={selectedType}
                                        onSelectType={setSelectedType}
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Account</label>
                                    <Combobox
                                        items={accountItems}
                                        value={selectedAccountId ?? undefined}
                                        onValueChange={val => setSelectedAccountId(val ?? null)}
                                        placeholder="All accounts"
                                        inputPlaceholder="Search account..."
                                        emptyState="No accounts"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Tag / Cycle</label>
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
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Category</label>
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
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">People</label>
                                    <Combobox
                                        items={peopleItems}
                                        value={selectedPersonId ?? undefined}
                                        onValueChange={val => setSelectedPersonId(val ?? null)}
                                        placeholder="All people"
                                        inputPlaceholder="Search person..."
                                        emptyState="No people"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Year</label>
                                    <Select
                                        value={selectedYear || "all"}
                                        onValueChange={(val) => setSelectedYear(val === "all" ? "" : val || "")}
                                        items={[
                                            { value: "all", label: "All years" },
                                            ...availableYears.map(year => ({ value: String(year), label: String(year) }))
                                        ]}
                                        placeholder="Year"
                                        className="w-full"
                                    />
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        className="rounded-md border px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100"
                                        onClick={() => {
                                            setIsMobileFilterOpen(false)
                                            setIsTypePopoverOpen(false) // Close type popover when applying
                                        }}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Table & Footer Card Container */}
                <div className={cn(
                    "flex-1 min-h-0 overflow-hidden relative",
                    isMobile ? "bg-white border-t" : "w-full px-6 pb-6 bg-white"
                )}>
                    <div className={cn(
                        "flex flex-col h-full min-h-0 overflow-hidden",
                        isMobile ? "" : "bg-white rounded-xl border border-slate-200 shadow-sm"
                    )}>
                        {/* Table Region */}
                        <div className="flex-1 overflow-hidden relative">
                            <UnifiedTransactionTable
                                transactions={finalTransactions}
                                accountType={accountType}
                                accounts={accounts}
                                categories={categories}
                                people={people}
                                shops={shops}
                                selectedTxnIds={selectedTxnIds}
                                onSelectionChange={setSelectedTxnIds}
                                context={context}
                                contextId={contextId || accountId}
                                activeTab={activeTab}
                                sortState={sortState}
                                onSortChange={setSortState}
                                showPagination={true}
                                currentPage={currentPage}
                                onPageChange={setCurrentPage}
                                pageSize={pageSize}
                                onPageSizeChange={setPageSize}
                                isExcelMode={isExcelMode}
                                hiddenColumns={hidePeopleColumn ? ['people'] : []}
                            />
                        </div>

                        {/* Footer Region - REMOVED DUPLICATE FOOTER (Relies on UnifiedTransactionTable internal pagination) */}
                    </div>
                </div>
            </div>
        </div >
    )
}
