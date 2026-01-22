'use client'

import * as React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DayOfMonthPickerProps {
    value: number | null
    onChange: (day: number | null) => void
    placeholder?: string
    className?: string
    disabled?: boolean
}

export function DayOfMonthPicker({
    value,
    onChange,
    placeholder = 'DD',
    className,
    disabled
}: DayOfMonthPickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)

    const days = Array.from({ length: 31 }, (_, i) => i + 1)

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "w-full h-10 justify-between text-left font-bold text-sm",
                        !value && "text-slate-400",
                        className
                    )}
                >
                    {value ? value : placeholder}
                    <Calendar className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day) => (
                        <Button
                            key={day}
                            variant="ghost"
                            className={cn(
                                "h-8 w-8 p-0 text-[11px] font-bold",
                                value === day ? "bg-slate-900 text-white hover:bg-black" : "hover:bg-slate-100"
                            )}
                            onClick={() => {
                                onChange(day)
                                setIsOpen(false)
                            }}
                        >
                            {day}
                        </Button>
                    ))}
                </div>
                {value && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                        <Button
                            variant="ghost"
                            className="w-full h-7 text-[10px] text-rose-500 font-bold hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => {
                                onChange(null)
                                setIsOpen(false)
                            }}
                        >
                            Clear Selection
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
