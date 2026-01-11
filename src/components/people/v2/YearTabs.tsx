'use client'

import { cn } from '@/lib/utils'

interface YearTabsProps {
    years: string[]
    selectedYear: string
    onSelectYear: (year: string) => void
}

export function YearTabs({ years, selectedYear, onSelectYear }: YearTabsProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {years.map((year) => (
                <button
                    key={year}
                    onClick={() => onSelectYear(year)}
                    className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                        selectedYear === year
                            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    )}
                >
                    {year === 'ALL' ? 'All Time' : year}
                </button>
            ))}
        </div>
    )
}
