
import { TransactionWithDetails } from '@/types/moneyflow.types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface TransactionBaseAmountCellProps {
    transaction: TransactionWithDetails
    className?: string
}

export function TransactionBaseAmountCell({ transaction, className }: TransactionBaseAmountCellProps) {
    const originalAmount = transaction.original_amount ?? Math.abs(transaction.amount) // fallback

    // Determine Color
    // Income / Repayment -> Green
    // Expense / Debt / Transfer -> Red (usually outflow from main perspective)
    // But transfers are neutral? Usually visualize as outflow from source.

    const isPositive = ['income', 'repayment'].includes(transaction.type || '')

    const formatted = Math.abs(originalAmount).toLocaleString('vi-VN')

    // Cashback Logic
    // DB stores 0.01 for 1%
    const cashbackPercent = transaction.cashback_share_percent
        ? Math.round(transaction.cashback_share_percent * 100)
        : 0

    // User Note: "Text dạng: -2.622.590 đ + badge nhỏ Back 1%."
    // Also "Fix 200% bug" -> This assumes previous UI was doubling it or using wrong scale.

    return (
        <div className={cn("flex flex-col items-end min-w-[100px]", className)}>
            <div className="flex items-center gap-2 justify-end">
                {cashbackPercent > 0 && (
                    <Badge variant="outline" className="h-[24px] px-2 text-xs font-medium bg-amber-100 text-amber-700 border-none rounded">
                        Back {cashbackPercent}%
                    </Badge>
                )}
                <span className={cn(
                    "text-sm font-bold",
                    isPositive ? "text-green-600" : "text-red-500"
                )}>
                    {formatted}
                </span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center justify-end">
                Base
            </span>
        </div>
    )
}
