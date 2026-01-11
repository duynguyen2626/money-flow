'use client'

import { ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    // Color based on type
    const amountColor =
        type === 'income' || type === 'repayment'
            ? 'text-emerald-700'
            : type === 'expense' || type === 'debt'
                ? 'text-red-500'
                : 'text-slate-700'

    return (
        <div className="flex flex-col items-end gap-0.5">
            {/* Base Amount Only */}
            <span className={cn('text-sm font-semibold', amountColor)}>
                {numberFormatter.format(Math.abs(amount))}
            </span>
        </div>
    )
}
