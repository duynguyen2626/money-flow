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
        <div className="border-b border-slate-200 bg-white sticky top-0 z-10">
            <div className="container mx-auto px-4">
                {/* Horizontal scrollable tabs */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3">
                    {sortedMonths.map((month) => {
                        const monthBatches = monthGroups[month]
                        const stats = getMonthStats(monthBatches)
                        const isActive = month === activeMonth

                        return (
                            <button
                                key={month}
                                onClick={() => onValueChange?.(month)}
                                className={cn(
                                    'flex-shrink-0 px-4 py-2.5 rounded-lg font-medium transition-all duration-200',
                                    'hover:bg-slate-50 active:scale-95',
                                    isActive
                                        ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">
                                        {formatMonth(month)}
                                    </span>
                                    <span className={cn(
                                        'text-xs px-2 py-0.5 rounded-full',
                                        isActive
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'bg-slate-100 text-slate-600'
                                    )}>
                                        {stats.confirmedItems}/{stats.totalItems}
                                    </span>
                                </div>
                            </button>
                        )
                    })}

                    {/* Create New Month Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onCreateMonth}
                        className="flex-shrink-0 border-dashed border-2 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        New Month
                    </Button>
                </div>
            </div>
        </div>
    )
}
