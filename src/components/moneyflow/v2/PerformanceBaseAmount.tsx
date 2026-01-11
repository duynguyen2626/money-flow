'use client'

import { ArrowDown, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomTooltip } from '@/components/ui/custom-tooltip'

interface PerformanceBaseAmountProps {
    amount: number
    cashbackPercent?: number
    cashbackFixed?: number
    type: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function PerformanceBaseAmount({
    amount,
    cashbackPercent = 0,
    cashbackFixed = 0,
    type,
}: PerformanceBaseAmountProps) {
    const hasCashback = cashbackPercent > 0 || cashbackFixed > 0

    // Color based on type
    const amountColor =
        type === 'income' || type === 'repayment'
            ? 'text-emerald-700'
            : type === 'expense' || type === 'debt'
                ? 'text-red-500'
                : 'text-slate-700'

    // Convert decimal to percentage (0.08 -> 8%)
    const displayPercent = cashbackPercent * 100

    return (
        <div className="flex flex-col items-end gap-0.5">
            {/* Base Amount */}
            <span className={cn('text-base font-semibold', amountColor)}>
                {numberFormatter.format(Math.abs(amount))}
            </span>

            {/* Cashback Indicator - only show if has cashback */}
            {hasCashback && (
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                    <ArrowDown className="h-3 w-3" />
                    {displayPercent > 0 && (
                        <span>{displayPercent}%</span>
                    )}
                    {cashbackFixed > 0 && (
                        <span>+{numberFormatter.format(cashbackFixed)}</span>
                    )}
                </div>
            )}
        </div>
    )
}
