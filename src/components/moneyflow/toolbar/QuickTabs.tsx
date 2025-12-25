import { cn } from "@/lib/utils"

export type TabKey = 'active' | 'void' | 'pending'

type QuickTabsProps = {
    activeTab: TabKey
    onTabChange: (tab: TabKey) => void
    size?: 'sm' | 'xs'
    className?: string
}

export function QuickTabs({ activeTab, onTabChange, size = 'sm', className }: QuickTabsProps) {
    const isSmall = size === 'xs' // Mobile
    // Desktop: text-[11px] font-semibold px-2.5 py-1
    // Mobile: text-[10px] font-bold px-2 py-1

    return (
        <div className={cn("flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0", className)}>
            {(['active', 'void', 'pending'] as const).map((tab) => (
                <button
                    key={tab}
                    onClick={() => onTabChange(tab)}
                    className={cn(
                        "rounded-md transition-all capitalize",
                        isSmall
                            ? "px-2 py-1 text-[10px] font-bold"
                            : "px-2.5 py-1 text-[11px] font-semibold",
                        activeTab === tab
                            ? cn(
                                "bg-white shadow-sm ring-1 ring-black/5",
                                tab === 'active' && "bg-blue-50 text-blue-700 ring-blue-700/10",
                                tab === 'void' && "bg-red-50 text-red-700 ring-red-700/10",
                                tab === 'pending' && "bg-amber-50 text-amber-700 ring-amber-700/10"
                            )
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    )}
                >
                    {tab}
                </button>
            ))}
        </div>
    )
}
