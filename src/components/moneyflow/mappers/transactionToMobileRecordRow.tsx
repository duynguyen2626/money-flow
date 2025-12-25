import type { ReactNode } from "react"
import { Ban, CheckCircle2, Clock, FileText, Wallet, ArrowRight, Info } from "lucide-react"
import { cn } from "@/lib/utils"
// MobileRecordRowProps is now MobileRowModel
import type { MobileRecordBadge, MobileRecordRowProps, MobileLeadingVisual } from "@/components/app/mobile/types"
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
    // 1. Title strategy: Note > Shop > Source > Unknown
    const note = txn.note?.trim()
    const shopName = txn.shop_name?.trim()
    const sourceName = txn.source_name || txn.account_name || "Unknown"

    // If note exists, use it. Else shop, else source.
    const title = note || shopName || sourceName

    // 2. Subtitle: Short ID + Tooltip
    const shortId = txn.id.slice(-4)
    const subtitleObj = { text: `...${shortId}`, tooltip: `Transaction ID: ${txn.id}` }

    // 3. Flow Visuals (Source -> Dest)
    const sourceImage = txn.source_image || txn.shop_image_url
    const targetImage = (txn as any).person_avatar_url || (txn as any).destination_image_url

    // Determine if we need flow
    const isTransfer = txn.type === 'transfer' || txn.type === 'debt' || txn.type === 'repayment'
    const showFlow = isTransfer && (targetImage || (txn as any).destination_name)

    const flowObj = showFlow ? {
        left: sourceImage ? { kind: "img", src: sourceImage, className: "bg-white border-slate-100" } as const : { kind: "icon", icon: <Wallet className="h-3 w-3 text-slate-400" />, className: "bg-slate-100 border-slate-200" } as const,
        arrow: true,
        right: targetImage ? { kind: "img", src: targetImage, className: "bg-white border-slate-100" } as const : { kind: "icon", icon: <Wallet className="h-3 w-3 text-slate-400" />, className: "bg-slate-100 border-slate-200" } as const,
    } : undefined

    const leadingVisualObj = !showFlow ? (
        sourceImage ? { kind: "img", src: sourceImage, className: "bg-transparent h-8 w-8 object-contain rounded-none text-slate-400" } as const : { kind: "icon", icon: <Wallet className="h-4 w-4" />, className: "bg-transparent" } as const
    ) : undefined

    // 4. Badges
    const categoryName = categories.find(cat => cat.id === txn.category_id)?.name || txn.category_name
    const badges: MobileRecordBadge[] = []

    if (categoryName) {
        badges.push({
            label: categoryName,
            variant: "outline",
            className: "text-[10px] text-slate-600 bg-slate-50 border-slate-200 py-0 h-5",
            title: categoryName,
        })
    }

    if (txn.is_installment || txn.installment_plan_id) {
        badges.push({
            label: "Inst",
            variant: "outline",
            className: "text-amber-700 bg-amber-50 border-amber-200 text-[9px] px-1 h-5",
            title: "Installment",
        })
    }

    const statusBadge = buildStatusBadge(txn)
    if (statusBadge) badges.push(statusBadge)

    // 5. Meta: Date + Time
    const occurredAt = txn.occurred_at ?? txn.created_at
    const d = occurredAt ? new Date(occurredAt) : null
    let meta: { label: string }[] = []
    if (d && !Number.isNaN(d.getTime())) {
        const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
        const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        meta = [{ label: `${dateStr} ${timeStr}` }]
    }

    // 6. Value Logic
    const visualType = (txn as { displayType?: string }).displayType ?? txn.type
    const isRepayment = txn.type === "repayment"
    const amountTone: "positive" | "negative" | "neutral" =
        visualType === "income" || isRepayment ? "positive" : visualType === "expense" ? "negative" : "neutral"

    const rawAmount = typeof txn.original_amount === "number" ? txn.original_amount : txn.amount ?? 0
    const absRaw = Math.abs(rawAmount)

    // Cashback logic
    const percentRaw = Number(txn.cashback_share_percent ?? 0)
    const fixedRaw = Number(txn.cashback_share_fixed ?? 0)
    const rate = percentRaw > 1 ? percentRaw / 100 : percentRaw
    const cashbackCalc = (absRaw * rate) + fixedRaw
    const cashbackAmount = txn.cashback_share_amount ?? (cashbackCalc > 0 ? cashbackCalc : 0)
    const hasCashback = cashbackAmount > 0

    const baseAmount = absRaw
    const finalPrice = (typeof txn.final_price === 'number')
        ? Math.abs(txn.final_price)
        : (cashbackAmount > baseAmount ? baseAmount : Math.max(0, baseAmount - cashbackAmount))

    const primaryStr = formatCurrency(absRaw)
    const topBadges: MobileRecordBadge[] = []

    if (hasCashback) {
        if (percentRaw > 0) {
            topBadges.push({
                label: `${percentRaw}%`,
                className: "text-emerald-700 bg-emerald-50 border-emerald-200",
            })
        }
        if (fixedRaw > 0) {
            topBadges.push({
                label: `+${formatCurrency(fixedRaw)}`,
                className: "text-emerald-700 bg-emerald-50 border-emerald-200",
            })
        }
    }

    const valueBlock = {
        top: primaryStr,
        topBadges,
        bottom: hasCashback ? `Final: ${formatCurrency(finalPrice)}` : undefined,
        tone: amountTone,
        infoTooltip: hasCashback ? (
            <div className="space-y-1">
                <div>Original: {formatCurrency(baseAmount)}</div>
                <div className="text-emerald-600">Cashback: -{formatCurrency(cashbackAmount)}</div>
                <div className="font-bold border-t pt-1">Final: {formatCurrency(finalPrice)}</div>
            </div>
        ) : undefined
    }

    // Return using the new MobileRowModel properties
    return {
        title,
        subtitle: subtitleObj,
        // use leadingVisual and flow instead of hijacked icon
        leadingVisual: leadingVisualObj,
        flow: flowObj,
        badges,
        meta,
        value: valueBlock,
    }
}
