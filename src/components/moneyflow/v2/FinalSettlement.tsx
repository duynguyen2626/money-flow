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
    const hasCashback = cashbackPercent > 0 || cashbackFixed > 0

    // Color based on type
    const amountColor =
        type === 'income' || type === 'repayment'
            ? 'text-emerald-700'
            : type === 'expense' || type === 'debt'
                ? 'text-red-500'
                : 'text-slate-700'

    // Convert to percentage: 0.0008 → 8%
    const displayPercent = cashbackPercent * 10000

    // Build formula tooltip
    let formula = ''
    if (hasCashback && baseAmount) {
        const absBase = Math.abs(baseAmount)

        formula = `${numberFormatter.format(absBase)}`
        if (displayPercent > 0) {
            formula += ` - ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(displayPercent)}%`
        }
        if (cashbackFixed > 0) {
            formula += ` - ${numberFormatter.format(cashbackFixed)}`
        }
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 justify-end">
                <span className={cn('text-sm font-semibold', amountColor)}>
                    {numberFormatter.format(Math.abs(finalPrice))}
                </span>
                {hasCashback && (
                    <CustomTooltip content={<div className="text-xs whitespace-nowrap font-mono">{formula} = {numberFormatter.format(Math.abs(finalPrice))}</div>}>
                        <Info className="h-3 w-3 text-slate-400 hover:text-slate-600 cursor-help" />
                    </CustomTooltip>
                )}
            </div>
            {/* Cashback detail text below */}
            {hasCashback && (
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    {displayPercent > 0 && <span>{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(displayPercent)}%</span>}
                    {displayPercent > 0 && cashbackFixed > 0 && <span>+</span>}
                    {cashbackFixed > 0 && <span>{numberFormatter.format(cashbackFixed)}</span>}
                    <span>back</span>
                </div>
            )}
        </div>
    )
}
