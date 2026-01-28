import { ChevronLeft, ChevronDown, History, Split, Edit, LayoutDashboard, UserMinus, FileText } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Person } from '@/types/moneyflow.types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { EditPersonDialog } from '@/components/people/edit-person-dialog'
import { StatsPopover } from './StatsPopover'

interface PeopleHeaderProps {
    person: Person
    balanceLabel: string
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
    stats,
    selectedYear,
    availableYears,
    onYearChange,
    activeTab,
    onTabChange,
}: PeopleHeaderProps) {
    const isSettled = Math.abs(stats.remains) < 100

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between sticky top-0 z-20 shadow-sm">
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
                    <img src={person.image_url} alt={person.name} className="h-10 w-10 rounded-lg object-cover bg-slate-100" />
                ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-lg font-bold">
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

            {/* Center: Key Stats */}
            <div className="flex items-center gap-8 px-4 border-l border-r border-slate-100 mx-4 hidden md:flex">
                {/* Net Lend */}
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Lend</span>
                    <span className="text-base font-bold text-slate-900">
                        {numberFormatter.format(stats.netLend)}
                    </span>
                </div>

                {/* Repay */}
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-wider">Repay</span>
                    <span className="text-base font-bold text-emerald-600">
                        {numberFormatter.format(stats.repay)}
                    </span>
                </div>

                {/* Remains + Popover */}
                <StatsPopover
                    originalLend={stats.originalLend}
                    cashback={stats.cashback}
                    netLend={stats.netLend}
                    repay={stats.repay}
                    remains={stats.remains}
                >
                    <button className="flex items-end gap-1 group text-left hover:bg-slate-50 rounded-lg p-1 -m-1 transition-colors outline-none">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-rose-600/70 uppercase tracking-wider">Remains</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-rose-600">
                                    {numberFormatter.format(stats.remains)}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center justify-center h-6 w-6 rounded bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors ml-1 mb-0.5">
                            <FileText className="h-3.5 w-3.5" />
                        </div>
                    </button>
                </StatsPopover>
            </div>

            {/* Right: Global Tools */}
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
    )
}
