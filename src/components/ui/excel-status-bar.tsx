import React from 'react'
import { cn } from "@/lib/utils"

type ExcelStatusBarProps = {
    totalIn: number
    totalOut: number
    average: number
    count: number
    isVisible: boolean
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
})

export function ExcelStatusBar({ totalIn, totalOut, average, count, isVisible }: ExcelStatusBarProps) {
    if (!isVisible) return null

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 rounded-full bg-slate-900/90 px-6 py-3 text-sm font-medium text-white shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">In:</span>
                <span className="font-mono text-emerald-100">+{currencyFormatter.format(totalIn)}</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
                <span className="text-rose-400 font-bold">Out:</span>
                <span className="font-mono text-rose-100">{currencyFormatter.format(totalOut)}</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
                <span className="text-slate-400">Avg:</span>
                <span className="font-mono">{currencyFormatter.format(average)}</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
                <span className="text-slate-400">Count:</span>
                <span className="font-mono">{count}</span>
            </div>
        </div>
    )
}
