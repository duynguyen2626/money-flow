import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

type DateRangeControlProps = {
    dateFrom: string
    dateTo: string
    onDateFromChange: (val: string) => void
    onDateToChange: (val: string) => void
    onClear: () => void
    variant?: 'desktop' | 'mobile'
}

export function DateRangeControl({ dateFrom, dateTo, onDateFromChange, onDateToChange, onClear, variant = 'desktop' }: DateRangeControlProps) {
    const isMobile = variant === 'mobile'
    const hasValue = dateFrom || dateTo

    const content = (
        <div className={cn("grid gap-3", isMobile ? "grid-cols-2" : "grid-cols-2")}>
            <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">From</label>
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => onDateFromChange(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">To</label>
                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => onDateToChange(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
                <button
                    onClick={onClear}
                    className="text-xs text-slate-500 hover:text-slate-700"
                >
                    Clear
                </button>
            </div>
        </div>
    )

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "relative inline-flex items-center justify-center rounded-md border text-sm font-medium shadow-sm transition-colors",
                        isMobile
                            ? "p-1.5 h-8 w-8"
                            : "p-2",
                        hasValue
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                    title="Select Date Range"
                >
                    <CalendarIcon className="h-4 w-4" />
                    {hasValue && (
                        <span className={cn("absolute flex", isMobile ? "-top-1 -right-1 h-2 w-2" : "-top-1 -right-1 h-2.5 w-2.5")}>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full bg-blue-600 shadow-sm border border-white w-full h-full"></span>
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 space-y-3" align="end">
                {isMobile ? null : (
                    <div className="space-y-1">
                        <h4 className="font-semibold text-sm text-slate-900">Date Range</h4>
                        <p className="text-xs text-slate-500">Filter transactions by date.</p>
                    </div>
                )}
                {content}
            </PopoverContent>
        </Popover>
    )
}
