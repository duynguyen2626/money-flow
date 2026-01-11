import { format } from 'date-fns'

interface TransactionDateCellProps {
    date: string | Date
}

/**
 * Displays transaction date in a compact format
 * Day number is large and bold, month is small below (no time)
 */
export function TransactionDateCell({ date }: TransactionDateCellProps) {
    const dateObj = typeof date === 'string' ? new Date(date) : date

    const day = format(dateObj, 'dd')
    const month = format(dateObj, 'MMM')

    return (
        <div className="flex flex-col items-center justify-center min-w-[60px]">
            <div className="text-2xl font-bold text-slate-900 leading-none">
                {day}
            </div>
            <div className="text-xs text-slate-500 uppercase mt-0.5">
                {month}
            </div>
        </div>
    )
}
