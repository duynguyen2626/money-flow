"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select } from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3 relative", className)}
            captionLayout="dropdown"
            fromYear={1900}
            toYear={2100}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4 relative",
                caption: "flex flex-col items-center gap-2 pt-1 relative min-h-[40px]",
                caption_label: "hidden",
                dropdowns: "flex flex-row justify-center gap-2 w-full",
                dropdown: "flex items-center",
                nav: "absolute top-1 left-0 right-0 h-[40px] flex justify-between items-center px-2 pointer-events-none z-10",
                // Support both v8 and v9 names for robustness
                nav_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 pointer-events-auto"
                ),
                nav_button_previous: "",
                nav_button_next: "",
                button_previous: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 pointer-events-auto"
                ),
                button_next: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 pointer-events-auto"
                ),
                // react-day-picker v9 canonical names
                month_grid: "w-full border-collapse",
                weekdays: "grid grid-cols-7 w-full mb-1",
                weekday: "text-muted-foreground w-full font-normal text-[0.8rem] flex justify-center items-center h-9",
                weeks: "w-full space-y-1",
                week: "grid grid-cols-7 w-full",
                day: "h-9 w-full text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md flex justify-center items-center",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                ),
                range_start: "day-range-start",
                range_end: "day-range-end",
                selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                today: "bg-accent text-accent-foreground",
                outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                disabled: "text-muted-foreground opacity-50",
                range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Dropdown: ({ value, onChange, options }: any) => {
                    const items = options?.map((opt: any) => ({
                        value: opt.value.toString(),
                        label: opt.label
                    })) || []

                    const handleChange = (newValue: string | undefined) => {
                        if (!newValue) return
                        const changeEvent = {
                            target: { value: newValue },
                        } as React.ChangeEvent<HTMLSelectElement>
                        onChange?.(changeEvent)
                    }

                    return (
                        <Select
                            value={value?.toString()}
                            onValueChange={handleChange}
                            items={items}
                            className="h-7 w-auto min-w-[80px] border-none shadow-none px-2 py-0 text-sm font-medium focus:ring-0 bg-transparent hover:bg-slate-100"
                        />
                    )
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Chevron: ({ orientation }: any) => {
                    const Icon = orientation === "left" ? ChevronLeft : ChevronRight
                    return <Icon className="h-4 w-4" />
                },
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
