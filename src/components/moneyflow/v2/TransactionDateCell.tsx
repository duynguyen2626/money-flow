import { format } from 'date-fns'

interface TransactionDateCellProps {
    date: string | Date
}

/**
 * Displays transaction date with time in a large, prominent format
 * Day number is large and bold, month is small below, time at bottom
 */
export function TransactionDateCell({ date }: TransactionDateCellProps) {
    const dateObj = typeof date === 'string' ? new Date(date) : date

    const day = format(dateObj, 'dd')
    const month = format(dateObj, 'MMM')
    const time = format(dateObj, 'HH:mm')

    return (
        <div className="flex flex-col items-center justify-center min-w-[60px]">
            <div className="text-2xl font-bold text-slate-900 leading-none">
                {day}
            </div>
            <div className="text-xs text-slate-500 uppercase mt-0.5">
                {month}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
                {time}
            </div>
        </div>
    )
}
