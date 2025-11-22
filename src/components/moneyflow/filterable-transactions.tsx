'use client'

import { useMemo, useState } from 'react'
import { FilterIcon, X } from 'lucide-react'
import { RecentTransactions } from '@/components/moneyflow/recent-transactions'
import { TransactionWithDetails } from '@/types/moneyflow.types'
import { useTagFilter } from '@/context/tag-filter-context'

type FilterableTransactionsProps = {
    transactions: TransactionWithDetails[]
    searchTerm?: string
    onSearchChange?: (next: string) => void
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
});

export function FilterableTransactions({ 
    transactions,
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
    const [moreTagsOpen, setMoreTagsOpen] = useState(false)
    const [filterChoices, setFilterChoices] = useState<{ tag: boolean; category: boolean }>({ tag: true, category: false })
    
    const tagMeta = useMemo(() => {
        const map = new Map<string, { tag: string; last: number }>()
        transactions.forEach(txn => {
            const tag = txn.tag || 'UNTAGGED'
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

    const primaryTags = tagMeta.slice(0, 5).map(item => item.tag)
    const extraTags = tagMeta.slice(5).map(item => item.tag)

    const effectiveTag = filterChoices.tag ? selectedTag : null

    const filteredByTag = effectiveTag 
        ? transactions.filter(txn => txn.tag === effectiveTag)
        : transactions

    const searchedTransactions = useMemo(() => {
        if (!searchTerm) {
            return filteredByTag;
        }
        return filteredByTag.filter(txn =>
            txn.note?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [filteredByTag, searchTerm]);

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
                            Filter
                        </button>
                        {showFilterMenu && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-slate-200 bg-white text-xs shadow">
                                <label className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={filterChoices.tag}
                                        onChange={() => setFilterChoices(prev => ({ ...prev, tag: !prev.tag }))}
                                    />
                                    Tag
                                </label>
                                <label className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={filterChoices.category}
                                        onChange={() => setFilterChoices(prev => ({ ...prev, category: !prev.category }))}
                                    />
                                    Category
                                </label>
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
                            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        >
                            {tag}
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
                                            onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setMoreTagsOpen(false) }}
                                        >
                                            {tag}
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
                            Clear: {selectedTag}
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

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
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
                    selectedTxnIds={selectedTxnIds}
                    onSelectionChange={setSelectedTxnIds}
                />
            </div>
        </div>
    )
}
