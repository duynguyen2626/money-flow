'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Person, TransactionWithDetails, PersonCycleSheet, Account, Category, Shop } from '@/types/moneyflow.types'
import { usePersonDetails } from '@/hooks/use-person-details'
import { SplitBillManager } from '@/components/people/split-bill-manager'
import { SimpleTransactionTable } from '@/components/people/v2/SimpleTransactionTable'
import { PaidTransactionsModal } from '@/components/people/paid-transactions-modal'
import { PeopleHeader } from '@/components/people/v2/PeopleHeader'
import { TransactionControlBar } from '@/components/people/v2/TransactionControlBar'
import { toYYYYMMFromDate } from '@/lib/month-tag'
import { useRecentItems } from '@/hooks/use-recent-items'
import { useBreadcrumbs } from '@/context/breadcrumb-context'
import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'
import { FilterType } from '@/components/transactions-v2/header/TypeFilterDropdown'
import { StatusFilter } from '@/components/transactions-v2/header/StatusDropdown'
import { parseISO, isWithinInterval } from 'date-fns'

interface MemberDetailViewProps {
    person: Person
    balance: number
    balanceLabel: string
    transactions: TransactionWithDetails[]
    debtTags: any[]
    cycleSheets: PersonCycleSheet[]
    accounts: Account[]
    categories: Category[]
    people: Person[]
    shops: Shop[]
}

export function MemberDetailView({
    person,
    balance,
    balanceLabel,
    transactions,
    debtTags,
    cycleSheets,
    accounts,
    categories,
    people,
    shops,
}: MemberDetailViewProps) {
    const [activeTab, setActiveTab] = useState<'timeline' | 'history' | 'split-bill'>('timeline')
    const [selectedYear, setSelectedYear] = useState<string | null>(new Date().getFullYear().toString())
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<FilterType>('all')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
    const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>()
    const [showPaidModal, setShowPaidModal] = useState(false)
    const [dateRangeFilter, setDateRangeFilter] = useState<{ from: Date; to: Date } | undefined>(undefined)

    // Active cycle - must be declared before useEffects that reference it
    const currentMonthTag = toYYYYMMFromDate(new Date())
    const [activeCycleTag, setActiveCycleTag] = useState<string>(currentMonthTag)

    const [isPending, startTransition] = useTransition()

    // Slide State
    const [isSlideOpen, setIsSlideOpen] = useState(false)
    const [slideMode, setSlideMode] = useState<'add' | 'edit' | 'duplicate'>('add')
    const [selectedTxn, setSelectedTxn] = useState<TransactionWithDetails | null>(null)
    const [slideOverrideType, setSlideOverrideType] = useState<string | undefined>(undefined)

    const router = useRouter()
    const searchParams = useSearchParams()
    const { setCustomName } = useBreadcrumbs()

    useEffect(() => {
        const tabLabel = activeTab === 'history' ? 'History' : activeTab === 'split-bill' ? 'Split Bill' : 'Transactions'
        document.title = `${person.name} ${tabLabel}`

        // Set custom breadcrumb name: "Lâm detail history"
        const path = `/people/${person.id}`
        setCustomName(path, `${person.name} detail history`)
    }, [person.id, person.name, activeTab, setCustomName])

    const { addRecentItem } = useRecentItems()

    useEffect(() => {
        if (person.id && person.name) {
            addRecentItem({
                id: person.id,
                type: 'person',
                name: person.name,
                image_url: person.image_url
            })
        }
    }, [person.id, person.name, addRecentItem])

    // Handle URL parameters for tag and date range filter
    useEffect(() => {
        const tag = searchParams.get('tag')
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')

        // Handle tag parameter
        if (tag) {
            if (tag === 'all') {
                // Show all history
                setSelectedYear(null)
            } else {
                // Sync cycle tag from URL
                setActiveCycleTag(tag)
                // Extract year from tag (e.g., "2025-12" -> "2025")
                const year = tag.split('-')[0]
                setSelectedYear(year)
            }
        }

        // Handle date range
        if (dateFrom && dateTo) {
            try {
                const fromDate = parseISO(dateFrom)
                const toDate = parseISO(dateTo)
                setDateRangeFilter({ from: fromDate, to: toDate })
            } catch (err) {
                console.error('Failed to parse date range from URL:', err)
            }
        }
    }, [searchParams])

    // Sync activeCycleTag to URL (for consistency)
    useEffect(() => {
        const currentTag = searchParams.get('tag')
        if (activeCycleTag && currentTag !== activeCycleTag) {
            const url = new URL(window.location.href)
            url.searchParams.set('tag', activeCycleTag)
            startTransition(() => {
                router.replace(url.toString(), { scroll: false })
            })
        }
    }, [activeCycleTag, router, searchParams])

    const { debtCycles, availableYears } = usePersonDetails({
        person,
        transactions,
        debtTags,
        cycleSheets,
    })

    const accountItems = useMemo(() => {
        const ids = new Set<string>()
        transactions.forEach(t => {
            if (t.source_account_id) ids.add(t.source_account_id)
            if (t.target_account_id) ids.add(t.target_account_id)
            if (t.account_id) ids.add(t.account_id)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const toAccountId = (t as any).to_account_id as string | undefined
            if (toAccountId) ids.add(toAccountId)
        })
        return accounts.filter(a => ids.has(a.id))
    }, [transactions, accounts])

    // Initialize activeCycleTag based on available cycles (after debtCycles is computed)
    useEffect(() => {
        if (debtCycles.length > 0) {
            const urlTag = searchParams.get('tag')
            if (!urlTag) {
                // If no tag in URL, default to logic (match current or first)
                const match = debtCycles.find(c => c.tag === currentMonthTag)
                const initialTag = match ? match.tag : (debtCycles[0]?.tag || currentMonthTag)
                if (initialTag !== activeCycleTag) {
                    setActiveCycleTag(initialTag)
                }
            } else if (urlTag === currentMonthTag) {
                // Check if current tag exists in debtCycles
                const match = debtCycles.find(c => c.tag === currentMonthTag)
                if (!match) {
                    // Current tag requested but no data -> Redirect to All
                    const url = new URL(window.location.href)
                    url.searchParams.set('tag', 'all')
                    router.replace(url.toString())
                }
            }
        }
    }, [debtCycles, currentMonthTag, activeCycleTag, searchParams, router])

    const activeCycle = debtCycles.find(c => c.tag === activeCycleTag)

    const applyFilters = (txns: TransactionWithDetails[]) => {
        let result = txns

        if (statusFilter === 'void') {
            result = result.filter(t => t.status === 'void')
        } else if (statusFilter === 'pending') {
            result = result.filter(t => t.status === 'pending' || t.status === 'waiting_refund')
        } else {
            result = result.filter(t => t.status !== 'void')
        }

        if (filterType !== 'all') {
            const matchType = filterType === 'lend' ? 'debt' : (filterType === 'repay' ? 'repayment' : filterType)
            result = result.filter(t => (t.type || '').toLowerCase() === matchType)
        }

        if (selectedAccountId) {
            result = result.filter(t => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const toAccountId = (t as any).to_account_id as string | undefined
                return t.source_account_id === selectedAccountId
                    || t.target_account_id === selectedAccountId
                    || t.account_id === selectedAccountId
                    || toAccountId === selectedAccountId
            })
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            result = result.filter(t =>
                t.note?.toLowerCase().includes(term) ||
                t.shop?.name?.toLowerCase().includes(term) ||
                t.category?.name?.toLowerCase().includes(term) ||
                t.id?.toLowerCase().includes(term)
            )
        }

        // Apply date range filter if set (from URL params)
        if (dateRangeFilter) {
            result = result.filter(t => {
                const txDate = parseISO(t.occurred_at || t.created_at || '')
                return isWithinInterval(txDate, { start: dateRangeFilter.from, end: dateRangeFilter.to })
            })
        }

        return result
    }

    // Transactions for active cycle or all (if selectedYear is null)
    const cycleTransactions = useMemo(() => {
        // If selectedYear is null, show all transactions (All History mode)
        // Otherwise, show active cycle transactions
        if (!activeCycle) return []

        const baseTransactions = selectedYear === null
            ? transactions  // Show all transactions when "All history" selected
            : activeCycle.transactions

        return applyFilters(baseTransactions)
    }, [activeCycle, selectedYear, searchTerm, filterType, statusFilter, selectedAccountId, dateRangeFilter, transactions])

    const historyTransactions = useMemo(() => {
        const base = transactions.filter(t => !selectedYear || t.occurred_at?.startsWith(selectedYear))
        return applyFilters(base)
    }, [transactions, selectedYear, searchTerm, filterType, statusFilter, selectedAccountId, dateRangeFilter])

    // Calculate stats for Header based on Selected Year or All Time
    const headerStats = useMemo(() => {
        const targetCycles = selectedYear
            ? debtCycles.filter(c => c.tag.startsWith(selectedYear))
            : debtCycles

        return targetCycles.reduce((acc, cycle) => ({
            originalLend: acc.originalLend + cycle.stats.originalLend,
            cashback: acc.cashback + cycle.stats.cashback,
            netLend: acc.netLend + cycle.stats.lend,
            repay: acc.repay + cycle.stats.repay,
            remains: acc.remains + cycle.remains
        }), { originalLend: 0, cashback: 0, netLend: 0, repay: 0, remains: 0 })
    }, [debtCycles, selectedYear])

    // Slide Handlers
    const handleAddTransaction = (type: string) => {
        setSlideOverrideType(type)
        setSlideMode('add')
        setSelectedTxn(null)
        setIsSlideOpen(true)
    }

    const handleEditTransaction = (t: TransactionWithDetails) => {
        setSlideMode('edit')
        setSelectedTxn(t)
        setIsSlideOpen(true)
    }

    const handleDuplicateTransaction = (t: TransactionWithDetails) => {
        setSlideMode('duplicate')
        setSelectedTxn(t)
        setSlideOverrideType(undefined)
        setIsSlideOpen(true)
    }

    const handleSlideSuccess = () => {
        setIsSlideOpen(false)
        setSelectedTxn(null)
        setSlideOverrideType(undefined)
        router.refresh()
    }

    // Initial Data for Slide
    const slideInitialData = useMemo(() => {
        if (slideOverrideType) {
            const isRepayment = slideOverrideType === 'repayment';
            return {
                type: slideOverrideType as any,
                occurred_at: new Date(),
                amount: isRepayment ? (activeCycle?.remains || 0) : 0,
                cashback_mode: "none_back" as const,
                person_id: person.id,
                source_account_id: (isRepayment && person.sheet_linked_bank_id) ? person.sheet_linked_bank_id : undefined,
            }
        }
        if (!selectedTxn) return undefined
        return {
            type: selectedTxn.type as any,
            occurred_at: slideMode === 'duplicate' ? new Date() : new Date(selectedTxn.occurred_at),
            amount: Math.abs(Number(selectedTxn.amount)),
            note: selectedTxn.note || '',
            source_account_id: selectedTxn.account_id || '',
            target_account_id: selectedTxn.to_account_id || undefined,
            category_id: selectedTxn.category_id || undefined,
            shop_id: selectedTxn.shop_id || undefined,
            person_id: selectedTxn.person_id || undefined,
            tag: selectedTxn.tag || undefined,
            cashback_mode: selectedTxn.cashback_mode || "none_back",
            cashback_share_percent: selectedTxn.cashback_share_percent,
            cashback_share_fixed: selectedTxn.cashback_share_fixed,
        }
    }, [selectedTxn, slideMode, slideOverrideType, person.id])

    // Calculate paid count from cycleTransactions matching PaidTransactionsModal logic
    const paidCount = useMemo(() => {
        if (!activeCycle) return 0
        return activeCycle.transactions.filter(t => {
            if (t.type !== 'repayment' && t.type !== 'income') return false
            const metadata = t.metadata as any
            return metadata?.is_settled === true || metadata?.paid_at !== null
        }).length
    }, [activeCycle])

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* V2 Header */}
            <PeopleHeader
                person={person}
                balanceLabel={balanceLabel}
                activeCycle={activeCycle}
                stats={headerStats}
                selectedYear={selectedYear}
                availableYears={availableYears}
                onYearChange={setSelectedYear}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Content Area */}
            {activeTab === 'timeline' && activeCycle && (
                <>
                    <TransactionControlBar
                        person={person}
                        activeCycle={activeCycle}
                        allCycles={debtCycles}
                        onCycleChange={setActiveCycleTag}
                        availableYears={availableYears}
                        selectedYear={selectedYear}
                        onYearChange={setSelectedYear}
                        transactionCount={cycleTransactions.length}
                        paidCount={paidCount}
                        onViewPaid={() => setShowPaidModal(true)}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        filterType={filterType}
                        onFilterTypeChange={setFilterType}
                        statusFilter={statusFilter}
                        onStatusChange={setStatusFilter}
                        selectedAccountId={selectedAccountId}
                        onAccountChange={setSelectedAccountId}
                        accountItems={accountItems}
                        accounts={accounts}
                        categories={categories}
                        shops={shops}
                        onAddTransaction={handleAddTransaction}
                        currentCycleTag={currentMonthTag}
                    />
                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        <SimpleTransactionTable
                            transactions={cycleTransactions}
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            searchTerm={searchTerm}
                            context="person"
                            contextId={person.id}
                            onEdit={handleEditTransaction}
                            onDuplicate={handleDuplicateTransaction}
                        />
                    </div>
                </>
            )}

            {activeTab === 'history' && (
                <div className="flex-1 overflow-y-auto px-4 py-3">
                    {/* Reuse filtering logic or search for history? Passing all transactions */}
                    <SimpleTransactionTable
                        transactions={historyTransactions}
                        accounts={accounts}
                        categories={categories}
                        people={people}
                        shops={shops}
                        searchTerm={searchTerm}
                        context="person"
                        contextId={person.id}
                    />
                </div>
            )}

            {activeTab === 'split-bill' && (
                <div className="flex-1 overflow-y-auto px-4 py-3">
                    <SplitBillManager
                        transactions={transactions}
                        personId={person.id}
                        people={people}
                        accounts={accounts}
                        categories={categories}
                        shops={shops}
                    />
                </div>
            )}

            {/* Paid Transactions Modal - Show only current cycle transactions */}
            <PaidTransactionsModal
                open={showPaidModal}
                onOpenChange={setShowPaidModal}
                transactions={activeCycle?.transactions || []}
                personId={person.id}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
            />
            {/* Transaction Slide V2 */}
            <TransactionSlideV2
                open={isSlideOpen}
                onOpenChange={(val) => {
                    if (!val) {
                        setIsSlideOpen(false)
                        setSelectedTxn(null)
                        setSlideOverrideType(undefined)
                    }
                }}
                mode="single"
                editingId={(slideMode === 'edit' && selectedTxn) ? selectedTxn.id : undefined}
                initialData={slideInitialData}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                onSuccess={handleSlideSuccess}
            />
        </div>
    )
}
