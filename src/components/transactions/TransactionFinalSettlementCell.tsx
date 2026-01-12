import { TransactionWithDetails } from '@/types/moneyflow.types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Sigma } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface TransactionFinalSettlementCellProps {
    transaction: TransactionWithDetails
    className?: string
}

export function TransactionFinalSettlementCell({ transaction, className }: TransactionFinalSettlementCellProps) {
    // Logic: Use final_price from DB if available, else amount
    const finalAmount = transaction.final_price ?? Math.abs(transaction.amount)

    // original_amount comes from DB or fallback
    // Fix 200% Bug: Use Math.abs for defaults to ensure we are comparing MAGNITUDES for "savings"
    // If it's an expense (-100), and final is (-90), we saved 10.
    const originalAmount = transaction.original_amount ?? Math.abs(transaction.amount)

    // Calculate difference (Discount/Cashback included in final price)
    // We compare absolute values to see if the "cost" went down or "income" went up?
    // Actually for income (+100 -> +110), it's a bonus. For expense (-100 -> -90), it's a generic "gain".
    // Simplest: Compare Abs Magnitudes.
    const absOriginal = Math.abs(originalAmount)
    const absFinal = Math.abs(finalAmount)

    // Threshold 100 dong to ignore float errors
    const hasDifference = Math.abs(absOriginal - absFinal) > 100

    // Use Math.abs for formatting to remove minus sign
    // Use Math.abs for formatting to remove minus sign
    const formattedAmount = new Intl.NumberFormat('vi-VN').format(Math.abs(finalAmount))
    const isExpense = transaction.amount < 0 || transaction.type === 'expense'

    // Tooltip Logic items
    const cashbackAmount = transaction.cashback_share_amount ?? (hasDifference ? absOriginal - absFinal : 0)
    const cashbackPercent = transaction.cashback_share_percent ? Math.round(transaction.cashback_share_percent * 100) : 0

    let badge = null
    if (hasDifference && absOriginal > 0) {
        const diff = absOriginal - absFinal
        const percent = Math.round((diff / absOriginal) * 100)
        if (percent > 0 && percent <= 100) {
            badge = `Back ${percent}%`
        }
    }

    const tooltipText = cashbackPercent > 0
        ? `Back = Base × ${cashbackPercent}% = ${new Intl.NumberFormat('vi-VN').format(cashbackAmount)} đ`
        : `Final Price: ${formattedAmount}`

    return (
        <div className={cn("flex flex-col items-end min-w-[100px]", className)}>
            <div className="flex items-center gap-2 justify-end">
                {/* Badge Left */}
                {badge && (
                    <Badge variant="outline" className="h-4 px-1 text-[9px] bg-yellow-50 text-yellow-700 border-yellow-200">
                        {badge}
                    </Badge>
                )}
                {/* Amount Right - Red if Expense, formatted without symbol */}
                <span className={cn("text-sm font-bold", isExpense ? "text-red-500" : "text-green-600")}>
                    {formattedAmount}
                </span>
            </div>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help mt-0.5">
                            {(hasDifference || cashbackPercent > 0) ? (
                                <Badge variant="secondary" className="h-3.5 px-1 text-[9px] gap-0.5 font-mono bg-slate-100 text-slate-600 hover:bg-slate-200">
                                    <Sigma className="h-2.5 w-2.5" />
                                    <span>Back = {new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(cashbackAmount)}</span>
                                </Badge>
                            ) : (
                                <span className="text-[10px] text-muted-foreground">Net Value</span>
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{tooltipText}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}
