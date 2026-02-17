"use client"

import React from "react"
import { cn, formatMoneyVND } from "@/lib/utils"

interface VietnameseCurrencyProps {
    amount: number
    className?: string
    showSign?: boolean
    /** 
     * 'stylized': Red numbers, Blue units (User request: số màu đỏ, text màu xanh biển)
     * 'auto': Green for positive, Red for negative.
     * 'none': Neutral slate for units.
     */
    variant?: 'stylized' | 'auto' | 'none'
}

/**
 * Formats a number into Vietnamese currency parts (millions, thousands, etc.)
 * Strictly rounded to nearest integer as requested.
 */
function formatVietnameseCurrencyParts(amount: number) {
    const absAmount = Math.round(Math.abs(amount))
    if (absAmount === 0) return [{ value: "0", unit: "đồng" }]

    const parts: { value: string; unit: string }[] = []
    let remaining = absAmount

    const tỷ = Math.floor(remaining / 1000000000)
    if (tỷ > 0) {
        parts.push({ value: tỷ.toString(), unit: "tỷ" })
        remaining %= 1000000000
    }

    const triệu = Math.floor(remaining / 1000000)
    if (triệu > 0) {
        parts.push({ value: triệu.toString(), unit: "triệu" })
        remaining %= 1000000
    }

    const ngàn = Math.floor(remaining / 1000)
    if (ngàn > 0) {
        parts.push({ value: ngàn.toString(), unit: "ngàn" })
        remaining %= 1000
    }

    if (remaining > 0 || parts.length === 0) {
        parts.push({ value: Math.floor(remaining).toString(), unit: "đ" })
    }

    return parts
}

export function VietnameseCurrency({
    amount,
    className,
    showSign = false,
    variant = 'stylized'
}: VietnameseCurrencyProps) {
    const parts = formatVietnameseCurrencyParts(amount)
    const isNegative = amount < 0

    // Color logic
    let numberColor = ""
    let unitColor = ""

    if (variant === 'auto') {
        numberColor = isNegative ? "text-rose-600" : "text-emerald-600"
        unitColor = isNegative ? "text-rose-400" : "text-emerald-500"
    } else if (variant === 'stylized') {
        // Updated per user request: "số màu đỏ (rose), text màu xanh biển (blue)"
        numberColor = "text-rose-600"
        unitColor = "text-blue-500"
    }

    return (
        <div className={cn("flex flex-wrap items-baseline gap-x-1", className)}>
            {showSign && (
                <span className={cn("font-black", numberColor)}>
                    {isNegative ? "-" : "+"}
                </span>
            )}
            {parts.map((p, i) => (
                <React.Fragment key={i}>
                    <span className={cn(
                        "font-black tracking-tight",
                        numberColor
                    )}>
                        {p.value}
                    </span>
                    <span className={cn(
                        "font-bold uppercase text-[0.7em] tracking-tighter",
                        unitColor || "text-slate-400"
                    )}>
                        {p.unit}
                    </span>
                </React.Fragment>
            ))}
        </div>
    )
}
