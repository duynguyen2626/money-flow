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

    // Active cycle
    const currentMonthTag = toYYYYMMFromDate(new Date())
    const [activeCycleTag, setActiveCycleTag] = useState<string>(() => {
        const match = debtCycles.find(c => c.tag === currentMonthTag)
        return match ? match.tag : (debtCycles[0]?.tag || currentMonthTag)
    })

    const activeCycle = debtCycles.find(c => c.tag === activeCycleTag)

    // Transactions for active cycle
    const cycleTransactions = useMemo(() => {
        if (!activeCycle) return []
        let txns = activeCycle.transactions

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            txns = txns.filter(t =>
                t.note?.toLowerCase().includes(term) ||
                t.shop?.name?.toLowerCase().includes(term) ||
                t.category?.name?.toLowerCase().includes(term)
            )
        }

        return txns
    }, [activeCycle, searchTerm])

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
            return {
                type: slideOverrideType as any,
                occurred_at: new Date(),
                amount: 0,
                cashback_mode: "none_back" as const,
                person_id: person.id, // Default person
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
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
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
                        transactions={transactions.filter(t => !selectedYear || t.occurred_at?.startsWith(selectedYear))}
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

            {/* Paid Transactions Modal */}
            <PaidTransactionsModal
                open={showPaidModal}
                onOpenChange={setShowPaidModal}
                transactions={transactions}
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
