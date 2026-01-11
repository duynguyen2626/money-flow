'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Edit, LayoutDashboard, History, UserMinus, Filter, Search, ChevronDown, ArrowLeft, ArrowUpRight, ArrowDownLeft, Gift, Wallet, X, RefreshCw, CheckCircle, Plus } from 'lucide-react'
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
import { ManageSheetButton } from '@/components/people/manage-sheet-button'

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

function getMonthName(tag: string, includeYear: boolean = false) {
    if (!isYYYYMM(tag)) return tag
    const month = parseInt(tag.split('-')[1], 10)
    const date = new Date(2000, month - 1, 1)
    const monthName = date.toLocaleString('en-US', { month: 'short' }).toUpperCase()

    if (includeYear) {
        const year = tag.split('-')[0].slice(2)
        return `${monthName} ${year}`
    }
    return monthName
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

        // Generate ALL 12 months for the target year
        for (let month = 1; month <= 12; month++) {
            const tag = `${targetYear}-${String(month).padStart(2, '0')}`
            const cycle = debtCycles.find(c => c.tag === tag)

            pills.push({
                tag,
                remains: cycle?.remains ?? 0,
                isSettled: cycle?.isSettled ?? true,
                hasData: !!cycle,
            })
        }


        // Sort: For current year, ascending (JAN, FEB, MAR...); For past years, descending (DEC, NOV, OCT...)
        if (targetYear === currentYear) {
            // Current year: Ascending order (JAN, FEB, MAR...)
            pills.sort((a, b) => {
                const aMonth = parseInt(a.tag.split('-')[1])
                const bMonth = parseInt(b.tag.split('-')[1])
                return aMonth - bMonth
            })
        } else {
            // Past years: Descending order (DEC, NOV, OCT...)
            pills.sort((a, b) => {
                const aMonth = parseInt(a.tag.split('-')[1])
                const bMonth = parseInt(b.tag.split('-')[1])
                return bMonth - aMonth
            })
        }

        return pills
    }, [debtCycles, selectedYear])

    // Outstanding debts from previous years
    const outstandingFromPreviousYears = useMemo(() => {
        if (!selectedYear) return []
        const targetYear = parseInt(selectedYear)
        if (isNaN(targetYear)) return []

        return debtCycles.filter(cycle => {
            if (!isYYYYMM(cycle.tag)) return false
            const [yearStr] = cycle.tag.split('-')
            const year = parseInt(yearStr)
            return year < targetYear && !cycle.isSettled && Math.abs(cycle.remains) > 100
        }).sort((a, b) => b.tagDateVal - a.tagDateVal)
    }, [debtCycles, selectedYear])

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
                const amount = Math.abs(Number(t.amount) || 0)
                let cashback = 0

                // Calculate actual cashback
                if (t.final_price !== null && t.final_price !== undefined) {
                    const effectiveFinal = Math.abs(Number(t.final_price))
                    if (amount > effectiveFinal) {
                        cashback = amount - effectiveFinal
                    }
                } else if (t.cashback_share_amount) {
                    cashback = Number(t.cashback_share_amount)
                } else if (t.cashback_share_percent && t.cashback_share_percent > 0) {
                    cashback = amount * t.cashback_share_percent
                }

                // Include income-based cashback
                if (t.type === 'income' && (t.note?.toLowerCase().includes('cashback') || (t.metadata as any)?.is_cashback)) {
                    cashback += amount
                }

                return cashback > 0
            })
        }

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
    }, [activeCycle, filterType, searchTerm])

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

                        {person.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={person.image_url} alt={person.name} className="h-9 w-9 rounded-lg object-cover" />
                        ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-base font-bold text-blue-600">
                                {person.name.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-slate-900">{person.name}</h1>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase", Math.abs(balance) < 100 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                                {Math.abs(balance) < 100 ? 'SETTLED' : 'ACTIVE'}
                            </span>
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



                        {/* Timeline Pills - Vertical Expansion */}
                        <div className="flex-1 flex flex-col gap-2">
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                                {/* First 6 months */}
                                {timelinePills.slice(0, 6).map((pill) => {
                                    const isActive = activeCycleTag === pill.tag
                                    const isSettled = pill.isSettled

                                    return (
                                        <button
                                            key={pill.tag}
                                            onClick={() => setActiveCycleTag(pill.tag)}
                                            className={cn(
                                                "flex-shrink-0 flex items-center gap-2 h-10 px-3 rounded-lg border transition-all whitespace-nowrap text-xs min-w-[140px]",
                                                isActive ? "bg-indigo-900 border-indigo-900 text-white shadow-lg" : isSettled ? "bg-white border-slate-200 text-slate-400" : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                                            )}
                                        >
                                            <span className={cn("font-bold uppercase", isActive ? "text-indigo-200" : "text-slate-500")}>
                                                {getMonthName(pill.tag)}:
                                            </span>
                                            {!pill.hasData ? (
                                                <span className={cn("text-[10px] font-medium italic", isActive ? "text-indigo-300" : "text-slate-400")}>No Data</span>
                                            ) : isSettled ? (
                                                <span className={cn("font-bold uppercase", isActive ? "text-emerald-300" : "text-emerald-600")}>SETTLED</span>
                                            ) : (
                                                <span className={cn("font-bold", isActive ? "text-white" : "text-slate-900")}>
                                                    {numberFormatter.format(Math.max(0, pill.remains))}
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}

                                {/* Outstanding Debts - Inline before More */}
                                {outstandingFromPreviousYears.length > 0 && outstandingFromPreviousYears.map((cycle) => (
                                    <button
                                        key={cycle.tag}
                                        onClick={() => {
                                            setSelectedYear(cycle.tag.split('-')[0])
                                            setActiveCycleTag(cycle.tag)
                                        }}
                                        className="flex-shrink-0 flex items-center gap-1.5 h-10 px-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 transition-colors text-xs min-w-[120px]"
                                    >
                                        <span className="font-bold">{getMonthName(cycle.tag, true)}</span>
                                        <span className="bg-white/60 px-1 rounded text-[9px] font-bold">UNPAID</span>
                                        <span className="font-bold tabular-nums">
                                            {numberFormatter.format(Math.abs(cycle.remains))}
                                        </span>
                                    </button>
                                ))}

                                {/* Back to Current Year - Before More */}
                                {selectedYear && selectedYear !== new Date().getFullYear().toString() && (
                                    <button
                                        onClick={() => setSelectedYear(new Date().getFullYear().toString())}
                                        className="flex-shrink-0 h-10 px-3 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium min-w-[140px] flex items-center justify-center gap-1.5"
                                    >
                                        <ArrowLeft className="h-3 w-3" />
                                        <span>Back to {new Date().getFullYear()}</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => setShowAllMonths(!showAllMonths)}
                                    className="flex-shrink-0 h-10 px-3 rounded-lg border border-slate-200 bg-white text-slate-500 text-xs font-medium hover:bg-slate-50 min-w-[80px] flex items-center justify-center gap-1"
                                >
                                    {showAllMonths ? (
                                        <>
                                            <ChevronDown className="h-3 w-3 rotate-180" />
                                            <span>LESS</span>
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="h-3 w-3" />
                                            <span>MORE</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Remaining 6 months - Vertical Expansion */}
                            {showAllMonths && (
                                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                                    {timelinePills.slice(6).map((pill) => {
                                        const isActive = activeCycleTag === pill.tag
                                        const isSettled = pill.isSettled

                                        return (
                                            <button
                                                key={pill.tag}
                                                onClick={() => setActiveCycleTag(pill.tag)}
                                                className={cn(
                                                    "flex-shrink-0 flex items-center gap-2 h-10 px-3 rounded-lg border transition-all whitespace-nowrap text-xs min-w-[140px]",
                                                    isActive ? "bg-indigo-900 border-indigo-900 text-white shadow-lg" : isSettled ? "bg-white border-slate-200 text-slate-400" : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                                                )}
                                            >
                                                <span className={cn("font-bold uppercase", isActive ? "text-indigo-200" : "text-slate-500")}>
                                                    {getMonthName(pill.tag)}:
                                                </span>
                                                {!pill.hasData ? (
                                                    <span className={cn("text-[10px] font-medium italic", isActive ? "text-indigo-300" : "text-slate-400")}>No Data</span>
                                                ) : isSettled ? (
                                                    <span className={cn("font-bold uppercase", isActive ? "text-emerald-300" : "text-emerald-600")}>SETTLED</span>
                                                ) : (
                                                    <span className={cn("font-bold", isActive ? "text-white" : "text-slate-900")}>
                                                        {numberFormatter.format(Math.max(0, pill.remains))}
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
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
                            {/* Left: Month Name + Paid Badge + Filter Buttons */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900">{getMonthName(activeCycle.tag)}</h2>

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

                                {/* Filter Buttons */}
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

                                {/* LEND Filter Button */}
                                <button
                                    onClick={() => setFilterType('lend')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all border-2",
                                        filterType === 'lend'
                                            ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                                            : "border-blue-300 text-blue-700 hover:bg-blue-500 hover:text-white hover:border-blue-500"
                                    )}
                                >
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                    <span className="font-medium">LEND:</span>
                                    <span className="font-bold">{numberFormatter.format(activeCycle.stats.lend)}</span>
                                </button>

                                {/* REPAY Filter Button */}
                                <button
                                    onClick={() => setFilterType('repay')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all border-2",
                                        filterType === 'repay'
                                            ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                            : "border-emerald-300 text-emerald-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
                                    )}
                                >
                                    <ArrowDownLeft className="h-3.5 w-3.5" />
                                    <span className="font-medium">REPAY:</span>
                                    <span className="font-bold">{numberFormatter.format(activeCycle.stats.repay)}</span>
                                </button>

                                {/* Cashback Filter Button */}
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
                                    <span className="text-amber-600 font-bold">
                                        {numberFormatter.format(
                                            activeCycle.transactions.reduce((sum, t) => {
                                                const amount = Math.abs(Number(t.amount) || 0)
                                                let cashback = 0

                                                if (t.final_price !== null && t.final_price !== undefined) {
                                                    const effectiveFinal = Math.abs(Number(t.final_price))
                                                    if (amount > effectiveFinal) {
                                                        cashback = amount - effectiveFinal
                                                    }
                                                } else if (t.cashback_share_amount) {
                                                    cashback = Number(t.cashback_share_amount)
                                                } else if (t.cashback_share_percent && t.cashback_share_percent > 0) {
                                                    cashback = amount * t.cashback_share_percent
                                                }

                                                if (t.type === 'income' && (t.note?.toLowerCase().includes('cashback') || (t.metadata as any)?.is_cashback)) {
                                                    cashback += amount
                                                }

                                                return sum + cashback
                                            }, 0)
                                        )}
                                    </span>
                                </button>
                            </div>

                            {/* Right: Action Buttons + Search */}
                            <div className="flex items-center gap-2">
                                {/* Rollover Button */}
                                {activeCycle.remains > 100 && (
                                    <RolloverDebtDialog
                                        personId={person.id}
                                        currentCycle={activeCycle.tag}
                                        remains={activeCycle.remains}
                                        trigger={
                                            <button className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium border-2 border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors">
                                                <RefreshCw className="h-3.5 w-3.5" />
                                                Rollover
                                            </button>
                                        }
                                    />
                                )}

                                {/* Debt Button */}
                                <AddTransactionDialog
                                    accounts={accounts}
                                    categories={categories}
                                    people={[person]}
                                    shops={shops}
                                    buttonText="Debt"
                                    defaultType="debt"
                                    defaultPersonId={person.id}
                                    buttonClassName="h-8 px-3 text-xs border-2 border-slate-300 hover:border-slate-400"
                                    asChild
                                    triggerContent={
                                        <button className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium border-2 border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors">
                                            <UserMinus className="h-3.5 w-3.5" />
                                            Debt
                                        </button>
                                    }
                                />

                                {/* Repay Button */}
                                <AddTransactionDialog
                                    accounts={accounts}
                                    categories={categories}
                                    people={[person]}
                                    shops={shops}
                                    buttonText="Repay"
                                    defaultType="repayment"
                                    defaultPersonId={person.id}
                                    buttonClassName="h-8 px-3 text-xs border-2 border-slate-300 hover:border-slate-400"
                                    asChild
                                    triggerContent={
                                        <button className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium border-2 border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors">
                                            <Plus className="h-3.5 w-3.5" />
                                            Repay
                                        </button>
                                    }
                                />

                                {/* Sheet Button - Manage Sheet Modal */}
                                <ManageSheetButton
                                    personId={person.id}
                                    cycleTag={activeCycle.tag}
                                    scriptLink={person.sheet_link}
                                    googleSheetUrl={person.google_sheet_url}
                                    sheetFullImg={person.sheet_full_img}
                                    showBankAccount={person.sheet_show_bank_account ?? false}
                                    showQrImage={person.sheet_show_qr_image ?? false}
                                    size="sm"
                                    buttonClassName="flex items-center gap-1.5 h-8 px-3 text-xs font-medium border-2 border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors"
                                    linkedLabel="Sheet"
                                    unlinkedLabel="Sheet"
                                />

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
                        context="person"
                        contextId={person.id}
                    />
                </div>
            )}

            {activeTab === 'history' && (
                <div className="flex-1 overflow-y-auto px-4 py-3">
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
        </div>
    )
}
