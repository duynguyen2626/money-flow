import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface TableShellProps {
    children: ReactNode
    className?: string
    footer?: ReactNode
}

/**
 * A render-neutral wrapper for the Unified Transaction Table.
 * Provides the card container, scroll area, and footer slot.
 * 
 * exact tailwind classes copied from:
 * c:\Users\nam.thanhnguyen\Github\money-flow-3\src\components\moneyflow\unified-transaction-table.tsx
 */
export function TableShell({ children, className, footer, style }: TableShellProps & { style?: React.CSSProperties }) {
    return (
        <div className="relative flex flex-col h-full overflow-hidden">
            <div
                className={cn(
                    "relative w-full rounded-xl border border-slate-200 bg-card shadow-sm transition-colors duration-300 flex-1 overflow-hidden",
                    className
                )}
                style={style}
            >
                <div className="flex-1 overflow-auto w-full scrollbar-visible h-full bg-white relative" style={{ scrollbarGutter: 'stable' }}>
                    {children}
                </div>
            </div>
            {footer}
        </div>
    )
}
