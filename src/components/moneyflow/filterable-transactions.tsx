'use client'

import { useMemo, useState } from 'react'
import { FilterIcon, X } from 'lucide-react'
import { RecentTransactions } from '@/components/moneyflow/recent-transactions'
import { Account, Category, TransactionWithDetails } from '@/types/moneyflow.types'
import { useTagFilter } from '@/context/tag-filter-context'

type FilterableTransactionsProps = {
    transactions: TransactionWithDetails[]
    categories?: Category[]
    accountType?: Account['type']
    searchTerm?: string
    onSearchChange?: (next: string) => void
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
});

export function FilterableTransactions({ 
    transactions,
    categories = [],
    accountType,
    searchTerm: externalSearch,
    onSearchChange,
}: FilterableTransactionsProps) {
    const { selectedTag, setSelectedTag } = useTagFilter()
    const [searchTermInternal, setSearchTermInternal] = useState('');
    const searchTerm = externalSearch ?? searchTermInternal
    const setSearchTerm = onSearchChange ?? setSearchTermInternal
    const [selectedTxnIds, setSelectedTxnIds] = useState(new Set<string>());
    const [showSelectedOnly, setShowSelectedOnly] = useState(false)
    const [showFilterMenu, setShowFilterMenu] = useState(false)
    const [tagSearch, setTagSearch] = useState('')
    const [moreTagsOpen, setMoreTagsOpen] = useState(false)
    const [selectedCycle, setSelectedCycle] = useState<string | null>(null)
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)

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
        transactions.forEach(txn => {
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
    }, [transactions])

    const filteredTagOptions = useMemo(() => {
        const query = tagSearch.trim().toLowerCase()
        const options = tagMeta.map(item => ({
            value: item.tag,
            label: formatCycleLabel(item.tag),
            raw: item.tag,
        }))
        if (!query) return options
        return options.filter(opt => opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query))
    }, [tagMeta, tagSearch])

    const primaryTags = tagMeta.slice(0, 5).map(item => item.tag)
    const extraTags = tagMeta.slice(5).map(item => item.tag)

    const effectiveTag = accountType === 'credit_card' ? selectedCycle ?? selectedTag : selectedTag

    const filteredByTag = effectiveTag 
        ? transactions.filter(txn => getDisplayTag(txn) === effectiveTag)
        : transactions

    const filteredByCategory = useMemo(() => {
        if (!selectedCategoryId) {
            return filteredByTag
        }
        const subSet = new Set(availableSubcategories.map(cat => cat.id))
        return filteredByTag.filter(txn => {
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
            txn.note?.toLowerCase().includes(searchTerm.toLowerCase())
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

        return source.reduce(
          (acc, txn) => {
            const kind = txn.type ?? (txn as any).displayType ?? 'expense'
            const value = Math.abs(txn.amount ?? 0)
            const isPersonTxn = Boolean((txn as any).person_id ?? txn.person_id)

            if (isPersonTxn) {
              if (kind === 'income') {
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

    const clearTagFilter = () => {
        setSelectedTag(null)
        setSelectedCycle(null)
    }

    const clearCategoryFilters = () => {
        setSelectedCategoryId(null)
        setSelectedSubcategoryId(null)
    }

    return (
        <div className="space-y-4">
            {!onSearchChange && (
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search by note..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 pr-20 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        {searchTerm && (
                            <button
                                className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                onClick={() => setSearchTerm('')}
                                title="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                            onClick={() => setShowFilterMenu(prev => !prev)}
                            title="Filter options"
                        >
                            <FilterIcon className="h-4 w-4" />
                            Filters
                        </button>
                        {showFilterMenu && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-md border border-slate-200 bg-white p-3 text-xs shadow space-y-3">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-semibold text-slate-700">Tag/Cycle</p>
                                    <input
                                        type="text"
                                        placeholder="Search tag..."
                                        value={tagSearch}
                                        onChange={e => setTagSearch(e.target.value)}
                                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                    />
                                    <select
                                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                        value={effectiveTag ?? ''}
                                        onChange={e => {
                                            const next = e.target.value || null
                                            if (accountType === 'credit_card') {
                                                setSelectedCycle(next)
                                                setSelectedTag(next)
                                            } else {
                                                setSelectedTag(next)
                                            }
                                        }}
                                    >
                                        <option value="">All</option>
                                        {filteredTagOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-semibold text-slate-700">Category</p>
                                    <select
                                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                        value={selectedCategoryId ?? ''}
                                        onChange={e => {
                                            const next = e.target.value || null
                                            setSelectedCategoryId(next)
                                            setSelectedSubcategoryId(null)
                                        }}
                                    >
                                        <option value="">All categories</option>
                                        {topLevelCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedCategoryId && availableSubcategories.length > 0 && (
                                        <select
                                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                            value={selectedSubcategoryId ?? ''}
                                            onChange={e => setSelectedSubcategoryId(e.target.value || null)}
                                        >
                                            <option value="">Subcategory</option>
                                            {availableSubcategories.map(cat => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <button
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                                        onClick={() => {
                                            setSelectedTag(null)
                                            setSelectedCycle(null)
                                            clearCategoryFilters()
                                            setTagSearch('')
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
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border rounded-md border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedTag === null
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
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                                selectedTag === tag
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
                                            className={`block w-full px-3 py-2 text-left text-sm ${
                                                selectedTag === tag ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'
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
            
            <div>
                <RecentTransactions 
                    transactions={finalTransactions} 
                    accountType={accountType}
                    selectedTxnIds={selectedTxnIds}
                    onSelectionChange={setSelectedTxnIds}
                />
            </div>
        </div>
    )
}
