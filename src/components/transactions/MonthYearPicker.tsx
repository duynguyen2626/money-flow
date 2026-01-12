'use client'

import * as React from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { DateRange } from 'react-day-picker'

interface MonthYearPickerProps {
    date: Date | undefined
    dateRange: DateRange | undefined
    mode: 'month' | 'range'
    onModeChange: (mode: 'month' | 'range') => void
    onDateChange: (date: Date) => void
    onRangeChange: (range: DateRange | undefined) => void
    className?: string
}

export function MonthYearPicker({
    date = new Date(),
    dateRange,
    mode,
    onModeChange,
    onDateChange,
    onRangeChange,
    className
}: MonthYearPickerProps) {
    const [open, setOpen] = React.useState(false)
    const [viewDate, setViewDate] = React.useState(date || new Date())

    // Month Selection Logic
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]

    const handleMonthSelect = (monthIndex: number) => {
        const newDate = new Date(viewDate.getFullYear(), monthIndex, 1)
        onDateChange(newDate)
        setOpen(false)
    }

    const nextYear = () => setViewDate(d => addMonths(d, 12))
    const prevYear = () => setViewDate(d => subMonths(d, 12))

    // Display Text
    const displayText = React.useMemo(() => {
        if (mode === 'month') {
            return format(date, 'MMM - yyyy')
        }
        if (dateRange?.from) {
            if (dateRange.to) {
                return `${format(dateRange.from, 'dd MMM')} - ${format(dateRange.to, 'dd MMM yyyy')}`
            }
            return format(dateRange.from, 'dd MMM yyyy')
        }
        return 'Pick a range'
    }, [mode, date, dateRange])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-[140px] justify-start text-left font-normal px-3",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="truncate text-xs font-semibold">{displayText}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 bg-background border-b flex items-center justify-between gap-2">
                    <div className="flex bg-muted rounded-lg p-0.5">
                        <button
                            onClick={() => onModeChange('month')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                mode === 'month' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => onModeChange('range')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                mode === 'range' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Range
                        </button>
                    </div>
                </div>

                {mode === 'month' ? (
                    <div className="p-3 w-[280px]">
                        <div className="flex items-center justify-between mb-4">
                            <Button variant="ghost" size="icon" onClick={prevYear} className="h-6 w-6">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-semibold text-sm">{viewDate.getFullYear()}</span>
                            <Button variant="ghost" size="icon" onClick={nextYear} className="h-6 w-6">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {months.map((m, i) => {
                                const current = new Date(viewDate.getFullYear(), i, 1)
                                const isSelected = isSameMonth(current, date)
                                return (
                                    <button
                                        key={m}
                                        onClick={() => handleMonthSelect(i)}
                                        className={cn(
                                            "text-xs font-medium py-2 rounded-md transition-colors",
                                            isSelected
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-muted text-foreground"
                                        )}
                                    >
                                        {m}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="p-0">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={onRangeChange}
                            numberOfMonths={2}
                        />
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
