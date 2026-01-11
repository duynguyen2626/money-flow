'use client'

import { Copy, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { CustomTooltip } from '@/components/ui/custom-tooltip'

interface TransactionDetailsCellProps {
    note?: string | null
    shopName?: string | null
    shopImageUrl?: string | null
    categoryName?: string | null
    transactionId: string
    tag?: string | null
    date?: string | Date | null
    isInstallment?: boolean
    installmentsPaid?: number
    installmentsTotal?: number
    isSplit?: boolean
    refundStatus?: string | null
}

// Category colors mapping
const categoryColors: Record<string, { bg: string; text: string }> = {
    'Shopping': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'Food': { bg: 'bg-orange-100', text: 'text-orange-700' },
    'Transport': { bg: 'bg-purple-100', text: 'text-purple-700' },
    'Entertainment': { bg: 'bg-pink-100', text: 'text-pink-700' },
    'Health': { bg: 'bg-green-100', text: 'text-green-700' },
    'Education': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    'Income': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    'Repayment': { bg: 'bg-teal-100', text: 'text-teal-700' },
}

export function TransactionDetailsCell({
    note,
    shopName,
    shopImageUrl,
    categoryName,
    transactionId,
    tag,
    date,
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

    // Get category color
    const categoryColor = categoryName ? categoryColors[categoryName] || { bg: 'bg-slate-100', text: 'text-slate-700' } : null

    // Format time
    const timeStr = date ? format(typeof date === 'string' ? new Date(date) : date, 'HH:mm') : null

    return (
        <div className="flex flex-col gap-1.5 min-w-0">
            {/* Primary Text with Shop Image and Time */}
            <div className="flex items-center gap-2 min-w-0">
                {/* Shop Icon */}
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
                    <div className="flex items-center gap-2">
                        <CustomTooltip content={primaryText}>
                            <span className="text-sm font-medium text-slate-900 truncate">
                                {primaryText}
                            </span>
                        </CustomTooltip>
                        {timeStr && (
                            <span className="text-xs text-slate-400 flex-shrink-0">
                                {timeStr}
                            </span>
                        )}
                    </div>
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
                {/* Category Badge - with color and min-width for consistency */}
                {categoryName && categoryColor && (
                    <span className={cn(
                        "inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium min-w-[80px]",
                        categoryColor.bg,
                        categoryColor.text
                    )}>
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
