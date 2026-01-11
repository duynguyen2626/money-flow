import { TrendingDown } from 'lucide-react'

interface TransactionAmountsProps {
    amount: number
    finalPrice?: number
    cashbackAmount?: number
    type: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

/**
 * Displays transaction amounts with cashback indicator
 * Main amount is large and bold
 * Final price with cashback is smaller below
 */
export function TransactionAmounts({
    amount,
    finalPrice,
    cashbackAmount = 0,
    type,
}: TransactionAmountsProps) {
    const hasCashback = cashbackAmount > 0
    const displayFinalPrice = finalPrice ?? amount

    // Color based on type
    const amountColor =
        type === 'income'
            ? 'text-emerald-700'
            : type === 'expense'
                ? 'text-red-500'
                : 'text-slate-700'

    return (
        <div className="flex flex-col items-end gap-1 min-w-[120px]">
            {/* Main Amount */}
            <div className={`text-lg font-bold ${amountColor}`}>
                {numberFormatter.format(Math.abs(amount))}
            </div>

            {/* Final Price with Cashback */}
            {hasCashback && (
                <div className="flex items-center gap-1 text-sm">
                    <TrendingDown className="h-3 w-3 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">
                        {numberFormatter.format(Math.abs(displayFinalPrice))}
                    </span>
                    <span className="text-xs text-slate-500">
                        (-{numberFormatter.format(cashbackAmount)})
                    </span>
                </div>
            )}

            {/* Settlement Status - if applicable */}
            {!hasCashback && displayFinalPrice !== amount && (
                <div className="text-xs text-slate-500">
                    Final: {numberFormatter.format(Math.abs(displayFinalPrice))}
                </div>
            )}
        </div>
    )
}
