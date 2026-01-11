'use client'

import { Copy, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CustomTooltip } from '@/components/ui/custom-tooltip'

interface TransactionDetailsCellProps {
    note?: string | null
    shopName?: string | null
    shopImageUrl?: string | null
    categoryName?: string | null
    transactionId: string
    tag?: string | null
    isInstallment?: boolean
    installmentsPaid?: number
    installmentsTotal?: number
    isSplit?: boolean
    refundStatus?: string | null
}

export function TransactionDetailsCell({
    note,
    shopName,
    shopImageUrl,
    categoryName,
    transactionId,
    tag,
    isInstallment,
    installmentsPaid,
    installmentsTotal,
    isSplit,
    refundStatus,
}: TransactionDetailsCellProps) {
    const [copiedId, setCopiedId] = useState(false)

    const handleCopyId = (e: React.MouseEvent) => {
        e.stopPropagation()
        navigator.clipboard.writeText(transactionId)
        setCopiedId(true)
        setTimeout(() => setCopiedId(false), 2000)
    }

    // Primary text: note if available, otherwise shop name
    const primaryText = note || shopName || 'No description'
    const hasNote = Boolean(note)

    return (
        <div className="flex flex-col gap-1.5 min-w-0">
            {/* Primary Text (Note or Shop Name) */}
            <div className="flex items-center gap-2 min-w-0">
                {/* Shop Icon (only if we have shop) */}
                {shopName && (
                    <div className="flex-shrink-0">
                        {shopImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={shopImageUrl}
                                alt={shopName}
                                className="h-8 w-8 rounded-none object-cover"
                            />
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-none bg-slate-100 text-xs font-semibold text-slate-600">
                                {shopName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                )}

                {/* Text Content */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <CustomTooltip content={primaryText}>
                        <span className={cn(
                            "truncate",
                            hasNote ? "text-sm font-medium text-slate-900" : "text-sm font-medium text-slate-700"
                        )}>
                            {primaryText}
                        </span>
                    </CustomTooltip>

                    {/* Shop name as secondary if we have note */}
                    {hasNote && shopName && (
                        <span className="text-xs text-slate-500 truncate">
                            {shopName}
                        </span>
                    )}
                </div>

                {/* Copy ID Button */}
                <button
                    onClick={handleCopyId}
                    className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Copy ID"
                >
                    {copiedId ? (
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                        <Copy className="h-3.5 w-3.5" />
                    )}
                </button>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5">
                {/* Category Badge */}
                {categoryName && (
                    <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {categoryName}
                    </span>
                )}

                {/* Tag/Cycle Badge */}
                {tag && (
                    <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {tag}
                    </span>
                )}

                {/* Installment Paid Badge */}
                {isInstallment && installmentsPaid !== undefined && installmentsTotal !== undefined && (
                    <span className="inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        +{installmentsPaid}/{installmentsTotal} Paid
                    </span>
                )}

                {/* Split Badge */}
                {isSplit && (
                    <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Split
                    </span>
                )}

                {/* Refund Status Badge */}
                {refundStatus === 'requested' && (
                    <span className="inline-flex items-center rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        Refund Pending
                    </span>
                )}
                {refundStatus === 'confirmed' && (
                    <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Refunded
                    </span>
                )}
            </div>
        </div>
    )
}
