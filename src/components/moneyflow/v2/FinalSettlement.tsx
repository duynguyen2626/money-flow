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
    const displayPercent = cashbackPercent * 10000 // 0.0008 → 8%

    // Build formula tooltip
    let formula = ''
    if (hasCashback && baseAmount) {
        const absBase = Math.abs(baseAmount)
        const percentCashback = absBase * cashbackPercent
        const totalCashback = percentCashback + cashbackFixed

        formula = `${numberFormatter.format(absBase)}`
        if (displayPercent > 0) {
            formula += ` - ${displayPercent}%`
        }
        if (cashbackFixed > 0) {
            formula += ` - ${numberFormatter.format(cashbackFixed)}`
        }
        formula += ` = ${numberFormatter.format(Math.abs(finalPrice))}`
    }

    return (
        <div className="flex items-center justify-end gap-1.5">
            <span className={cn('text-base font-semibold', amountColor)}>
                {numberFormatter.format(Math.abs(finalPrice))}
            </span>
            {hasCashback && formula && (
                <CustomTooltip content={<div className="text-xs whitespace-nowrap">{formula}</div>}>
                    <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                </CustomTooltip>
            )}
        </div>
    )
}
