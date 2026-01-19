'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Filter, ChevronDown } from 'lucide-react'
import { isYYYYMM } from '@/lib/month-tag'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

interface DebtCycle {
    tag: string
    transactions: any[]
    remains: number
    isSettled: boolean
    serverStatus?: any
}

interface DebtTimelineProps {
    cycles: DebtCycle[]
    availableYears: string[]
    onCycleClick?: (tag: string) => void
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    notation: 'compact',
    compactDisplay: 'short'
})

function getMonthName(tag: string) {
    if (!isYYYYMM(tag)) return tag
    const month = parseInt(tag.split('-')[1], 10)
    const date = new Date(2000, month - 1, 1)
    return date.toLocaleString('en-US', { month: 'short' })
}

export function DebtTimeline({ cycles, availableYears, onCycleClick }: DebtTimelineProps) {
    const [selectedYear, setSelectedYear] = useState<string | null>(
        new Date().getFullYear().toString()
    )
    const [activeTag, setActiveTag] = useState<string | null>(null)
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    // Filter cycles by year
    const filteredCycles = useMemo(() => {
        if (!selectedYear) return cycles
        return cycles.filter(c => {
            if (selectedYear === 'Other') return !isYYYYMM(c.tag)
            return c.tag.startsWith(selectedYear)
        })
    }, [cycles, selectedYear])

    // Set initial active tag
    useMemo(() => {
        if (filteredCycles.length > 0 && !activeTag) {
            const now = new Date()
            const currentTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            const match = filteredCycles.find(c => c.tag === currentTag)
            setActiveTag(match ? match.tag : filteredCycles[0].tag)
        }
    }, [filteredCycles, activeTag])

    const handleCycleClick = (tag: string) => {
        setActiveTag(tag)
        onCycleClick?.(tag)
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Grouped Section: Year Filter + Timeline Pills */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white">
                {/* Filter Bar */}
                <div className="flex items-center gap-3 mb-4">
                    {/* Consolidated Filter Pill */}
                    <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <PopoverTrigger asChild>
                            <button
                                className={cn(
                                    "h-10 rounded-full border bg-white px-3 flex items-center gap-1.5 text-sm font-medium transition-all shadow-sm",
                                    selectedYear
                                        ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Filter className="h-3.5 w-3.5" />
                                <span className="text-xs opacity-40">|</span>
                                <span className="font-semibold">{selectedYear || new Date().getFullYear()}</span>
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2 rounded-xl" align="start">
                            <div className="max-h-[300px] overflow-y-auto space-y-1">
                                <button
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                                        !selectedYear ? "bg-slate-100 font-bold text-slate-900" : "hover:bg-slate-50 text-slate-600"
                                    )}
                                    onClick={() => { setSelectedYear(null); setIsFilterOpen(false); }}
                                >
                                    All Years
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                {availableYears.map(year => (
                                    <button
                                        key={year}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                                            selectedYear === year ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-50 text-slate-600"
                                        )}
                                        onClick={() => { setSelectedYear(year); setIsFilterOpen(false); }}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Timeline Pills */}
                <div className="relative">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1 snap-x items-center">
                        {filteredCycles.map((cycle) => {
                            const isSettled = cycle.isSettled
                            const isActive = activeTag === cycle.tag
                            const linkedCount = cycle.serverStatus?.links?.length || 0

                            return (
                                <button
                                    key={cycle.tag}
                                    onClick={() => handleCycleClick(cycle.tag)}
                                    className={cn(
                                        "flex-shrink-0 flex items-center gap-2 h-11 px-4 rounded-lg border transition-all whitespace-nowrap snap-start",
                                        isActive
                                            ? "bg-indigo-900 border-indigo-900 text-white shadow-lg shadow-indigo-900/30"
                                            : isSettled
                                                ? "bg-white border-slate-200 text-slate-400 opacity-80 hover:opacity-100 hover:border-slate-300"
                                                : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                                    )}
                                >
                                    {/* Month */}
                                    <span className={cn("text-xs font-bold uppercase tracking-wider", isActive ? "text-indigo-200" : isSettled ? "text-slate-400" : "text-slate-500")}>
                                        {getMonthName(cycle.tag).toUpperCase()} &apos;{cycle.tag.split('-')[0].slice(2)}
                                    </span>

                                    {/* Amount or Settled */}
                                    {isSettled ? (
                                        <span className={cn("text-[10px] font-bold uppercase tracking-wide", isActive ? "text-emerald-300" : "text-emerald-600")}>
                                            SETTLED
                                        </span>
                                    ) : (
                                        <span className={cn("text-sm font-bold tabular-nums", isActive ? "text-white" : "text-slate-900")}>
                                            {numberFormatter.format(Math.max(0, cycle.remains))}
                                        </span>
                                    )}

                                    {/* Linked Badge */}
                                    {linkedCount > 0 && (
                                        <span className={cn(
                                            "flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold",
                                            isActive ? "bg-indigo-500 text-white" : "bg-indigo-100 text-indigo-700"
                                        )}>
                                            {linkedCount}
                                        </span>
                                    )}
                                </button>
                            )
                        })}

                        {/* More Button */}
                        <button className="flex-shrink-0 flex items-center justify-center h-11 px-4 rounded-lg border border-slate-200 bg-white text-slate-500 text-xs font-medium hover:bg-slate-50 hover:text-slate-700 transition-colors snap-start">
                            More &gt;
                        </button>
                    </div>

                    {/* Fade Gradient for Scroll Hint */}
                    <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none md:hidden" />
                </div>
            </div>

            {/* Active Cycle Details */}
            {activeTag && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">
                        {getMonthName(activeTag)} {activeTag.split('-')[0]}
                    </h3>
                    <p className="text-sm text-slate-600">
                        Cycle details will be displayed here. This can include transaction list, sheet preview, or other relevant information.
                    </p>
                </div>
            )}
        </div>
    )
}
