'use client'

import { cn } from '@/lib/utils'

interface FinalSettlementProps {
    finalPrice: number
    type: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function FinalSettlement({
    finalPrice,
    type,
}: FinalSettlementProps) {
    // Color based on type
    const amountColor =
        type === 'income' || type === 'repayment'
            ? 'text-emerald-700'
            : type === 'expense' || type === 'debt'
                ? 'text-red-500'
                : 'text-slate-700'

    return (
        <div className="flex items-center justify-end">
            <span className={cn('text-base font-semibold', amountColor)}>
                {numberFormatter.format(Math.abs(finalPrice))}
            </span>
        </div>
    )
}
