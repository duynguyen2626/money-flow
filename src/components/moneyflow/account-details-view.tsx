'use client'

import { useState, useMemo, useCallback } from 'react'
import { Account, Category, Person, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { UnifiedTransactionTable } from './unified-transaction-table'
import { FilterIcon, X, CreditCard, Wallet, ArrowLeftRight, User, Plus, Minus, Settings } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { useTagFilter } from '@/context/tag-filter-context'
import Link from 'next/link'
import { AddTransactionDialog } from './add-transaction-dialog'
import { EditAccountDialog } from './edit-account-dialog'
import { getSharedLimitParentId } from '@/lib/account-utils'

type AccountDetailsViewProps = {
    account: Account
    transactions: TransactionWithDetails[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
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
    isVoiding: boolean
    isRestoring: boolean
}

export function AccountDetailsView({
    account,
    transactions,
    accounts,
    categories,
    people,
    shops,
}: AccountDetailsViewProps) {
    // --- Header Logic ---
    const isCreditCard = account.type === 'credit_card'
    const sharedLimitParentId = getSharedLimitParentId(account.cashback_config)
    const parentAccount = sharedLimitParentId ? accounts.find(a => a.id === sharedLimitParentId) : null
    const isChildCard = !!parentAccount

    let displayBalance = account.current_balance
    let displayLabel = 'Current Balance'

    if (isCreditCard) {
        const creditLimit = account.credit_limit ?? 0
        const netBalance = (account.total_in ?? 0) - (account.total_out ?? 0)

        if (isChildCard && parentAccount) {
            const parentNetBalance = (parentAccount.total_in ?? 0) - (parentAccount.total_out ?? 0)
            const combinedNetBalance = parentNetBalance + netBalance
            const displayLimit = parentAccount.credit_limit ?? 0
            displayBalance = displayLimit + combinedNetBalance
        } else {
            displayBalance = creditLimit + netBalance
        }
        displayLabel = 'Available'
    }

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

    const finalTransactions = useMemo(() => {
        if (showSelectedOnly && selectedTxnIds.size > 0) {
            return searchedTransactions.filter(txn => selectedTxnIds.has(txn.id))
        }
        return searchedTransactions
    }, [searchedTransactions, showSelectedOnly, selectedTxnIds])

    const dialogBaseProps = {
        accounts,
        categories,
        people,
        shops,
    }

    return (
        <div className="container mx-auto max-w-7xl h-[calc(100vh-64px)] flex flex-col p-4 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        {account.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={account.logo_url}
                                alt={account.name}
                                className="h-16 w-16 object-contain rounded-lg border border-slate-200"
                            />
                        ) : (
                            <div className="h-16 w-16 flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200">
                                {isCreditCard ? (
                                    <CreditCard className="h-8 w-8 text-slate-400" />
                                ) : (
                                    <Wallet className="h-8 w-8 text-slate-400" />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Name & Balance */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900">{account.name}</h1>
                            {isChildCard && parentAccount && (
                                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                    Linked to {parentAccount.name}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                {displayLabel}
                            </p>
                            <p className={`text-3xl font-bold tracking-tight ${isCreditCard
                                ? (displayBalance < (account.credit_limit ?? 0) * 0.3 ? 'text-amber-600' : 'text-emerald-600')
                                : (displayBalance < 0 ? 'text-red-600' : 'text-slate-900')
                                }`}>
                                {numberFormatter.format(displayBalance)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2">
                    <Link
                        href="/accounts"
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        ← Back to Accounts
                    </Link>
                    <div className="flex items-center gap-2">
                        <EditAccountDialog
                            account={account}
                            collateralAccounts={accounts.filter(a => a.type === 'savings' || a.type === 'investment' || a.type === 'asset')}
                            accounts={accounts}
                            buttonClassName="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            triggerContent={<Settings className="h-5 w-5" />}
                        />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm shrink-0">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
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

                    {/* Quick Filters (All/Void/Pending) */}
                    <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600">
                        <button
                            className={`rounded-md px-3 py-1.5 transition-all ${activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            onClick={() => setActiveTab('active')}
                        >
                            All
                        </button>
                        <button
                            className={`rounded-md px-3 py-1.5 transition-all ${activeTab === 'void' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            onClick={() => setActiveTab('void')}
                        >
                            Void
                        </button>
                        <button
                            className={`rounded-md px-3 py-1.5 transition-all ${activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            onClick={() => setActiveTab('pending')}
                        >
                            Pending
                        </button>
                    </div>

                    {/* Filter Menu Toggle */}
                    <div className="relative">
                        <button
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                            onClick={() => setShowFilterMenu(prev => !prev)}
                        >
                            <FilterIcon className="h-4 w-4" />
                            Filters
                        </button>
                        {showFilterMenu && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg space-y-3">
                                {/* Filter Menu Content */}
                                <div className="space-y-2">
                                    <p className="text-[11px] font-semibold text-slate-700">Tags</p>
                                    <Combobox
                                        items={tagOptions}
                                        value={selectedTag ?? undefined}
                                        onValueChange={value => setSelectedTag(value ?? null)}
                                        placeholder="All tags"
                                        inputPlaceholder="Search tag..."
                                        emptyState="No tags found"
                                    />
                                </div>
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
                        )}
                    </div>

                    {/* Year Select */}
                    <select
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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

            {/* Table Container */}
            <div className="flex-1 border rounded-lg overflow-hidden bg-background shadow-sm">
                <div className="h-full overflow-auto">
                    <UnifiedTransactionTable
                        transactions={finalTransactions}
                        accountType={account.type}
                        accountId={account.id}
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
                        hiddenColumns={['initial_back', 'people_back', 'profit', 'final_price', 'id']}
                    />
                </div>
            </div>
        </div>
    )
}
