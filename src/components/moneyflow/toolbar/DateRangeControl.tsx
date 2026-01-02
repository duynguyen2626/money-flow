"use client"

import * as React from "react"
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

type DateRangeControlProps = {
    dateFrom: string
    dateTo: string
    onDateFromChange: (val: string) => void
    onDateToChange: (val: string) => void
    onClear: () => void
    variant?: 'desktop' | 'mobile'
}

export function DateRangeControl({
    dateFrom,
    dateTo,
    onDateFromChange,
    onDateToChange,
    onClear,
    variant = 'desktop'
}: DateRangeControlProps) {
    const isMobile = variant === 'mobile'

    // Parse dates from strings
    const dateRange: DateRange = React.useMemo(() => ({
        from: dateFrom ? new Date(dateFrom) : undefined,
        to: dateTo ? new Date(dateTo) : undefined
    }), [dateFrom, dateTo])

    const handleSelect = (range: DateRange | undefined) => {
        if (!range) {
            onClear();
            return;
        }

        // Format to YYYY-MM-DD for consistency
        if (range.from) {
            onDateFromChange(format(range.from, 'yyyy-MM-dd'))
        } else {
            onDateFromChange('')
        }

        if (range.to) {
            onDateToChange(format(range.to, 'yyyy-MM-dd'))
        } else {
            onDateToChange('')
        }
    }

    // Helper to format display text
    const displayText = React.useMemo(() => {
        if (!dateRange.from) return "Pick date range"
        if (!dateRange.to) return format(dateRange.from, "LLL dd, y")
        return `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
    }, [dateRange])

    const hasValue = !!dateFrom || !!dateTo

    // Unified Icon-Only Trigger (as requested)
    const trigger = (
        <Button
            variant="outline"
            size="icon"
            className={cn(
                "h-9 w-9 shrink-0",
                hasValue && "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
            )}
            title={displayText}
        >
            <CalendarIcon className="h-4 w-4" />
            {hasValue && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full bg-blue-600 border border-white h-2.5 w-2.5"></span>
                </span>
            )}
        </Button>
    )

    return (
        <Popover>
            <PopoverTrigger asChild>
                {trigger}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className="text-sm font-medium text-slate-700">
                        {hasValue ? displayText : "Select Date Range"}
                    </span>
                    {hasValue && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClear}
                            className="h-6 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 -mr-2"
                        >
                            Clear
                        </Button>
                    )}
                </div>
                <div className="p-0">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange}
                        onSelect={handleSelect}
                        numberOfMonths={2}
                    />
                </div>
            </PopoverContent>
        </Popover>
    )
}
