'use client'

import { useMemo, useState, useCallback } from 'react'
import { FilterIcon, X } from 'lucide-react'
import { UnifiedTransactionTable } from '@/components/moneyflow/unified-transaction-table'
import { Account, Category, Person, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { useTagFilter } from '@/context/tag-filter-context'
import { Combobox } from '@/components/ui/combobox'

type SortKey = 'date' | 'amount'
type SortDir = 'asc' | 'desc'

type FilterableTransactionsProps = {
    transactions: TransactionWithDetails[]
    categories?: Category[]
    accounts?: Account[]
    people?: Person[]
    accountType?: Account['type']
    accountId?: string
    searchTerm?: string
    onSearchChange?: (next: string) => void
    shops?: Shop[]
    hidePeopleColumn?: boolean
}

type BulkActionState = {
    selectionCount: number
    currentTab: 'active' | 'void' | 'pending'
    onVoidSelected: () => Promise<void> | void
    onRestoreSelected: () => Promise<void> | void
    isVoiding: boolean
    isRestoring: boolean
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
    searchTerm: externalSearch,
    onSearchChange,
    shops = [],
    hidePeopleColumn,
}: FilterableTransactionsProps) {
    const { selectedTag, setSelectedTag } = useTagFilter()
    const [searchTermInternal, setSearchTermInternal] = useState('');
    const searchTerm = externalSearch ?? searchTermInternal
    const setSearchTerm = onSearchChange ?? setSearchTermInternal
    const [selectedTxnIds, setSelectedTxnIds] = useState(new Set<string>());
    const [showSelectedOnly, setShowSelectedOnly] = useState(false)
    const [showFilterMenu, setShowFilterMenu] = useState(false)
    const currentYear = String(new Date().getFullYear())
    const [selectedYear, setSelectedYear] = useState<string>('')
    const [moreTagsOpen, setMoreTagsOpen] = useState(false)
    const [selectedCycle, setSelectedCycle] = useState<string | null>(null)
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'active' | 'void' | 'pending'>('active')
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
    const [bulkActions, setBulkActions] = useState<BulkActionState | null>(null)
    const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir }>({ key: 'date', dir: 'desc' })

    const handleBulkActionStateChange = useCallback((next: BulkActionState) => {
        setBulkActions(next);
    }, [])

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
        if (!selectedPersonId || hidePeopleColumn) return filteredByTag
        return filteredByTag.filter(txn => ((txn as any).person_id ?? txn.person_id) === selectedPersonId)
    }, [filteredByTag, hidePeopleColumn, selectedPersonId])

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
        return filteredByCategory.filter(txn =>
            txn.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            txn.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [filteredByCategory, searchTerm]);

    const finalTransactions = useMemo(() => {
        if (showSelectedOnly && selectedTxnIds.size > 0) {
            return searchedTransactions.filter(txn => selectedTxnIds.has(txn.id))
        }
        return searchedTransactions
    }, [searchedTransactions, showSelectedOnly, selectedTxnIds])

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
                    if (kind === 'income' || kind === 'repayment') { // Consider repayment as collect
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
    }, [finalTransactions, selectedTxnIds])

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

    return (
        <div className="space-y-3">
            {!onSearchChange && (
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search by note..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 pr-36 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <button
                            className="absolute right-24 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-800 shadow-sm"
                            onClick={() => setSearchTerm('')}
                            title="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                            onClick={() => setShowFilterMenu(prev => !prev)}
                            title="Filter options"
                        >
                            <FilterIcon className="h-4 w-4" />
                            Filters
                        </button>
                        {showFilterMenu && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 text-xs shadow space-y-3">
                                <div className="space-y-2">
                                    <p className="text-[11px] font-semibold text-slate-700">Tags</p>
                                    <Combobox
                                        items={tagOptions}
                                        value={selectedTag ?? undefined}
                                        onValueChange={value => {
                                            const next = value ?? null
                                            setSelectedTag(next)
                                        }}
                                        placeholder="All tags"
                                        inputPlaceholder="Search tag..."
                                        emptyState="No tags found"
                                    />
                                </div>
                                {accountType === 'credit_card' && (
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
                                {!hidePeopleColumn && (
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
                                )}
                                <div className="flex items-center justify-between gap-2">
                                    <button
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                                        onClick={() => {
                                            setSelectedTag(null)
                                            setSelectedCycle(null)
                                            clearCategoryFilters()
                                            setSelectedPersonId(null)
                                            setSelectedYear(currentYear)
                                        }}
                                    >
                                        Reset
                                    </button>
                                    <button
                                        className="text-xs text-slate-600 hover:text-slate-800"
                                        onClick={() => setShowFilterMenu(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex w-full flex-col gap-2 md:w-64 md:flex-row md:items-center md:gap-3">
                        <select
                            id="year-filter"
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            value={selectedYear}
                            onChange={e => setSelectedYear(e.target.value)}
                        >
                            <option value="">All years</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border rounded-md border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-lg bg-slate-200/50 p-1 text-sm font-medium text-slate-600 mr-2">
                        <button
                            className={`rounded-md px-3 py-1 transition-all text-xs ${activeTab === 'active'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                                }`}
                            onClick={() => setActiveTab('active')}
                        >
                            All
                        </button>
                        <button
                            className={`rounded-md px-3 py-1 transition-all text-xs ${activeTab === 'void'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                                }`}
                            onClick={() => setActiveTab('void')}
                        >
                            Void
                        </button>
                        <button
                            className={`rounded-md px-3 py-1 transition-all text-xs ${activeTab === 'pending'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                                }`}
                            onClick={() => setActiveTab('pending')}
                        >
                            Pending/Waiting
                        </button>
                    </div>
                    {isSortActive && (
                        <button
                            className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200"
                            onClick={() => setSortState({ key: 'date', dir: 'desc' })}
                        >
                            Reset Sort
                        </button>
                    )}
                    <button
                        className={`px-3 py-1 rounded-full text-sm font-medium ${selectedTag === null
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        onClick={clearTagFilter}
                    >
                        All
                    </button>
                    {primaryTags.map(tag => (
                        <button
                            key={tag}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${selectedTag === tag
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            onClick={() => {
                                const next = selectedTag === tag ? null : tag
                                setSelectedTag(next)
                                if (accountType === 'credit_card') {
                                    setSelectedCycle(next)
                                }
                            }}
                        >
                            {formatCycleLabel(tag)}
                        </button>
                    ))}
                    {extraTags.length > 0 && (
                        <div className="relative">
                            <button
                                className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                                onClick={() => setMoreTagsOpen(prev => !prev)}
                            >
                                More
                            </button>
                            {moreTagsOpen && (
                                <div className="absolute z-20 mt-2 w-40 rounded-md border border-slate-200 bg-white shadow">
                                    {extraTags.map(tag => (
                                        <button
                                            key={tag}
                                            className={`block w-full px-3 py-2 text-left text-sm ${selectedTag === tag ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'
                                                }`}
                                            onClick={() => {
                                                const next = selectedTag === tag ? null : tag
                                                setSelectedTag(next);
                                                if (accountType === 'credit_card') {
                                                    setSelectedCycle(next)
                                                }
                                                setMoreTagsOpen(false)
                                            }}
                                        >
                                            {formatCycleLabel(tag)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {selectedTag && (
                        <button
                            className="px-3 py-1 rounded-full text-sm font-medium bg-green-500 text-white"
                            onClick={clearTagFilter}
                        >
                            Clear: {formatCycleLabel(selectedTag)}
                        </button>
                    )}
                    {selectedTxnIds.size > 0 && (
                        <>
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
                            <button
                                className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                                onClick={() => setShowSelectedOnly(prev => !prev)}
                            >
                                {showSelectedOnly ? 'Show All' : 'Show Selected'}
                            </button>
                        </>
                    )}
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
                    {selectedTxnIds.size > 0 && (
                        <span className="text-slate-500">Selection</span>
                    )}
                </div>
            </div>

            <div className="mt-2">
                <UnifiedTransactionTable
                    transactions={finalTransactions}
                    accountType={accountType}
                    accountId={accountId}
                    accounts={accounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    selectedTxnIds={selectedTxnIds}
                    onSelectionChange={setSelectedTxnIds}
                    activeTab={activeTab}
                    hidePeopleColumn={hidePeopleColumn}
                    onBulkActionStateChange={handleBulkActionStateChange}
                    sortState={sortState}
                    onSortChange={setSortState}
                    hiddenColumns={['initial_back', 'people_back']}
                />
            </div>
        </div>
    )
}
