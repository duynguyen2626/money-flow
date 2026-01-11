'use client'

import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomTooltip } from '@/components/ui/custom-tooltip'

interface FinalSettlementProps {
    finalPrice: number
    type: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'
    baseAmount?: number
    cashbackPercent?: number
    cashbackFixed?: number
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function FinalSettlement({
    finalPrice,
    type,
    baseAmount,
    cashbackPercent = 0,
    cashbackFixed = 0,
}: FinalSettlementProps) {
    // Color based on type
    const amountColor =
        type === 'income' || type === 'repayment'
            ? 'text-emerald-700'
            : type === 'expense' || type === 'debt'
                ? 'text-red-500'
                : 'text-slate-700'

    const hasCashback = cashbackPercent > 0 || cashbackFixed > 0
    const displayPercent = cashbackPercent * 100

    // Build formula tooltip
    let formula = ''
    if (hasCashback && baseAmount) {
        const cashbackAmount = Math.abs(baseAmount) * cashbackPercent + cashbackFixed
        formula = `${numberFormatter.format(Math.abs(baseAmount))}`
        if (displayPercent > 0) {
            formula += ` - ${displayPercent}%`
        }
        if (cashbackFixed > 0) {
            formula += ` - ${numberFormatter.format(cashbackFixed)}`
        }
        formula += ` = ${numberFormatter.format(finalPrice)}`
    }

    return (
        <div className="flex items-center justify-end gap-1.5">
            <span className={cn('text-base font-semibold', amountColor)}>
                {numberFormatter.format(Math.abs(finalPrice))}
            </span>
            {hasCashback && formula && (
                <CustomTooltip content={<div className="text-xs">{formula}</div>}>
                    <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                </CustomTooltip>
            )}
        </div>
    )
}
