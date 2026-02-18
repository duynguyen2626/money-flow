"use client"

import { cn } from "@/lib/utils"

interface CashbackCycleTabsProps {
    cycles: string[]
    selected: string
    onSelect: (cycle: string) => void
}

export function CashbackCycleTabs({
    cycles,
    selected,
    onSelect,
}: CashbackCycleTabsProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {cycles.map((cycle) => (
                <button
                    key={cycle}
                    onClick={() => onSelect(cycle)}
                    className={cn(
                        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                        selected === cycle
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                >
                    {cycle}
                </button>
            ))}
        </div>
    )
}
