import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

type SummaryItem = {
    key: 'income' | 'expense' | 'lend' | 'repay'
    label: string
    value: number
}

type SummaryDropdownProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    items: SummaryItem[]
    selectedType: string
    variant?: 'desktop' | 'mobile'
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
});

const summaryStyleMap = {
    income: { active: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-700' },
    expense: { active: 'border-rose-200 bg-rose-50', text: 'text-rose-700' },
    lend: { active: 'border-amber-200 bg-amber-50', text: 'text-amber-700' },
    repay: { active: 'border-indigo-200 bg-indigo-50', text: 'text-indigo-700' },
}

export function SummaryDropdown({ isOpen, onOpenChange, items, selectedType, variant = 'desktop' }: SummaryDropdownProps) {
    const isMobile = variant === 'mobile'

    return (
        <Popover open={isOpen} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                {isMobile ? (
                    <button
                        className="inline-flex items-center justify-center p-1.5 h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
                        aria-label="Financial summary"
                        title="Financial summary"
                    >
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                    </button>
                ) : (
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition-all">
                        Financial Summary
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                    </button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 space-y-2 z-50" align={isMobile ? "end" : "center"}>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Global Summary</h4>
                <div className="grid gap-1">
                    {items.map((item) => (
                        <div
                            key={item.key}
                            className={cn(
                                "flex items-center justify-between p-2 rounded-lg border transition-colors",
                                selectedType === item.key ? summaryStyleMap[item.key].active : "bg-white border-slate-100"
                            )}
                        >
                            <span className="text-xs font-medium text-slate-600">{item.label}</span>
                            <span className={cn("text-xs font-bold", summaryStyleMap[item.key].text)}>
                                {numberFormatter.format(item.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
