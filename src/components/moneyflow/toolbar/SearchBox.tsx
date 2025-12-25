import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type SearchBoxProps = {
    value: string
    onChange: (val: string) => void
    placeholder?: string
    variant?: 'desktop' | 'mobile'
    className?: string
}

export function SearchBox({ value, onChange, placeholder = "Search...", variant = 'desktop', className }: SearchBoxProps) {
    const isMobile = variant === 'mobile'
    // Desktop: container min-w-[100px] max-w-sm
    //          icon h-3 w-3, input h-8 text-xs
    // Mobile:  container flex-1
    //          icon h-4 w-4, input h-10 text-sm

    return (
        <div className={cn("relative transition-all", isMobile ? "flex-1" : "flex-1 min-w-[100px] max-w-sm", className)}>
            <Search className={cn(
                "absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400",
                isMobile ? "h-4 w-4" : "h-3 w-3"
            )} />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                className={cn(
                    "w-full rounded-md border border-slate-200 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
                    isMobile
                        ? "h-10 pl-9 pr-8 text-sm"
                        : "h-8 pl-8 pr-8 text-xs"
                )}
            />
            {value && (
                <button
                    className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100",
                        isMobile ? "p-1" : "p-0.5"
                    )}
                    onClick={() => onChange('')}
                >
                    <X className={cn(isMobile ? "h-3.5 w-3.5" : "h-3 w-3")} />
                </button>
            )}
        </div>
    )
}
