import { format } from 'date-fns'
import { memo } from 'react'

interface TransactionTimelineCellProps {
    occurredAt: string
    className?: string
}

export const TransactionTimelineCell = memo(function TransactionTimelineCell({
    occurredAt,
    className,
}: TransactionTimelineCellProps) {
    const date = new Date(occurredAt)

    return (
        <div className={`flex flex-col items-center justify-center min-w-[60px] text-center ${className}`}>
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider leading-none">
                {format(date, 'MMM')}
            </span>
            <span className="text-xl font-bold text-foreground leading-none my-0.5">
                {format(date, 'dd')}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium leading-none">
                {format(date, 'HH:mm')}
            </span>
        </div>
    )
})
