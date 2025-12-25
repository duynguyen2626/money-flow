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

export type MobileRecordRowProps = {
    title: string
    subtitle?: string
    icon?: ReactNode
    iconClassName?: string
    checkbox?: MobileRecordCheckbox
    badges?: MobileRecordBadge[]
    meta?: MobileRecordMeta[]
    amount?: MobileRecordAmount
    actions?: ReactNode
    className?: string
}
