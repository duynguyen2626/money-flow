'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ListFilter, X, Trash2, Undo, FileSpreadsheet, ArrowLeft, RotateCcw, RefreshCw, History, ChevronDown, Search, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from "sonner"
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
import { SmartFilterBar } from './smart-filter-bar'

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
    const [dateFrom, setDateFrom] = useState<string>('')
    const [dateTo, setDateTo] = useState<string>('')
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

    const handleBulkActionStateChange = useCallback((next: BulkActionState) => {
        setBulkActions(next);
    }, [])

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
    const [isSummaryOpen, setIsSummaryOpen] = useState(false)

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

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50 w-full">
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="w-full px-4 lg:px-10 py-4 space-y-4 flex flex-col min-h-0">
                    {/* Header Row */}
                    <div className="flex flex-row items-center justify-between gap-4">

                        {/* LEFT: Title + Search + Financial Summary */}
                        <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
                            <div className="hidden xl:block shrink-0 mr-1">
                                <h1 className="text-lg font-bold tracking-tight text-slate-900">Transactions</h1>
                            </div>

                            {/* Financial Summary Dropdown (Desktop) */}
                            <Popover open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
                                <PopoverTrigger asChild>
                                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition-all">
                                        Financial Summary
                                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isSummaryOpen && "rotate-180")} />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3 space-y-2 z-50">
                                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Global Summary</h4>
                                    <div className="grid gap-1">
                                        {summaryItems.map((item) => (
                                            <div
                                                key={item.key}
                                                className={cn(
                                                    "flex items-center justify-between p-2 rounded-lg border transition-colors",
                                                    selectedType === item.key ? summaryStyleMap[item.key].active : "bg-white border-slate-100"
                                                )}
                                            >
                                                <span className="text-xs font-medium text-slate-600">{item.label}</span>
                                                <span className={cn("text-xs font-bold", summaryStyleMap[item.key].text)}>
                                                    {numberFormatter.format(item.value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Search Bar - Compact */}
                            <div className="relative flex-1 min-w-[100px] max-w-[200px] transition-all">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="h-8 w-full rounded-md border border-slate-200 pl-8 pr-8 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                {searchTerm && (
                                    <button
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                        onClick={() => setSearchTerm('')}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>

                            {/* Smart Filter Bar - Now purely for type switching on mobile, hidden or secondary on desktop if summary exists */}
                            {/* But let's keep it as clean type tabs for quick switching */}
                            <div className="hidden lg:flex items-center gap-1 bg-slate-100/50 p-1 rounded-lg shrink-0">
                                {(['all', 'income', 'expense', 'lend', 'repay'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedType(type)}
                                        className={cn(
                                            "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all capitalize",
                                            selectedType === type
                                                ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
                                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            {/* Mobile: Scrollable Filter Bar */}
                            <div className="lg:hidden flex-1 overflow-x-auto no-scrollbar mask-gradient-right">
                                <div className="flex items-center gap-1 min-w-max pb-1">
                                    {summaryItems.map(item => (
                                        <button
                                            key={item.key}
                                            onClick={() => setSelectedType(item.key)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all whitespace-nowrap",
                                                selectedType === item.key
                                                    ? summaryStyleMap[item.key].active + " " + summaryStyleMap[item.key].text + " border-current"
                                                    : "bg-white border-slate-200 text-slate-500"
                                            )}
                                        >
                                            {item.label}: {numberFormatter.format(item.value)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Actions & Controls */}
                        <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 lg:pb-0">

                            {/* Tabs Switcher - Compact */}
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0 mr-2">
                                {(['active', 'void', 'pending'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all capitalize",
                                            activeTab === tab
                                                ? cn(
                                                    "bg-white shadow-sm ring-1 ring-black/5",
                                                    tab === 'active' && "bg-blue-50 text-blue-700 ring-blue-700/10",
                                                    // Fix: Ensure distinct colors for active states as requested
                                                    tab === 'void' && "bg-red-50 text-red-700 ring-red-700/10",
                                                    tab === 'pending' && "bg-amber-50 text-amber-700 ring-amber-700/10"
                                                )
                                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Date Range Popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        className={cn(
                                            "relative inline-flex items-center justify-center p-2 rounded-md border text-sm font-medium shadow-sm transition-colors",
                                            dateFrom || dateTo
                                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                        )}
                                        title="Select Date Range"
                                    >
                                        <CalendarIcon className="h-4 w-4" />
                                        {(dateFrom || dateTo) && (
                                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 shadow-sm border border-white"></span>
                                            </span>
                                        )}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4 space-y-3" align="end">
                                    <div className="space-y-1">
                                        <h4 className="font-semibold text-sm text-slate-900">Date Range</h4>
                                        <p className="text-xs text-slate-500">Filter transactions by date.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-600">From</label>
                                            <input
                                                type="date"
                                                value={dateFrom}
                                                onChange={(e) => setDateFrom(e.target.value)}
                                                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-600">To</label>
                                            <input
                                                type="date"
                                                value={dateTo}
                                                onChange={(e) => setDateTo(e.target.value)}
                                                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    {(dateFrom || dateTo) && (
                                        <div className="flex justify-end pt-2 border-t border-slate-100">
                                            <button
                                                onClick={() => { setDateFrom(''); setDateTo('') }}
                                                className="text-xs text-red-600 hover:underline font-medium"
                                            >
                                                Clear Dates
                                            </button>
                                        </div>
                                    )}
                                </PopoverContent>
                            </Popover>

                            {/* Excel Mode Toggle */}
                            <button
                                onClick={() => setIsExcelMode(prev => !prev)}
                                className={cn(
                                    "inline-flex items-center justify-center p-2 rounded-md border text-sm font-medium shadow-sm transition-colors",
                                    isExcelMode
                                        ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                )}
                                title={isExcelMode ? "Exit Excel Mode" : "Enter Excel Mode"}
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                            </button>

                            {/* Filters (Desktop Popover) */}
                            {!isMobile && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                                        >
                                            <ListFilter className="h-4 w-4" />
                                            <span className="hidden xl:inline">Filters</span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent align="end" className="w-80 p-4 z-50 shadow-xl">
                                        {filterPopoverContent}
                                    </PopoverContent>
                                </Popover>
                            )}

                            {/* Mobile Filters Trigger */}
                            {isMobile && (
                                <button
                                    className="inline-flex items-center justify-center p-2 rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                                    onClick={() => setIsMobileFilterOpen(true)}
                                >
                                    <ListFilter className="h-4 w-4" />
                                </button>
                            )}

                            {/* Add Transaction */}
                            {!context && !isExcelMode && (
                                <div className="ml-1">
                                    <AddTransactionDialog
                                        accounts={accounts}
                                        categories={categories}
                                        people={people}
                                        shops={shops}
                                        listenToUrlParams={true}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bulk Actions Bar (if any selected) */}
                    {selectedTxnIds.size > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 animate-in fade-in slide-in-from-top-1">
                            <button
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap shadow-sm text-white transition-colors",
                                    currentBulkTab === 'void' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'
                                )}
                                onClick={() => bulkActionHandler?.()}
                                disabled={bulkActionDisabled}
                            >
                                {currentBulkTab === 'void' ? <Undo className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                                {bulkActionBusy ? 'Working...' : `${bulkActionLabel} (${selectedTxnIds.size})`}
                            </button>
                            {currentBulkTab === 'void' && (
                                <button
                                    className="px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap shadow-sm bg-red-700 text-white hover:bg-red-800"
                                    onClick={() => bulkActions?.onDeleteSelected?.()}
                                    disabled={!bulkActions?.onDeleteSelected || bulkActions?.isDeleting}
                                >
                                    {bulkActions?.isDeleting ? 'Deleting...' : `Delete Forever (${selectedTxnIds.size})`}
                                </button>
                            )}
                            <button
                                className="px-3 py-2 rounded-md text-xs font-medium bg-slate-200 text-slate-800 hover:bg-slate-300 whitespace-nowrap"
                                onClick={() => { setSelectedTxnIds(new Set()); setShowSelectedOnly(false) }}
                            >
                                Deselect ({selectedTxnIds.size})
                            </button>
                            <button
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 whitespace-nowrap"
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
                                            console.error(e)
                                            failCount++
                                        }
                                    }
                                    toast.dismiss(toastId)
                                    if (failCount === 0) {
                                        toast.success(`Recalculated ${successCount} items.`)
                                    } else {
                                        toast.warning(`Done with ${successCount} successes and ${failCount} failures.`)
                                    }
                                    router.refresh()
                                    setSelectedTxnIds(new Set())
                                }}
                            >
                                <RefreshCw className="h-4 w-4" />
                                Recalc Cashback
                            </button>
                            <button
                                className={cn(
                                    "px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                                    showSelectedOnly ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                )}
                                onClick={() => setShowSelectedOnly(prev => !prev)}
                            >
                                {showSelectedOnly ? 'Show All' : 'Show Selected'}
                            </button>
                        </div>
                    )}
                </div>


                {isMobile && isMobileFilterOpen && (
                    <div className="fixed inset-0 z-40 flex flex-col">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileFilterOpen(false)} />
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
                                        onClick={() => setIsMobileFilterOpen(false)}
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
                                        onClick={() => setIsMobileFilterOpen(false)}
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
                    isMobile ? "bg-white border-t" : "w-full px-4 lg:px-10 pb-4 bg-slate-50/50"
                )}>
                    <div className={cn(
                        "flex flex-col h-full overflow-hidden",
                        isMobile ? "" : "bg-white rounded-2xl border border-slate-200 shadow-sm"
                    )}>
                        {/* Table Region */}
                        <div className="flex-1 overflow-hidden relative">
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
                                currentPage={1}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                                onPageSizeChange={setPageSize}
                            />
                        </div>

                        {/* Footer Region - Inside Card */}
                        <div className="flex-none p-3 bg-white border-t border-slate-100 z-10 sticky bottom-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <button
                                            className="rounded p-1 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                                            disabled={currentPage <= 1}
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        >
                                            <ArrowLeft className="h-4 w-4 text-slate-600" />
                                        </button>
                                        <div className="flex items-center gap-1 px-1">
                                            <span className="min-w-[1.5rem] text-center text-xs font-bold text-slate-700">{currentPage}</span>
                                            <span className="text-xs text-slate-400">/ {Math.max(1, totalPages)}</span>
                                        </div>
                                        <button
                                            className="rounded p-1 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                                            disabled={currentPage >= totalPages}
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                        >
                                            <ArrowLeft className="h-4 w-4 text-slate-600 rotate-180" />
                                        </button>
                                    </div>

                                    {!isMobile && <div className="h-4 w-px bg-slate-200" />}

                                    {!isMobile && (
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer hover:bg-slate-100"
                                        >
                                            <option value={10}>10 rows</option>
                                            <option value={20}>20 rows</option>
                                            <option value={50}>50 rows</option>
                                            <option value={100}>100 rows</option>
                                        </select>
                                    )}

                                    {!isMobile && <div className="h-4 w-px bg-slate-200" />}

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
                                        <span className="hidden sm:inline">Showing </span>
                                        <span className="text-slate-900 font-bold">{Math.min((currentPage - 1) * pageSize + 1, sortedTransactions.length)}</span> - <span className="text-slate-900 font-bold">{Math.min(currentPage * pageSize, sortedTransactions.length)}</span> of <span className="text-slate-900 font-bold">{sortedTransactions.length}</span>
                                        <span className="hidden sm:inline"> rows</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
