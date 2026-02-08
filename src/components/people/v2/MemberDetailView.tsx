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
import { PeopleSlideV2 } from '@/components/people/v2/people-slide-v2'
import { FilterType } from '@/components/transactions-v2/header/TypeFilterDropdown'
import { StatusFilter } from '@/components/transactions-v2/header/StatusDropdown'
import { parseISO, isWithinInterval } from 'date-fns'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    subscriptions: any[]
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
    subscriptions = [],
}: MemberDetailViewProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlTag = searchParams.get('tag')
    const currentMonthTag = toYYYYMMFromDate(new Date())

    const [activeTab, setActiveTab] = useState<'timeline' | 'history' | 'split-bill'>('timeline')
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<FilterType>('all')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
    const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>()
    const [showPaidModal, setShowPaidModal] = useState(false)
    const [dateRangeFilter, setDateRangeFilter] = useState<{ from: Date; to: Date } | undefined>()
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Derive active month/year from URL (Single Source of Truth)
    const urlYear = searchParams.get('year')
    const activeCycleTag = urlTag || currentMonthTag
    const selectedYear = useMemo(() => {
        if (urlYear) return urlYear // Explicit year param takes priority
        if (urlTag === 'all') return null
        if (urlTag && urlTag.includes('-')) return urlTag.split('-')[0]
        return new Date().getFullYear().toString()
    }, [urlTag, urlYear])

    const [isPending, startTransition] = useTransition()

    // Data Hooks
    const { debtCycles, availableYears, currentCycle } = usePersonDetails({
        person,
        transactions,
        debtTags,
        cycleSheets,
        urlTag,
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

    // Slide State
    const [isSlideOpen, setIsSlideOpen] = useState(false)
    const [slideMode, setSlideMode] = useState<'add' | 'edit' | 'duplicate'>('add')
    const [selectedTxn, setSelectedTxn] = useState<TransactionWithDetails | null>(null)
    const [slideOverrideType, setSlideOverrideType] = useState<string | undefined>(undefined)

    // Person Slide State
    const [isPersonSlideOpen, setIsPersonSlideOpen] = useState(false)

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

    // 4. Update Navigation Handlers
    const handleCycleChange = (tag: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tag', tag)
        if (tag.includes('-')) {
            params.set('year', tag.split('-')[0])
        }
        startTransition(() => {
            router.push(`?${params.toString()}`, { scroll: false })
        })
    }

    const handleCycleSelect = (tag: string, year: string | null) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tag', tag)
        if (year) {
            params.set('year', year)
        } else {
            params.delete('year')
        }
        startTransition(() => {
            router.push(`?${params.toString()}`, { scroll: false })
        })
    }

    const handleYearChange = (year: string | null) => {
        const params = new URLSearchParams(searchParams.toString())
        if (year === null) {
            params.set('tag', 'all')
            params.delete('year')
        } else {
            params.set('tag', 'all')
            params.set('year', year)
        }
        startTransition(() => {
            router.push(`?${params.toString()}`, { scroll: false })
        })
    }

    // Passively sync date range from URL if present
    useEffect(() => {
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')
        if (dateFrom && dateTo) {
            try {
                setDateRangeFilter({ from: parseISO(dateFrom), to: parseISO(dateTo) })
            } catch (err) {
                console.error('Failed to parse date range:', err)
            }
        }
    }, [searchParams])

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

    // Absolute Active Cycle Logic (No fuzzy fallbacks)
    const activeCycle = useMemo(() => {
        if (urlTag === 'all') {
            return {
                tag: selectedYear ? `All for ${selectedYear}` : "All History",
                remains: headerStats.remains,
                transactions: [], // Not used for 'all' mode
                stats: {
                    lend: headerStats.netLend,
                    repay: headerStats.repay,
                    originalLend: headerStats.originalLend,
                    cashback: headerStats.cashback,
                },
                isSettled: Math.abs(headerStats.remains) < 100,
                latestDate: 0,
                tagDateVal: 0,
            }
        }

        // Find specific tag. If it has a tag in URL, it MUST exist in debtCycles (thanks to hook refactor)
        // If no tag in URL, we fallback to currentCycle for the 'default' view
        return debtCycles.find(c => c.tag === (urlTag || activeCycleTag)) || currentCycle
    }, [urlTag, debtCycles, headerStats, selectedYear, activeCycleTag, currentCycle])

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
            if (filterType === 'cashback') {
                result = result.filter(t => {
                    const amount = Math.abs(Number(t.amount) || 0)
                    const finalPrice = t.final_price !== null && t.final_price !== undefined ? Math.abs(Number(t.final_price)) : amount
                    const hasBackMetadata = (t.metadata as any)?.is_cashback === true || t.note?.toLowerCase().includes('cashback')
                    const hasSharedCashback = (Number(t.cashback_share_amount) || 0) > 0 || (Number(t.cashback_share_percent) || 0) > 0
                    return (finalPrice < amount && finalPrice > 0) || hasBackMetadata || hasSharedCashback
                })
            } else {
                const matchType = filterType === 'lend' ? 'debt' : (filterType === 'repay' ? 'repayment' : filterType)
                result = result.filter(t => (t.type || '').toLowerCase() === matchType)
            }
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
        // Mode 1: All Time (selectedYear === null)
        if (selectedYear === null) {
            return applyFilters(transactions)
        }

        // Mode 2: All for specific year
        if (activeCycleTag === 'all') {
            const yearTransactions = transactions.filter(t => t.tag?.startsWith(selectedYear))
            return applyFilters(yearTransactions)
        }

        // Mode 3: Specific Cycle
        const cycle = debtCycles.find(c => c.tag === activeCycleTag)
        if (!cycle) return []

        return applyFilters(cycle.transactions)
    }, [activeCycleTag, debtCycles, selectedYear, searchTerm, filterType, statusFilter, selectedAccountId, dateRangeFilter, transactions])

    const historyTransactions = useMemo(() => {
        const base = transactions.filter(t => !selectedYear || t.occurred_at?.startsWith(selectedYear))
        return applyFilters(base)
    }, [transactions, selectedYear, searchTerm, filterType, statusFilter, selectedAccountId, dateRangeFilter])


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

    const handleDuplicateTransaction = (input: string | TransactionWithDetails) => {
        const t = typeof input === 'string'
            ? transactions.find(x => x.id === input)
            : input
        if (!t) return

        setSlideMode('duplicate')
        setSelectedTxn(t)
        setSlideOverrideType(undefined)
        setIsSlideOpen(true)
    }

    const handleSlideSuccess = () => {
        // setIsSlideOpen(false) // Handled by onSubmissionStart for immediate feel
        setSelectedTxn(null)
        setSlideOverrideType(undefined)
        router.refresh()
    }

    const handleSubmissionStart = () => {
        setIsSlideOpen(false)
        setIsSubmitting(true)
    }

    const handleSubmissionEnd = () => {
        setIsSubmitting(false)
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
            person_id: selectedTxn.person_id || person.id,
            tag: selectedTxn.tag || undefined,
            cashback_mode: selectedTxn.cashback_mode || "none_back",
            cashback_share_percent: selectedTxn.cashback_share_percent,
            cashback_share_fixed: selectedTxn.cashback_share_fixed,
            metadata: slideMode === 'duplicate' ? { duplicated_from_id: selectedTxn.id } : selectedTxn.metadata,
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

    const activeCycleSheet = useMemo(() => {
        return cycleSheets.find(s => s.cycle_tag === activeCycle.tag)
    }, [cycleSheets, activeCycle.tag])

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
                onYearChange={handleYearChange}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onEdit={() => setIsPersonSlideOpen(true)}
            />

            {/* Content Area */}
            {activeTab === 'timeline' && activeCycle && (
                <>
                    <TransactionControlBar
                        person={person}
                        activeCycle={activeCycle}
                        allCycles={debtCycles}
                        onCycleChange={handleCycleChange}
                        onCycleSelect={handleCycleSelect}
                        availableYears={availableYears}
                        selectedYear={selectedYear}
                        onYearChange={handleYearChange}
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
                        isPending={isPending}
                        initialSheetUrl={activeCycleSheet?.sheet_url}
                    />
                    <div className="flex-1 overflow-y-auto px-4 py-3 relative">
                        {isSubmitting && (
                            <div className="absolute inset-0 bg-white/60 z-50 flex flex-col items-center justify-center backdrop-blur-[1px] animate-in fade-in duration-300">
                                <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 scale-95 animate-in zoom-in-95 duration-300">
                                    <div className="relative">
                                        <div className="h-12 w-12 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1.5 text-center">
                                        <span className="text-base font-black text-slate-900 leading-tight">
                                            {slideMode === 'edit' ? 'Updating...' :
                                                slideMode === 'duplicate' ? 'Duplicating...' :
                                                    'Creating...'}
                                        </span>
                                        <p className="text-xs text-slate-500 font-medium max-w-[160px]">
                                            One moment, syncing with database
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
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
                personId={person.id}
                transactions={transactions}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
            />

            <PeopleSlideV2
                open={isPersonSlideOpen}
                onOpenChange={setIsPersonSlideOpen}
                person={person}
                subscriptions={subscriptions}
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
                operationMode={slideMode}
                editingId={(slideMode === 'edit' && selectedTxn) ? selectedTxn.id : undefined}
                initialData={slideInitialData}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                onSuccess={handleSlideSuccess}
                onSubmissionStart={handleSubmissionStart}
                onSubmissionEnd={handleSubmissionEnd}
            />
            <FlowLegend />
        </div>
    )
}

const FlowLegend = () => (
    <div className="px-6 py-2 border-t border-slate-200 bg-white flex items-center gap-6 text-[11px] text-slate-500 font-medium shrink-0 shadow-[0_-1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 group cursor-help">
            <span className="inline-flex items-center justify-center rounded-[4px] h-5 w-11 text-[9px] font-black bg-orange-50 border border-orange-200 text-orange-700 shadow-sm transition-transform group-hover:scale-105">FROM</span>
            <span className="text-slate-400 font-normal">→ Origin / Source</span>
        </div>
        <div className="flex items-center gap-2 group cursor-help">
            <span className="inline-flex items-center justify-center rounded-[4px] h-5 w-11 text-[9px] font-black bg-sky-50 border border-sky-200 text-sky-700 shadow-sm transition-transform group-hover:scale-105">TO</span>
            <span className="text-slate-400 font-normal">→ Target / Destination</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-slate-300">
            <Info className="h-3.5 w-3.5" />
            <span className="italic">Flow labels are context-aware (Repayment = TO Account)</span>
        </div>
    </div>
)
