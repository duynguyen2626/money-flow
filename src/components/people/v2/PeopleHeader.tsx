import { ChevronLeft, ChevronDown, History, Split, Edit, Calendar, TrendingUp, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Person } from '@/types/moneyflow.types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { StatsPopover } from './StatsPopover'
import { CashbackStatusDisplay } from '@/components/moneyflow/cashback-status-display'
import { formatCycleTag } from '@/lib/cycle-utils'
import { isYYYYMM } from '@/lib/month-tag'

interface PeopleHeaderProps {
    person: Person
    balanceLabel: string
    activeCycle?: {
        tag: string
        remains: number
        stats: {
            lend: number
            repay: number
            originalLend: number
            cashback: number
            paidRollover: number
            receiveRollover: number
        }
    }
    stats: {
        originalLend: number
        cashback: number
        netLend: number
        repay: number
        remains: number
        paidRollover: number
        receiveRollover: number
    }
    selectedYear: string | null
    availableYears: string[]
    onYearChange: (year: string | null) => void
    activeTab: string
    onTabChange: (tab: 'timeline' | 'history' | 'split-bill') => void
    onEdit?: () => void
    cashbackStatus?: {
        earned: number
        cap?: number | null
        currentSpend: number
        minSpend?: number | null
        needToSpend: number
        remaining?: number | null
    } | null
    isSyncing?: boolean
    syncingText?: string | null
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function PeopleHeader({
    person,
    balanceLabel,
    activeCycle,
    stats,
    selectedYear,
    availableYears,
    onYearChange,
    activeTab,
    onTabChange,
    onEdit,
    cashbackStatus,
    isSyncing = false,
    syncingText,
}: PeopleHeaderProps) {
    const formatCycleLabel = (value: string) => (isYYYYMM(value) ? formatCycleTag(value) : value)
    const isNearZero = (value: number) => Math.abs(value) < 100
    const isSpecificCycleView = Boolean(activeCycle && selectedYear !== null && !activeCycle.tag.startsWith('All'))
    const displayedBalanceRaw = isSpecificCycleView ? (activeCycle?.remains ?? 0) : stats.remains
    const displayedBalance = isNearZero(displayedBalanceRaw) ? 0 : displayedBalanceRaw
    const isSettled = Math.abs(stats.remains) < 100
    const totalProgress = Math.max(
        Math.abs(stats.netLend),
        Math.abs(stats.repay) + Math.abs(stats.remains),
        1
    )
    const repayPercent = Math.min(100, Math.round((Math.abs(stats.repay) / totalProgress) * 100))
    const remainsPercent = Math.min(100, Math.round((Math.abs(stats.remains) / totalProgress) * 100))

    // Current Cycle Summary calculations
    const currentCycleNetLend = activeCycle ? activeCycle.stats.lend : 0
    const currentCycleDisplayValueRaw = activeCycle ? activeCycle.remains : 0
    const currentCycleDisplayValue = isNearZero(currentCycleDisplayValueRaw) ? 0 : currentCycleDisplayValueRaw
    const currentCycleProgress = activeCycle ? Math.max(
        Math.abs(activeCycle.stats.repay) + Math.abs(activeCycle.remains),
        1
    ) : 1
    const currentCycleRepayPercent = activeCycle ? Math.min(100, Math.round((Math.abs(activeCycle.stats.repay) / currentCycleProgress) * 100)) : 0
    const currentCycleRemainsPercent = activeCycle ? Math.min(100, Math.round((Math.abs(activeCycle.remains) / currentCycleProgress) * 100)) : 0
    const isCycleSettled = activeCycle ? Math.abs(activeCycle.remains) < 100 : false

    // Format percentage for display inside bar
    const formattedRepayPercent = repayPercent > 0 ? `${repayPercent}%` : ''
    const formattedRemainsPercent = remainsPercent > 0 ? `${remainsPercent}%` : ''

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 sticky top-0 z-60 shadow-sm relative">
            {isSyncing && (
                <div className="absolute top-3 right-4 z-50 pointer-events-none">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white/95 shadow-md">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                            {syncingText || 'Syncing...'}
                        </span>
                    </div>
                </div>
            )}
            {/* Main Header Row */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Left side info groups */}
                <div className="flex flex-col md:flex-row items-stretch gap-4 flex-1">
                    {/* 1. Left: User Info (People Section) */}
                    <div className="flex items-center gap-3 px-4 py-2 border border-slate-200 rounded-xl bg-slate-50/30 shrink-0">
                        <Link
                            href="/people"
                            className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors bg-white shadow-sm"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Link>

                        {person.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={person.image_url} alt={person.name} className="h-10 w-10 rounded-none border border-slate-200 object-cover bg-slate-100 shadow-sm" />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-none border border-slate-200 bg-indigo-50 text-indigo-600 text-lg font-bold shadow-sm">
                                {person.name.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900">{person.name}</h1>
                                <span className={cn(
                                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                                    isSettled
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        : "bg-blue-50 text-blue-700 border-blue-100"
                                )}>
                                    {isSettled ? 'SETTLED' : 'ACTIVE'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 2. Integrated Cycle Summary & Balance Breakdown */}
                    <div className="flex items-center gap-4 px-4 py-2 border border-slate-200 rounded-xl bg-slate-50/30 flex-1 min-w-0 group hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                        {/* Cycle Meta (Tag & History) */}
                        <div className="flex flex-col gap-1 pr-4 border-r border-slate-200 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cycle</span>
                                {activeCycle && (
                                    <span className={cn(
                                        "text-[9px] uppercase font-bold px-2 py-0.5 rounded-full",
                                        isCycleSettled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                    )}>
                                        {formatCycleLabel(activeCycle.tag)}
                                    </span>
                                )}
                            </div>
                            {activeCycle && activeCycle.tag !== new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit' }).format(new Date()) && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[8px] font-black text-slate-500 uppercase tracking-tighter w-fit">
                                    <History className="h-2 w-2" />
                                    Past
                                </div>
                            )}
                        </div>

                        {/* Progress Indicator */}
                        <div className="flex flex-col gap-1.5 min-w-[120px] max-w-[200px] shrink-0">
                            <div className="flex justify-between items-center px-0.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Progress</span>
                                <span className="text-[10px] font-black tabular-nums text-slate-600">
                                    {isCycleSettled ? '100%' : `${currentCycleRepayPercent}%`}
                                </span>
                            </div>
                            {isCycleSettled ? (
                                <div className="h-3 w-full rounded-full border border-emerald-200 bg-emerald-50 text-[8px] font-black text-emerald-700 flex items-center justify-center uppercase tracking-wide">
                                    Settled
                                </div>
                            ) : (
                                <div className="relative flex h-3 w-full overflow-hidden rounded-full bg-slate-200/50 shadow-inner border border-slate-200/50">
                                    <div
                                        className="bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-500"
                                        style={{ width: `${currentCycleRepayPercent}%` }}
                                    />
                                    <div
                                        className="bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)] transition-all duration-500"
                                        style={{ width: `${currentCycleRemainsPercent}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-x-6 gap-y-0.5 px-6 border-r border-slate-200">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Orig. Spend</span>
                                <span className="text-[12px] font-bold text-slate-700 tabular-nums">
                                    {numberFormatter.format(isSpecificCycleView && activeCycle ? activeCycle.stats.originalLend : stats.originalLend)}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Cashback</span>
                                <span className="text-[12px] font-bold text-amber-600 tabular-nums">
                                    -{numberFormatter.format(isSpecificCycleView && activeCycle ? activeCycle.stats.cashback : stats.cashback)}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Net Lend</span>
                                <span className="text-[12px] font-bold text-blue-600 tabular-nums">
                                    {numberFormatter.format(isSpecificCycleView && activeCycle ? activeCycle.stats.lend : stats.netLend)}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Total Repay</span>
                                <span className="text-[12px] font-bold text-emerald-600 tabular-nums">
                                    -{numberFormatter.format(isSpecificCycleView && activeCycle ? activeCycle.stats.repay : stats.repay)}
                                </span>
                            </div>
                        </div>

                        {/* REMAINS Card */}
                        <div className="flex items-center gap-4 pl-2 shrink-0">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">REMAINS</span>
                                {displayedBalance === 0 ? (
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">Settled</span>
                                ) : (
                                    <span className="text-2xl font-black tabular-nums text-rose-600 leading-none drop-shadow-sm group-hover:scale-105 transition-transform">
                                        {numberFormatter.format(displayedBalance)}
                                    </span>
                                )}
                            </div>

                            <StatsPopover
                                originalLend={stats.originalLend}
                                cashback={stats.cashback}
                                netLend={stats.netLend}
                                repay={stats.repay}
                                remains={stats.remains}
                                paidRollover={stats.paidRollover}
                                receiveRollover={stats.receiveRollover}
                                tabs={activeCycle ? [
                                    {
                                        key: 'current',
                                        label: 'Current Cycle',
                                        stats: {
                                            originalLend: activeCycle.stats.originalLend,
                                            cashback: activeCycle.stats.cashback,
                                            netLend: currentCycleNetLend,
                                            repay: activeCycle.stats.repay,
                                            remains: activeCycle.remains,
                                            paidRollover: activeCycle.stats.paidRollover,
                                            receiveRollover: activeCycle.stats.receiveRollover,
                                        },
                                    },
                                    {
                                        key: 'total',
                                        label: selectedYear ? `Year ${selectedYear}` : 'All Time',
                                        stats: {
                                            originalLend: stats.originalLend,
                                            cashback: stats.cashback,
                                            netLend: stats.netLend,
                                            repay: stats.repay,
                                            remains: stats.remains,
                                            paidRollover: stats.paidRollover,
                                            receiveRollover: stats.receiveRollover,
                                        },
                                    }
                                ] : undefined}
                            >
                                <button className="h-8 w-8 rounded-lg border border-slate-200 text-slate-400 bg-white hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center">
                                    <TrendingUp className="h-4 w-4" />
                                </button>
                            </StatsPopover>
                        </div>

                        {/* Reward Progress Integration */}
                        <div className="pl-6 border-l border-slate-200 hidden lg:flex flex-col justify-center min-w-[150px]">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <div className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />
                                Reward Progress
                            </span>
                            {cashbackStatus ? (
                                <CashbackStatusDisplay
                                    earned={cashbackStatus.earned}
                                    cap={cashbackStatus.cap}
                                    currentSpend={cashbackStatus.currentSpend}
                                    minSpend={cashbackStatus.minSpend}
                                    needToSpend={cashbackStatus.needToSpend}
                                    remaining={cashbackStatus.remaining}
                                    variant="header"
                                />
                            ) : (
                                <div className="flex flex-col gap-1">
                                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-slate-300 w-1/3 opacity-20" />
                                    </div>
                                    <span className="text-[9px] font-medium text-slate-400 italic">Select card to view rewards</span>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Right: Tools & Actions */}
                <div className="flex items-center gap-2 ml-auto rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
                    <a
                        href={person.google_sheet_url || person.sheet_link || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                            "h-9 px-3 inline-flex items-center justify-center gap-1.5 border rounded-md text-xs font-medium text-slate-600 transition-colors bg-white shadow-sm whitespace-nowrap",
                            person.google_sheet_url || person.sheet_link
                                ? "border-slate-200 hover:bg-slate-50"
                                : "border-slate-100 text-slate-300 pointer-events-none"
                        )}
                        aria-label="Open sheet in new tab"
                        title="Open sheet"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Sheet
                    </a>

                    <button
                        onClick={() => onTabChange('split-bill')}
                        className={cn(
                            "h-9 px-3 flex items-center gap-1.5 border rounded-md text-xs font-medium transition-colors shadow-sm",
                            activeTab === 'split-bill'
                                ? "bg-slate-800 text-white border-slate-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <Split className="h-3.5 w-3.5" />
                        Split
                    </button>

                    <button
                        onClick={onEdit}
                        className="h-9 px-3 flex items-center gap-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors bg-white whitespace-nowrap shadow-sm"
                    >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                    </button>
                </div>
            </div>
        </div>
    )
}
