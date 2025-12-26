import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ArrowRight, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { MobileRecordRowProps, MobileLeadingVisual } from "./types"

export function MobileRecordRow(props: MobileRecordRowProps) {
    const {
        title,
        subtitle,
        checkbox,
        badges = [],
        meta = [],
        actions,
        className,
        // New Props
        flow,
        leadingVisual,
        value,
        // Legacy Props (auto-mapped)
        icon,
        iconClassName,
        amount,
    } = props

    // Normalize Leading Visual
    // Priority: flow > leadingVisual > icon
    const showFlow = Boolean(flow)
    const effectiveLeadingVisual: MobileLeadingVisual | undefined = leadingVisual ?? (icon ? { kind: "icon", icon, className: iconClassName } : undefined)

    // Normalize Value Block
    // Priority: value > amount
    const effectiveValue = value ?? (amount ? {
        top: amount.primary,
        bottom: amount.secondary,
        tone: amount.tone
    } : undefined)

    const hasLeft = Boolean(checkbox || effectiveLeadingVisual || showFlow)
    const hasRight = Boolean(effectiveValue || actions)

    const renderVisual = (visual: MobileLeadingVisual) => {
        if (visual.kind === "img" && visual.src) {
            return <img src={visual.src} alt={visual.text || ""} className={cn("h-full w-full object-cover", visual.className)} />
        }
        if (visual.text) {
            return <span className={cn("text-xs font-bold", visual.className)}>{visual.text}</span>
        }
        return <div className={cn("flex items-center justify-center h-full w-full", visual.className)}>{visual.icon}</div>
    }

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

                        {/* Flow or Leading Visual */}
                        {showFlow && flow ? (
                            <div className="flex items-center gap-0.5">
                                {/* Left */}
                                {flow.left && (
                                    <div className={cn("h-6 w-6 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200", flow.left.className)}>
                                        {renderVisual(flow.left)}
                                    </div>
                                )}
                                {flow.arrow !== false && <ArrowRight className="h-3 w-3 text-slate-300" />}
                                {/* Right */}
                                {flow.right && (
                                    <div className={cn("h-6 w-6 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200", flow.right.className)}>
                                        {renderVisual(flow.right)}
                                    </div>
                                )}
                            </div>
                        ) : effectiveLeadingVisual ? (
                            <div
                                className={cn(
                                    "h-9 w-9 rounded-md bg-slate-100 text-slate-400 flex items-center justify-center overflow-hidden",
                                    effectiveLeadingVisual.className
                                )}
                            >
                                {renderVisual(effectiveLeadingVisual)}
                            </div>
                        ) : null}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 line-clamp-2">{title}</div>

                    {/* Subtitle with Tooltip support */}
                    {subtitle && (
                        typeof subtitle === 'string' ? (
                            <div className="text-xs text-slate-500 line-clamp-2">{subtitle}</div>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="text-xs text-slate-500 line-clamp-2 cursor-help decoration-dashed underline underline-offset-2">
                                        {subtitle.text}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {subtitle.tooltip}
                                </TooltipContent>
                            </Tooltip>
                        )
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

                        {effectiveValue && (
                            <div className="text-right">
                                <div
                                    className={cn(
                                        "text-sm font-semibold",
                                        effectiveValue.tone === "positive" && "text-emerald-700",
                                        effectiveValue.tone === "negative" && "text-red-500",
                                        effectiveValue.tone === "neutral" && "text-slate-600"
                                    )}
                                >
                                    {effectiveValue.top}
                                </div>
                                {effectiveValue.topBadges && effectiveValue.topBadges.length > 0 && (
                                    <div className="flex justify-end gap-0.5 my-0.5">
                                        {effectiveValue.topBadges.map((b, i) => (
                                            <Badge key={i} variant="outline" className={cn("h-3 px-1 text-[8px]", b.className)}>
                                                {b.label}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                {effectiveValue.bottom && (
                                    <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
                                        {effectiveValue.bottom}
                                        {effectiveValue.infoTooltip && (
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Info className="h-3 w-3 text-slate-400" />
                                                </TooltipTrigger>
                                                <TooltipContent align="end">{effectiveValue.infoTooltip}</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
