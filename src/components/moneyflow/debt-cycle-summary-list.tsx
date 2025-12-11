'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import type { DebtByTagAggregatedResult } from '@/services/debt.service'

interface DebtCycleSummaryListProps {
    cycles: DebtByTagAggregatedResult[]
    selectedTag: string | null
    onSelectTag: (tag: string | null) => void
    currentTag?: string // Optional: highlight current cycle specifically if needed
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

function formatCurrency(value: number) {
    return numberFormatter.format(Math.abs(value))
}

export function DebtCycleCard({
    cycle,
    selectedTag,
    onSelectTag,
}: {
    cycle: DebtByTagAggregatedResult
    selectedTag: string | null
    onSelectTag: (tag: string | null) => void
}) {
    const isSelected = selectedTag === cycle.tag
    const isSettled = cycle.status === 'settled'
    const isPositive = cycle.netBalance >= 0

    // Status Colors
    const statusColor = isSettled ? 'text-slate-500' : 'text-amber-600'
    const statusBg = isSettled ? 'bg-slate-100' : 'bg-amber-50'
    const cardBorder = isSelected
        ? 'border-blue-500 ring-1 ring-blue-500'
        : isSettled ? 'border-slate-200' : 'border-amber-200'

    const cardBg = isSelected ? 'bg-blue-50/10' : 'bg-white'

    return (
        <div
            onClick={() => onSelectTag(isSelected ? null : cycle.tag)}
            className={cn(
                "flex-none w-[280px] rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md",
                cardBorder,
                cardBg
            )}
        >
            {/* Header: Tag + Status */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    {cycle.tag === 'UNTAGGED' ? 'No Tag' : cycle.tag}
                </span>
                <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", statusBg, statusColor)}>
                    {isSettled ? (
                        <>
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Settled</span>
                        </>
                    ) : (
                        <>
                            <Clock className="h-3 w-3" />
                            <span>Active</span>
                        </>
                    )}
                </div>
            </div>

            {/* Main Balance */}
            <div className="mb-4">
                <p className="text-xs text-slate-500 font-medium mb-0.5">Remaining</p>
                <p className={cn("text-2xl font-bold tabular-nums", isSettled ? "text-emerald-600" : (isPositive ? "text-emerald-600" : "text-amber-600"))}>
                    {formatCurrency(cycle.netBalance)}
                </p>
            </div>

            {/* Details Grid (Lend, Repay, Back, Initial) */}
            <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-xs px-2 py-2 bg-slate-50 rounded-lg">
                {/* Initial (Principal) */}
                <div className="flex flex-col">
                    <span className="text-slate-400 font-medium text-[10px] uppercase">Initial</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(cycle.originalPrincipal ?? 0)}</span>
                </div>

                {/* Back (Cashback/Profit) */}
                <div className="flex flex-col">
                    <span className="text-slate-400 font-medium text-[10px] uppercase">Back</span>
                    <span className="font-semibold text-emerald-600">
                        {cycle.totalBack ? `+${formatCurrency(cycle.totalBack)}` : '-'}
                    </span>
                </div>

                {/* Lend (Total Out) */}
                <div className="flex flex-col mt-1">
                    <span className="text-slate-400 font-medium text-[10px] uppercase">Lend</span>
                    <span className="font-semibold text-amber-700">
                        {formatCurrency(cycle.originalPrincipal ?? 0)}
                    </span>
                </div>

                {/* Repay (Total In) */}
                <div className="flex flex-col mt-1">
                    <span className="text-slate-400 font-medium text-[10px] uppercase">Repay</span>
                    <span className="font-semibold text-blue-600">
                        {formatCurrency((cycle.netBalance ?? 0) - (cycle.originalPrincipal ?? 0))}
                    </span>
                </div>
            </div>
        </div>
    )
}

export function DebtCycleSummaryList({
    cycles,
    selectedTag,
    onSelectTag,
}: DebtCycleSummaryListProps) {
    return (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-slate-200">
            {cycles.map((cycle) => (
                <DebtCycleCard
                    key={cycle.tag}
                    cycle={cycle}
                    selectedTag={selectedTag}
                    onSelectTag={onSelectTag}
                />
            ))}
        </div>
    )
}
