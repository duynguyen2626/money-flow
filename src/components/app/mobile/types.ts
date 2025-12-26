import type { ReactNode } from "react"
import type { BadgeProps } from "@/components/ui/badge"

export type MobileRecordBadge = {
    label: string
    variant?: BadgeProps["variant"]
    icon?: ReactNode
    title?: string
    className?: string
}

export type MobileRecordMeta = {
    label: string
    title?: string
    icon?: ReactNode
    className?: string
}

export type MobileRecordAmount = {
    primary: string
    secondary?: string
    tone?: "positive" | "negative" | "neutral"
}

export type MobileRecordCheckbox = {
    checked: boolean
    onChange: (next: boolean) => void
    ariaLabel?: string
    disabled?: boolean
}

export type MobileLeadingVisual = {
    kind: "img" | "icon" | "text"
    src?: string
    icon?: ReactNode
    text?: string
    className?: string
}

export type MobileFlow = {
    left?: MobileLeadingVisual
    arrow?: boolean
    right?: MobileLeadingVisual
    labels?: string[]
}

export type MobileValueBlock = {
    top: string
    topBadges?: MobileRecordBadge[]
    bottom?: string
    infoTooltip?: ReactNode
    tone?: "positive" | "negative" | "neutral"
}

export interface MobileRowModel {
    id?: string
    title: string
    subtitle?: { text: string; tooltip?: string } | string
    leadingVisual?: MobileLeadingVisual
    flow?: MobileFlow
    badges?: MobileRecordBadge[]
    meta?: MobileRecordMeta[]
    value?: MobileValueBlock
    actions?: ReactNode // Kept as ReactNode for flexibility or object structure
    className?: string
    // Legacy support or direct prop usage
    icon?: ReactNode
    iconClassName?: string
    checkbox?: MobileRecordCheckbox
    amount?: MobileRecordAmount
}

export type MobileRecordRowProps = MobileRowModel
