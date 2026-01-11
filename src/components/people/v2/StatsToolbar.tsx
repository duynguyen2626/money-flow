'use client'

import { cn } from '@/lib/utils'
import { ArrowUpRight, ArrowDownLeft, Gift, CheckCircle } from 'lucide-react'

interface StatsToolbarProps {
    lend: number
    repay: number
    cashback: number
    paidCount: number
    onStatClick?: (stat: 'lend' | 'repay' | 'cashback' | 'paid') => void
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    notation: 'compact',
    compactDisplay: 'short'
})

export function StatsToolbar({
    lend,
    repay,
    cashback,
    paidCount,
    onStatClick
}: StatsToolbarProps) {
    const stats = [
        {
            id: 'lend' as const,
            label: 'Lend',
            value: lend,
            icon: ArrowUpRight,
            bgClass: 'bg-rose-50',
            hoverClass: 'hover:bg-rose-100',
            textClass: 'text-rose-600',
            iconBgClass: 'bg-rose-100',
        },
        {
            id: 'repay' as const,
            label: 'Repay',
            value: repay,
            icon: ArrowDownLeft,
            bgClass: 'bg-emerald-50',
            hoverClass: 'hover:bg-emerald-100',
            textClass: 'text-emerald-600',
            iconBgClass: 'bg-emerald-100',
        },
        {
            id: 'cashback' as const,
            label: 'Cashback',
            value: cashback,
            icon: Gift,
            bgClass: 'bg-amber-50',
            hoverClass: 'hover:bg-amber-100',
            textClass: 'text-amber-600',
            iconBgClass: 'bg-amber-100',
        },
        {
            id: 'paid' as const,
            label: 'Paid',
            value: paidCount,
            icon: CheckCircle,
            bgClass: 'bg-blue-50',
            hoverClass: 'hover:bg-blue-100',
            textClass: 'text-blue-600',
            iconBgClass: 'bg-blue-100',
            isCount: true,
        },
    ]

    return (
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {stats.map((stat) => {
                const Icon = stat.icon
                const displayValue = stat.isCount
                    ? stat.value.toString()
                    : numberFormatter.format(stat.value)

                return (
                    <button
                        key={stat.id}
                        onClick={() => onStatClick?.(stat.id)}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 transition-all cursor-pointer",
                            "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
                            stat.bgClass,
                            stat.hoverClass
                        )}
                    >
                        <div className={cn("p-2 rounded-lg", stat.iconBgClass)}>
                            <Icon className={cn("h-4 w-4", stat.textClass)} />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                {stat.label}
                            </span>
                            <span className={cn("text-lg font-bold tabular-nums", stat.textClass)}>
                                {displayValue}
                            </span>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
