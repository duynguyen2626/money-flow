'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Person, TransactionWithDetails, PersonCycleSheet, Account, Category, Shop } from '@/types/moneyflow.types'
import { usePersonDetails } from '@/hooks/use-person-details'
import { SplitBillManager } from '@/components/people/split-bill-manager'
import { SimpleTransactionTable } from '@/components/people/v2/SimpleTransactionTable'
import { PaidTransactionsModal } from '@/components/people/paid-transactions-modal'
import { PeopleHeader } from '@/components/people/v2/PeopleHeader'
import { TransactionControlBar } from '@/components/people/v2/TransactionControlBar'
import { toYYYYMMFromDate } from '@/lib/month-tag'
import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'
import { FilterType } from '@/components/transactions-v2/header/TypeFilterDropdown'
import { StatusFilter } from '@/components/transactions-v2/header/StatusDropdown'

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

    // Slide State
    const [isSlideOpen, setIsSlideOpen] = useState(false)
    const [slideMode, setSlideMode] = useState<'add' | 'edit' | 'duplicate'>('add')
    const [selectedTxn, setSelectedTxn] = useState<TransactionWithDetails | null>(null)
    const [slideOverrideType, setSlideOverrideType] = useState<string | undefined>(undefined)

    const router = useRouter()

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

    // Active cycle
    const currentMonthTag = toYYYYMMFromDate(new Date())
    const [activeCycleTag, setActiveCycleTag] = useState<string>(() => {
        const match = debtCycles.find(c => c.tag === currentMonthTag)
        return match ? match.tag : (debtCycles[0]?.tag || currentMonthTag)
    })

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

        return result
    }

    // Transactions for active cycle
    const cycleTransactions = useMemo(() => {
        if (!activeCycle) return []
        return applyFilters(activeCycle.transactions)
    }, [activeCycle, searchTerm, filterType, statusFilter, selectedAccountId])

    const historyTransactions = useMemo(() => {
        const base = transactions.filter(t => !selectedYear || t.occurred_at?.startsWith(selectedYear))
        return applyFilters(base)
    }, [transactions, selectedYear, searchTerm, filterType, statusFilter, selectedAccountId])

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
