import { Account } from '@/types/moneyflow.types'
import { parseCashbackConfig, getCashbackCycleRange, parseCycleTag } from '@/lib/cashback'
import { cn } from '@/lib/utils'
import { parseISO, format, startOfMonth, endOfMonth } from 'date-fns'
import { Calendar } from 'lucide-react'
import { CustomTooltip } from '@/components/ui/custom-tooltip'

interface CycleBadgeProps {
    account: Account | undefined
    cycleTag: string | undefined | null
    txnDate: string | Date
    className?: string
    mini?: boolean
    compact?: boolean
}

export function CycleBadge({ account, cycleTag, txnDate, className, mini = false, compact = false }: CycleBadgeProps) {
    if (!account || !account.cashback_config) return null

    // Try to use persisted cycle tag if available
    // If we have a tag like "2026-01", we can try to derive the range
    // BUT, to get the precise range (e.g. 25 Dec - 24 Jan) we need the calculation logic based on statement Day

    const config = parseCashbackConfig(account.cashback_config)
    if (!config.cycleType) return null

    let refDate = typeof txnDate === 'string' ? parseISO(txnDate) : txnDate

    // If we have a stored cycle tag, use it to set the "month" context for calculation
    if (cycleTag) {
        const parsed = parseCycleTag(cycleTag)
        if (parsed) {
            // Set reference date to mid-month of that cycle tag to ensure we hit the right range calculation
            // Actually, getCashbackCycleRange uses referenceDate to find the cycle *containing* it.
            // If we have "2026-01" tag, it usually means cycle ENDS in Jan 2026.
            // So reference date should be around Jan 15, 2026.
            refDate = new Date(parsed.year, parsed.month - 1, 15)
        }
    }

    let range: { start: Date; end: Date } | null = null
    if (config.cycleType === 'calendar_month') {
        const baseDate = cycleTag ? (() => {
            const parsed = parseCycleTag(cycleTag)
            return parsed ? new Date(parsed.year, parsed.month - 1, 1) : refDate
        })() : refDate
        range = { start: startOfMonth(baseDate), end: endOfMonth(baseDate) }
    } else {
        range = getCashbackCycleRange(config, refDate)
    }
    if (!range) return null

    const formatRange = (start: Date, end: Date) => {
        // Format: dd-MM~dd-MM (e.g., 23-01~23-02 or 01-01~31-01)
        return `${format(start, 'dd-MM')}~${format(end, 'dd-MM')}`
    }

    const formattedText = formatRange(range.start, range.end)

    if (compact) {
        return (
            <CustomTooltip content={formattedText}>
                <span className={cn(
                    "inline-flex items-center justify-center gap-1 rounded-[4px] bg-amber-100 border border-amber-300 text-amber-800 cursor-help whitespace-nowrap font-bold",
                    "px-1 h-6 text-[10px] min-w-[96px]",
                    className
                )}>
                    <Calendar className="h-3 w-3" />
                    {formattedText}
                </span>
            </CustomTooltip>
        )
    }

    return (
        <span className={cn(
            "inline-flex items-center justify-center gap-1 rounded-[4px] bg-amber-100 border border-amber-300 text-amber-800 whitespace-nowrap font-bold",
            mini ? "px-1 h-4 text-[10px] min-w-[80px]" : "px-1.5 h-7 text-[11px] min-w-[96px]",
            className
        )}>
            <Calendar className={cn(mini ? "h-2 w-2" : "h-3 w-3", "mb-[1px]")} />
            {formattedText}
        </span>
    )
}
