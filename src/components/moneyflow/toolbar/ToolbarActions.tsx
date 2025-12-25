import { ListFilter, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { ReactNode } from 'react'

type ToolbarActionsProps = {
    isExcelMode: boolean
    onExcelModeChange: (val: boolean) => void
    filterContent: ReactNode // We pass the rendered filter content to avoid moving all the filter state logic
    children?: ReactNode // For AddTransactionDialog
}

export function ToolbarActions({ isExcelMode, onExcelModeChange, filterContent, children }: ToolbarActionsProps) {
    return (
        <>
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <ListFilter className="h-4 w-4" />
                        <span className="hidden xl:inline">Filters</span>
                    </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-4 z-50 shadow-xl">
                    {filterContent}
                </PopoverContent>
            </Popover>

            <button
                onClick={() => onExcelModeChange(!isExcelMode)}
                className={cn(
                    "hidden sm:flex inline-flex items-center justify-center p-2 rounded-md border text-sm font-medium shadow-sm transition-colors",
                    isExcelMode
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-700/10"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                )}
                title="Toggle Excel Mode"
            >
                <FileSpreadsheet className="h-4 w-4" />
            </button>

            {children}
        </>
    )
}
