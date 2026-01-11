'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Edit, LayoutDashboard, History, UserMinus, Filter, Search, ChevronDown, ArrowLeft, ArrowUpRight, ArrowDownLeft, Gift, Wallet, X, RefreshCw, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Person, TransactionWithDetails, PersonCycleSheet } from '@/types/moneyflow.types'
import { usePersonDetails } from '@/hooks/use-person-details'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { isYYYYMM } from '@/lib/month-tag'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { SplitBillManager } from '@/components/people/split-bill-manager'
import { RolloverDebtDialog } from '@/components/people/rollover-debt-dialog'
import { SimpleTransactionTable } from '@/components/people/v2/SimpleTransactionTable'
import { PaidTransactionsModal } from '@/components/people/paid-transactions-modal'

interface MemberDetailViewProps {
    person: Person
    balance: number
    balanceLabel: string
    transactions: TransactionWithDetails[]
    debtTags: any[]
    cycleSheets: PersonCycleSheet[]
    accounts: any[]
    categories: any[]
    people: Person[]
    shops: any[]
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

function getMonthName(tag: string) {
    if (!isYYYYMM(tag)) return tag
    const month = parseInt(tag.split('-')[1], 10)
    const year = tag.split('-')[0].slice(2)
    const date = new Date(2000, month - 1, 1)
    return `${date.toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${year}`
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
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'timeline' | 'history' | 'split-bill'>('timeline')
    const [selectedYear, setSelectedYear] = useState<string | null>(new Date().getFullYear().toString())
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<'all' | 'lend' | 'repay' | 'cashback'>('all')
    const [showAllMonths, setShowAllMonths] = useState(false)
    const [showPaidModal, setShowPaidModal] = useState(false)

    const { metrics, debtCycles, availableYears } = usePersonDetails({
        person,
        transactions,
        debtTags,
        cycleSheets,
    })

    // Generate timeline pills based on selected year
    const timelinePills = useMemo(() => {
        const now = new Date()
        const currentYear = now.getFullYear()
        const targetYear = selectedYear ? parseInt(selectedYear) : currentYear
        const pills: Array<{ tag: string; remains: number; isSettled: boolean; hasData: boolean }> = []

        const monthsToShow = showAllMonths ? 12 : 6

        // If viewing current year, start from current month and go back
        // If viewing past year, start from December and go back
        const startMonth = targetYear === currentYear ? now.getMonth() : 11

        for (let i = 0; i < monthsToShow; i++) {
            const monthIndex = startMonth - i
            const date = new Date(targetYear, monthIndex, 1)
            const tag = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

            // Find matching cycle
            const cycle = debtCycles.find(c => c.tag === tag)

            pills.push({
                tag,
                remains: cycle?.remains ?? 0,
                isSettled: cycle?.isSettled ?? true, // Default to settled if no data
                hasData: !!cycle,
            })
        }

        return pills
    }, [debtCycles, selectedYear, showAllMonths])

    // Active cycle
    const [activeCycleTag, setActiveCycleTag] = useState<string>(() => {
        const now = new Date()
        const currentTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const match = debtCycles.find(c => c.tag === currentTag)
        return match ? match.tag : (debtCycles[0]?.tag || currentTag)
    })

    const activeCycle = debtCycles.find(c => c.tag === activeCycleTag)

    // Transactions for active cycle
    const cycleTransactions = useMemo(() => {
        if (!activeCycle) return []
        let txns = activeCycle.transactions

        // Apply filter type
        if (filterType === 'lend') {
            txns = txns.filter(t => {
                const isDebt = t.type === 'debt'
                const amount = Number(t.amount) || 0
                return (isDebt && amount < 0) || (t.type === 'expense' && !!t.person_id)
            })
        } else if (filterType === 'repay') {
            txns = txns.filter(t => t.type === 'repayment' || (t.type === 'debt' && (Number(t.amount) || 0) > 0) || (t.type === 'income' && !!t.person_id))
        } else if (filterType === 'cashback') {
            txns = txns.filter(t => {
                const hasCashback = t.final_price !== null || t.cashback_share_amount || (t.cashback_share_percent && t.cashback_share_percent > 0)
                return hasCashback
            })
        }

        return txns
    }, [activeCycle, filterType])

    const balanceClass = balance > 0 ? 'text-rose-600' : balance < 0 ? 'text-emerald-600' : 'text-slate-600'

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* HEADER */}
            <div className="flex-none bg-white border-b border-slate-200">
                {/* Line 1: Name + Tabs */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <Link href="/people" className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                            <ChevronLeft className="h-5 w-5" />
                        </Link>

                        {person.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={person.avatar_url} alt={person.name} className="h-9 w-9 rounded-lg object-cover" />
                        ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-base font-bold text-blue-600">
                                {person.name.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-slate-900">{person.name}</h1>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase", balance === 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                                {balance === 0 ? 'SETTLED' : 'ACTIVE'}
                            </span>

                            {/* +X Paid Badge - Clickable */}
                            {metrics.paidCount > 0 && (
                                <button
                                    onClick={() => setShowPaidModal(true)}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 transition-colors cursor-pointer"
                                >
                                    +{metrics.paidCount} Paid
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tabs - Compact */}
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors rounded-md", activeTab === 'timeline' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
                        >
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            TIMELINE
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors rounded-md", activeTab === 'history' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
                        >
                            <History className="h-3.5 w-3.5" />
                            HISTORY
                        </button>
                        <button
                            onClick={() => setActiveTab('split-bill')}
                            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors rounded-md", activeTab === 'split-bill' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
                        >
                            <UserMinus className="h-3.5 w-3.5" />
                            SPLIT BILL
                        </button>
                        <button className="flex items-center justify-center h-7 w-7 rounded-md text-slate-500 hover:bg-slate-100 transition-colors ml-1">
                            <Edit className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Line 2: Filter + Timeline Pills (Grouped & Bordered) */}
                <div className="px-4 py-2">
                    <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
                        {/* Year Filter */}
                        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                            <PopoverTrigger asChild>
                                <button className="flex-shrink-0 h-9 rounded-full border bg-white px-3 flex items-center gap-1.5 text-xs font-medium shadow-sm border-slate-200 text-slate-600 hover:bg-slate-50">
                                    <Filter className="h-3 w-3" />
                                    <span className="font-bold">{selectedYear || 'All'}</span>
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="start">
                                <div className="space-y-1">
                                    <button className={cn("w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors", !selectedYear ? "bg-slate-100 font-bold" : "hover:bg-slate-50")} onClick={() => { setSelectedYear(null); setIsFilterOpen(false); }}>
                                        All Years
                                    </button>
                                    {availableYears.map(year => (
                                        <button key={year} className={cn("w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors", selectedYear === year ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-50")} onClick={() => { setSelectedYear(year); setIsFilterOpen(false); }}>
                                            {year}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Back to Current Year Button */}
                        {selectedYear && selectedYear !== new Date().getFullYear().toString() && (
                            <button
                                onClick={() => setSelectedYear(new Date().getFullYear().toString())}
                                className="flex-shrink-0 h-9 rounded-full border bg-indigo-50 border-indigo-200 px-3 flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                            >
                                <ArrowLeft className="h-3 w-3" />
                                <span>Back to {new Date().getFullYear()}</span>
                            </button>
                        )}

                        {/* Timeline Pills - Show ALL 6 in ONE ROW */}
                        <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                            {timelinePills.map((pill) => {
                                const isActive = activeCycleTag === pill.tag
                                const isSettled = pill.isSettled

                                return (
                                    <button
                                        key={pill.tag}
                                        onClick={() => setActiveCycleTag(pill.tag)}
                                        className={cn(
                                            "flex-shrink-0 flex items-center gap-2 h-10 px-3 rounded-lg border transition-all whitespace-nowrap text-xs",
                                            isActive ? "bg-indigo-900 border-indigo-900 text-white shadow-lg" : isSettled ? "bg-white border-slate-200 text-slate-400" : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                                        )}
                                    >
                                        <span className={cn("font-bold uppercase", isActive ? "text-indigo-200" : "text-slate-500")}>
                                            {getMonthName(pill.tag)}:
                                        </span>
                                        {isSettled ? (
                                            <span className={cn("font-bold uppercase", isActive ? "text-emerald-300" : "text-emerald-600")}>SETTLED</span>
                                        ) : (
                                            <span className={cn("font-bold", isActive ? "text-white" : "text-slate-900")}>
                                                {numberFormatter.format(Math.max(0, pill.remains))}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}

                            <button
                                onClick={() => setShowAllMonths(!showAllMonths)}
                                className="flex-shrink-0 h-10 px-3 rounded-lg border border-slate-200 bg-white text-slate-500 text-xs font-medium hover:bg-slate-50"
                            >
                                {showAllMonths ? 'LESS <' : 'MORE >'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: Cycle Stats + Transaction Table */}
            {activeTab === 'timeline' && activeCycle && (
                <div className="flex-1 overflow-y-auto px-4 py-3">
                    {/* Cycle Header - Single Row */}
                    <div className="bg-white rounded-lg border border-slate-200 p-3 mb-3">
                        <div className="flex items-center justify-between">
                            {/* Left: Month Name + Clickable Stats */}
                            <div className="flex items-center gap-4">
                                <h2 className="text-base font-bold text-slate-900">{getMonthName(activeCycle.tag)}</h2>

                                {/* Clickable Stats with Borders & Icons */}
                                <button
                                    onClick={() => setFilterType('all')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all border",
                                        filterType === 'all'
                                            ? "bg-rose-50 text-rose-700 border-rose-200 shadow-sm"
                                            : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                    )}
                                >
                                    <Wallet className="h-3.5 w-3.5" />
                                    <span className="text-slate-500 font-medium">REMAINS:</span>
                                    <span className="text-rose-600 font-bold">{numberFormatter.format(activeCycle.remains)}</span>
                                </button>

                                <button
                                    onClick={() => setFilterType('lend')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all border",
                                        filterType === 'lend'
                                            ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                                            : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                    )}
                                >
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                    <span className="text-slate-500 font-medium">LEND:</span>
                                    <span className="text-slate-900 font-bold">{numberFormatter.format(activeCycle.stats.lend)}</span>
                                </button>

                                <button
                                    onClick={() => setFilterType('repay')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all border",
                                        filterType === 'repay'
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
                                            : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                    )}
                                >
                                    <ArrowDownLeft className="h-3.5 w-3.5" />
                                    <span className="text-slate-500 font-medium">REPAY:</span>
                                    <span className="text-emerald-600 font-bold">{numberFormatter.format(activeCycle.stats.repay)}</span>
                                </button>

                                <button
                                    onClick={() => setFilterType('cashback')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all border",
                                        filterType === 'cashback'
                                            ? "bg-amber-50 text-amber-700 border-amber-200 shadow-sm"
                                            : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                    )}
                                >
                                    <Gift className="h-3.5 w-3.5" />
                                    <span className="text-slate-500 font-medium">CASHBACK:</span>
                                    <span className="text-amber-600 font-bold">{numberFormatter.format(activeCycle.transactions.reduce((sum, t) => {
                                        let cashback = 0
                                        const amount = Math.abs(Number(t.amount) || 0)
                                        if (t.final_price !== null && t.final_price !== undefined) {
                                            const effectiveFinal = Math.abs(Number(t.final_price))
                                            if (amount > effectiveFinal) cashback = amount - effectiveFinal
                                        } else if (t.cashback_share_amount) {
                                            cashback = Number(t.cashback_share_amount)
                                        } else if (t.cashback_share_percent && t.cashback_share_percent > 0) {
                                            cashback = amount * t.cashback_share_percent
                                        }
                                        return sum + cashback
                                    }, 0))}</span>
                                </button>

                                <button
                                    onClick={() => setShowPaidModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                >
                                    <CheckCircle className="h-3.5 w-3.5 text-purple-500" />
                                    <span className="text-slate-500 font-medium">PAID:</span>
                                    <span className="text-purple-600 font-bold">{metrics.paidCount}</span>
                                </button>
                            </div>

                            {/* Right: Action Buttons */}
                            <div className="flex items-center gap-2">
                                {/* Rollover Button - Only if unsettled debt */}
                                {activeCycle.remains > 0 && (
                                    <RolloverDebtDialog
                                        personId={person.id}
                                        currentCycle={activeCycle.tag}
                                        remains={activeCycle.remains}
                                        trigger={
                                            <button className="h-8 px-3 text-xs font-medium border rounded-md hover:bg-slate-50 flex items-center gap-1.5">
                                                <RefreshCw className="h-3.5 w-3.5" />
                                                Rollover
                                            </button>
                                        }
                                    />
                                )}

                                <AddTransactionDialog
                                    accounts={accounts}
                                    categories={categories}
                                    people={[person]}
                                    shops={shops}
                                    buttonText="Debt"
                                    defaultType="debt"
                                    defaultPersonId={person.id}
                                    buttonClassName="h-8 px-3 text-xs"
                                />
                                <AddTransactionDialog
                                    accounts={accounts}
                                    categories={categories}
                                    people={[person]}
                                    shops={shops}
                                    buttonText="Repay"
                                    defaultType="repayment"
                                    defaultPersonId={person.id}
                                    buttonClassName="h-8 px-3 text-xs"
                                />
                                <button className="h-8 px-3 text-xs font-medium border rounded-md hover:bg-slate-50">Sheet</button>

                                {/* Search with Clear Button */}
                                <div className="relative">
                                    <Input
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-8 w-48 text-xs pr-8"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Table */}
                    <SimpleTransactionTable
                        transactions={cycleTransactions}
                        accounts={accounts}
                        categories={categories}
                        people={people}
                        shops={shops}
                        searchTerm={searchTerm}
                    />
                </div>
            )}

            {activeTab === 'history' && (
                <div className="flex-1 overflow-y-auto px-4 py-3">
                    <SimpleTransactionTable
                        transactions={transactions}
                        accounts={accounts}
                        categories={categories}
                        people={people}
                        shops={shops}
                        searchTerm={searchTerm}
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
        </div>
    )
}
