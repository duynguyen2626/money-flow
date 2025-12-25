"use client"

import { SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
// Import types and columns
import { ColumnKey, defaultColumns } from "@/components/app/table/transactionColumns"

interface TableViewOptionsProps {
    visibleColumns: Record<ColumnKey, boolean>
    onVisibilityChange: (cols: Record<ColumnKey, boolean>) => void
}

export function TableViewOptions({
    visibleColumns,
    onVisibilityChange,
}: TableViewOptionsProps) {

    const toggleColumn = (key: ColumnKey) => {
        onVisibilityChange({
            ...visibleColumns,
            [key]: !visibleColumns[key]
        })
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-2 p-2 px-3 rounded-md border text-sm font-medium shadow-sm transition-colors whitespace-nowrap",
                        "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    )}
                    title="Customize Columns"
                >
                    <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                    <span className="hidden md:inline">Columns</span>
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[200px] p-2 shadow-xl border-slate-200">
                <div className="space-y-1">
                    <div className="flex items-center justify-between mb-2 px-2 py-1 border-b border-slate-100 pb-2">
                        <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">Display Columns</h4>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto px-1">
                        {defaultColumns.map(col => {
                            const isVisible = visibleColumns[col.key] !== false
                            return (
                                <div key={col.key} className="flex items-center space-x-3 px-2 py-2 hover:bg-slate-50 rounded-md group transition-colors">
                                    <Checkbox
                                        id={`col-toggle-${col.key}`}
                                        checked={isVisible}
                                        onCheckedChange={() => toggleColumn(col.key)}
                                        className="border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                    />
                                    <label
                                        htmlFor={`col-toggle-${col.key}`}
                                        className="text-sm font-medium text-slate-600 group-hover:text-slate-900 cursor-pointer flex-1 select-none"
                                    >
                                        {col.label}
                                    </label>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
