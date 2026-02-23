'use client'

import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Batch {
    id: string
    month_year: string
    name: string
    total_items: number
    confirmed_items: number
    status: string
}


interface MonthTabsProps {
    batches: Batch[]
    bankType: 'MBB' | 'VIB'
    onCreateMonth?: () => void
    value?: string | null
    onValueChange?: (value: string) => void
}

export function MonthTabs({ batches, bankType, onCreateMonth, value, onValueChange }: MonthTabsProps) {
    // Group batches by month_year
    const monthGroups = batches.reduce((acc, batch) => {
        const month = batch.month_year || 'unknown'
        if (!acc[month]) {
            acc[month] = []
        }
        acc[month].push(batch)
        return acc
    }, {} as Record<string, Batch[]>)

    // Sort months descending (newest first)
    const sortedMonths = Object.keys(monthGroups).sort((a, b) => b.localeCompare(a))

    const activeMonth = value || sortedMonths[0] || null

    // Format month for display (YYYY-MM -> Jan 2026)
    const formatMonth = (monthYear: string) => {
        if (!monthYear || monthYear === 'unknown') return 'Unknown'
        const [year, month] = monthYear.split('-')
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthIndex = parseInt(month, 10) - 1
        return `${monthNames[monthIndex]} ${year}`
    }

    // Calculate stats for a month
    const getMonthStats = (monthBatches: Batch[]) => {
        const totalItems = monthBatches.reduce((sum, b) => sum + (b.total_items || 0), 0)
        const confirmedItems = monthBatches.reduce((sum, b) => sum + (b.confirmed_items || 0), 0)
        return { totalItems, confirmedItems }
    }

    return (
        <div className="bg-white border-b border-slate-200/60 sticky top-0 z-10 backdrop-blur-md bg-white/80">
            <div className="container mx-auto px-6">
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-4">
                    {sortedMonths.map((month) => {
                        const monthBatches = monthGroups[month]
                        const stats = getMonthStats(monthBatches)
                        const isActive = month === activeMonth

                        return (
                            <TooltipProvider key={month}>
                                <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => onValueChange?.(month)}
                                            className={cn(
                                                'flex-shrink-0 relative group px-5 py-3 rounded-xl transition-all duration-300',
                                                isActive
                                                    ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80'
                                                    : 'hover:bg-slate-50'
                                            )}
                                        >
                                            <div className="flex flex-col items-start gap-0.5">
                                                <span className={cn(
                                                    "text-[14px] font-black tracking-tight",
                                                    isActive ? "text-slate-900" : "text-slate-500 group-hover:text-slate-900"
                                                )}>
                                                    {formatMonth(month)}
                                                </span>
                                                <div className={cn(
                                                    "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-100",
                                                    isActive ? (bankType === 'MBB' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600") : "text-slate-400"
                                                )}>
                                                    {stats.confirmedItems} <span className="text-[8px] opacity-50">/</span> {stats.totalItems} Items
                                                </div>
                                            </div>

                                            {isActive && (
                                                <div className={cn(
                                                    "absolute bottom-0 left-6 right-6 h-0.5 rounded-full",
                                                    bankType === 'MBB' ? "bg-blue-600" : "bg-purple-600"
                                                )} />
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent sideOffset={8} className="bg-slate-900 border-none text-white rounded-xl shadow-xl p-4 min-w-[140px] z-50">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</span>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-xl font-black text-emerald-400">{stats.confirmedItems}</span>
                                                <span className="text-slate-500 font-bold text-sm">/</span>
                                                <span className="text-base font-bold text-white">{stats.totalItems}</span>
                                            </div>
                                            <span className="text-[10px] font-medium text-slate-400 mt-1">Confirmed / Total Items</span>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )
                    })}

                    <div className="h-10 w-px bg-slate-200 mx-2" />

                    <Button
                        variant="ghost"
                        onClick={onCreateMonth}
                        className="flex-shrink-0 h-14 px-6 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-500 hover:text-slate-900 gap-2 font-bold transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Month</span>
                    </Button>
                </div>
            </div>
        </div>
    )
}
