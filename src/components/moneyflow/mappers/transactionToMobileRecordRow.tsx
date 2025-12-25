import type { ReactNode } from "react"
import { Ban, CheckCircle2, Clock, FileText, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MobileRecordBadge, MobileRecordRowProps } from "@/components/app/mobile/types"
import type { Category, TransactionWithDetails } from "@/types/moneyflow.types"

type TransactionToMobileRecordRowArgs = {
    txn: TransactionWithDetails
    categories: Category[]
    formatCurrency: (value: number) => string
}

const statusIndicatorBase = "flex items-center justify-center rounded-full p-0.5 w-3.5 h-3.5 transition-colors border"

function buildStatusBadge(txn: TransactionWithDetails): MobileRecordBadge | null {
    const effectiveStatus = txn.status
    const isVoided = effectiveStatus === "void"
    const meta = (txn.metadata as Record<string, unknown> | null) ?? null
    const isRefundConfirmation = meta?.["is_refund_confirmation"] === true
    const metaRefundStatus = meta?.["refund_status"]

    let icon: ReactNode | null = null
    let tooltip = ""

    if (isVoided) {
        icon = <Ban className="h-3 w-3 text-slate-400" />
        tooltip = "Voided"
    } else if (effectiveStatus === "pending") {
        icon = (
            <div className={cn(statusIndicatorBase, "bg-amber-100 border-amber-300 text-amber-700")}>
                <Clock className="h-2.5 w-2.5" />
            </div>
        )
        tooltip = "Pending Refund"
    } else if (effectiveStatus === "waiting_refund" || metaRefundStatus === "waiting_refund") {
        icon = (
            <div className={cn(statusIndicatorBase, "bg-amber-100 border-amber-300 text-amber-700")}>
                <Clock className="h-2.5 w-2.5" />
            </div>
        )
        tooltip = "Waiting Refund"
    } else if (effectiveStatus === "completed" || effectiveStatus === "refunded" || metaRefundStatus === "refunded") {
        icon = (
            <div className={cn(statusIndicatorBase, "bg-emerald-100 border-emerald-300 text-emerald-700")}>
                <CheckCircle2 className="h-2.5 w-2.5" />
            </div>
        )
        tooltip = "Refund Processed"
    } else if (isRefundConfirmation && effectiveStatus === "posted") {
        icon = (
            <div className={cn(statusIndicatorBase, "bg-emerald-100 border-emerald-300 text-emerald-700")}>
                <CheckCircle2 className="h-2.5 w-2.5" />
            </div>
        )
        tooltip = "Money Received"
    } else if (meta?.["has_refund_request"] && !metaRefundStatus) {
        icon = (
            <div className={cn(statusIndicatorBase, "bg-blue-100 border-blue-300 text-blue-700")}>
                <FileText className="h-2.5 w-2.5" />
            </div>
        )
        tooltip = "Refund Requested"
    }

    if (!icon) return null

    return {
        label: "",
        variant: "outline",
        icon,
        title: tooltip,
        className: "border-0 bg-transparent px-0 py-0 h-auto",
    }
}

export function transactionToMobileRecordRow({
    txn,
    categories,
    formatCurrency,
}: TransactionToMobileRecordRowArgs): MobileRecordRowProps {
    const sourceName = txn.source_name || txn.account_name || "Unknown"
    const displayImage = txn.shop_image_url || txn.source_image
    const note = txn.note?.trim() ?? ""
    const title = txn.shop_name || note || sourceName
    const subtitle = note && title !== note ? note : undefined

    const categoryName = categories.find(cat => cat.id === txn.category_id)?.name || txn.category_name
    const badges: MobileRecordBadge[] = []

    if (categoryName) {
        badges.push({
            label: categoryName,
            variant: "outline",
            className: "text-[10px] text-slate-500 bg-slate-100 border-slate-200 max-w-[140px]",
            title: categoryName,
        })
    }

    if (txn.is_installment || txn.installment_plan_id) {
        badges.push({
            label: "Inst",
            variant: "outline",
            className: "text-amber-700 bg-amber-100 border-amber-200 text-[9px] px-1",
            title: "Installment",
        })
    }

    const statusBadge = buildStatusBadge(txn)
    if (statusBadge) {
        badges.push(statusBadge)
    }

    const occurredAt = txn.occurred_at ?? txn.created_at
    const occurredDate = occurredAt ? new Date(occurredAt) : null
    const dateStr = occurredDate && !Number.isNaN(occurredDate.getTime())
        ? `${String(occurredDate.getDate()).padStart(2, "0")}.${String(occurredDate.getMonth() + 1).padStart(2, "0")}`
        : ""

    const meta = dateStr ? [{ label: dateStr }] : []

    const visualType = (txn as { displayType?: string }).displayType ?? txn.type
    const isRepayment = txn.type === "repayment"
    const amountTone =
        visualType === "income" || isRepayment ? "positive" : visualType === "expense" ? "negative" : "neutral"

    const rawAmount = typeof txn.original_amount === "number" ? txn.original_amount : txn.amount ?? 0
    const amountValue = Math.abs(rawAmount)

    return {
        title,
        subtitle,
        icon: displayImage ? (
            <img src={displayImage} alt="" className="h-8 w-8 object-contain rounded-none" />
        ) : (
            <Wallet className="h-4 w-4" />
        ),
        iconClassName: displayImage ? "bg-transparent" : undefined,
        badges,
        meta,
        amount: {
            primary: formatCurrency(amountValue),
            tone: amountTone,
        },
    }
}
