import { ChevronLeft, ChevronDown, History, Split, Edit, LayoutDashboard, UserMinus, FileText, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Person } from '@/types/moneyflow.types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { EditPersonDialog } from '@/components/people/edit-person-dialog'
import { StatsPopover } from './StatsPopover'

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
        }
    }
    stats: {
        originalLend: number
        cashback: number
        netLend: number
        repay: number
        remains: number
    }
    selectedYear: string | null
    availableYears: string[]
    onYearChange: (year: string | null) => void
    activeTab: string
    onTabChange: (tab: 'timeline' | 'history' | 'split-bill') => void
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
}: PeopleHeaderProps) {
    const isSettled = Math.abs(stats.remains) < 100
    const totalProgress = Math.max(
        Math.abs(stats.netLend),
        Math.abs(stats.repay) + Math.abs(stats.remains),
        1
    )
    const repayPercent = Math.min(100, Math.round((Math.abs(stats.repay) / totalProgress) * 100))
    const remainsPercent = Math.min(100, Math.round((Math.abs(stats.remains) / totalProgress) * 100))

    // Current Cycle Summary calculations
    const currentCycleNetLend = activeCycle ? activeCycle.stats.originalLend - activeCycle.stats.cashback : 0
    const currentCycleProgress = activeCycle ? Math.max(
        Math.abs(currentCycleNetLend),
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
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 sticky top-0 z-20 shadow-sm">
            {/* First Row: User Info + Stats + Tools */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {/* Left: User Info */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/people"
                        className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>

                    {person.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={person.image_url} alt={person.name} className="h-10 w-10 rounded-sm object-cover bg-slate-100" />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-indigo-50 text-indigo-600 text-lg font-bold">
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

                {/* Center: Current Cycle + Total Lended Stats */}
                <div className="flex items-center gap-0 px-0 hidden md:flex">
                    {/* Current Cycle Section (if active cycle exists and year selected) */}
                    {activeCycle && selectedYear !== null && (
                        <div className="flex items-center gap-3 px-4 border-r border-slate-100">
                            <StatsPopover
                                originalLend={activeCycle.stats.originalLend}
                                cashback={activeCycle.stats.cashback}
                                netLend={currentCycleNetLend}
                                repay={activeCycle.stats.repay}
                                remains={activeCycle.remains}
                            >
                                <button className="flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 text-amber-600 hover:bg-amber-50 transition-colors" title="Current cycle details">
                                    <Calendar className="h-3.5 w-3.5" />
                                </button>
                            </StatsPopover>
                            
                            <div className="flex flex-col gap-1.5 min-w-[320px]">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Cycle</span>
                                    <span className={cn(
                                        "text-[9px] uppercase font-bold px-2 py-0.5 rounded-full",
                                        isCycleSettled
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-amber-100 text-amber-700"
                                    )}>
                                        {activeCycle.tag}
                                    </span>
                                    <span className="text-sm font-bold text-slate-900 ml-auto tabular-nums">
                                        {numberFormatter.format(currentCycleNetLend)}
                                    </span>
                                </div>
                                <div className="relative flex h-5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div 
                                        className="bg-emerald-500 flex items-center justify-center text-[9px] font-bold text-white" 
                                        style={{ width: `${currentCycleRepayPercent}%` }}
                                    >
                                        {currentCycleRepayPercent > 15 && `${currentCycleRepayPercent}%`}
                                    </div>
                                    <div 
                                        className="bg-rose-500 flex items-center justify-center text-[9px] font-bold text-white" 
                                        style={{ width: `${currentCycleRemainsPercent}%` }}
                                    >
                                        {currentCycleRemainsPercent > 15 && `${currentCycleRemainsPercent}%`}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Total Balance Section (1 line only, with report icon) */}
                    <div className="flex items-center gap-3 px-4 min-w-[320px]">
                        <StatsPopover
                            originalLend={stats.originalLend}
                            cashback={stats.cashback}
                            netLend={stats.netLend}
                            repay={stats.repay}
                            remains={stats.remains}
                        >
                            <button className="flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 text-emerald-600 hover:bg-emerald-50 transition-colors" title="Balance for entire selected year">
                                <TrendingUp className="h-3.5 w-3.5" />
                            </button>
                        </StatsPopover>
                        <div className="flex items-center gap-2 flex-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Balance ({selectedYear ? 'Year' : 'All Time'})</span>
                            <span className="text-sm font-bold text-slate-900 ml-auto tabular-nums">
                                {numberFormatter.format(stats.netLend)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Tools & Actions */}
                <div className="flex items-center gap-2 ml-auto">
                    {/* Year Filter */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="h-9 px-3 flex items-center gap-2 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors text-xs font-medium">
                                <span className="font-bold">{selectedYear || 'All Time'}</span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-32 p-1" align="end">
                            <button
                                onClick={() => onYearChange(null)}
                                className={cn(
                                    "w-full text-left px-3 py-2 rounded-sm text-xs",
                                    !selectedYear ? "bg-slate-100 font-bold" : "hover:bg-slate-50"
                                )}
                            >
                                All Time
                            </button>
                            {availableYears.map(year => (
                                <button
                                    key={year}
                                    onClick={() => onYearChange(year)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-sm text-xs",
                                        selectedYear === year ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-50"
                                    )}
                                >
                                    {year}
                                </button>
                            ))}
                        </PopoverContent>
                    </Popover>

                    <div className="h-8 w-px bg-slate-200 mx-1" />

                    {/* Action Buttons */}
                    <button
                        onClick={() => onTabChange('history')}
                        className={cn(
                            "h-9 px-3 flex items-center gap-1.5 border rounded-md text-xs font-medium transition-colors",
                            activeTab === 'history'
                                ? "bg-slate-800 text-white border-slate-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <History className="h-3.5 w-3.5" />
                        History
                    </button>

                    <button
                        onClick={() => onTabChange('split-bill')}
                        className={cn(
                            "h-9 px-3 flex items-center gap-1.5 border rounded-md text-xs font-medium transition-colors",
                            activeTab === 'split-bill'
                                ? "bg-slate-800 text-white border-slate-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <UserMinus className="h-3.5 w-3.5" />
                        Split
                    </button>

                    <EditPersonDialog
                        person={person}
                        subscriptions={[]}
                        trigger={
                            <button className="h-9 px-3 flex items-center gap-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors bg-white">
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                            </button>
                        }
                    />
                </div>
            </div>
        </div>
    )
}
