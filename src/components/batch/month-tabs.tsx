'use client'

import { useState } from 'react'
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
                            <button
                                key={month}
                                onClick={() => onValueChange?.(month)}
                                className={cn(
                                    'flex-shrink-0 relative group px-5 py-3 rounded-xl transition-all duration-300',
                                    isActive
                                        ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80'
                                        : 'hover:bg-slate-50'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-start">
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest",
                                            isActive ? (bankType === 'MBB' ? "text-blue-500" : "text-purple-500") : "text-slate-400"
                                        )}>
                                            {month.split('-')[0]}
                                        </span>
                                        <span className={cn(
                                            "text-sm font-bold",
                                            isActive ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"
                                        )}>
                                            {formatMonth(month).split(' ')[0]}
                                        </span>
                                    </div>

                                    <div className={cn(
                                        "h-8 w-px bg-slate-100",
                                        isActive && "bg-slate-200"
                                    )} />

                                    <div className="flex flex-col items-end">
                                        <div className={cn(
                                            "text-xs font-black",
                                            isActive ? "text-slate-900" : "text-slate-400"
                                        )}>
                                            {stats.confirmedItems}
                                            <span className="text-slate-300 mx-0.5">/</span>
                                            {stats.totalItems}
                                        </div>
                                        <div className="text-[10px] font-medium text-slate-400">Items</div>
                                    </div>
                                </div>

                                {isActive && (
                                    <div className={cn(
                                        "absolute bottom-0 left-6 right-6 h-0.5 rounded-full",
                                        bankType === 'MBB' ? "bg-blue-600" : "bg-purple-600"
                                    )} />
                                )}
                            </button>
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
