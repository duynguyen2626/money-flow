import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { MobileRecordRowProps } from "./types"

export function MobileRecordRow({
    title,
    subtitle,
    icon,
    iconClassName,
    checkbox,
    badges = [],
    meta = [],
    amount,
    actions,
    className,
}: MobileRecordRowProps) {
    const hasLeft = Boolean(checkbox || icon)
    const hasRight = Boolean(amount || actions)

    return (
        <div className={cn("w-full", className)}>
            <div className="flex items-start gap-3">
                {hasLeft && (
                    <div className="flex flex-col items-center gap-2 shrink-0 pt-0.5">
                        {checkbox && (
                            <input
                                type="checkbox"
                                className="rounded border-slate-300 h-4 w-4"
                                checked={checkbox.checked}
                                aria-label={checkbox.ariaLabel ?? "Select row"}
                                disabled={checkbox.disabled}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => checkbox.onChange(event.target.checked)}
                            />
                        )}
                        {icon && (
                            <div
                                className={cn(
                                    "h-9 w-9 rounded-md bg-slate-100 text-slate-400 flex items-center justify-center overflow-hidden",
                                    iconClassName
                                )}
                            >
                                {icon}
                            </div>
                        )}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 line-clamp-2">{title}</div>
                    {subtitle && (
                        <div className="text-xs text-slate-500 line-clamp-2">{subtitle}</div>
                    )}
                    {badges.length > 0 && (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                            {badges.map((badge, index) => {
                                const hasLabel = badge.label.trim().length > 0
                                return (
                                    <Badge
                                        key={`${badge.label}-${index}`}
                                        variant={badge.variant ?? "outline"}
                                        title={badge.title}
                                        className={cn(
                                            hasLabel ? "h-5 px-1.5 text-[10px] font-medium" : "h-auto px-0 py-0",
                                            badge.className
                                        )}
                                    >
                                        {badge.icon && (
                                            <span className={cn("shrink-0", hasLabel && "mr-0.5")}>
                                                {badge.icon}
                                            </span>
                                        )}
                                        {hasLabel && <span className="truncate">{badge.label}</span>}
                                    </Badge>
                                )
                            })}
                        </div>
                    )}
                    {meta.length > 0 && (
                        <div className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                            {meta.map((item, index) => (
                                <div
                                    key={`${item.label}-${index}`}
                                    className={cn("flex items-center gap-1 min-w-0", item.className)}
                                    title={item.title}
                                >
                                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                                    <span className="truncate">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {hasRight && (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        {actions}
                        {amount && (
                            <div className="text-right">
                                <div
                                    className={cn(
                                        "text-sm font-semibold",
                                        amount.tone === "positive" && "text-emerald-700",
                                        amount.tone === "negative" && "text-red-500",
                                        amount.tone === "neutral" && "text-slate-600"
                                    )}
                                >
                                    {amount.primary}
                                </div>
                                {amount.secondary && (
                                    <div className="text-xs text-slate-500">{amount.secondary}</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
