import { Badge } from '@/components/ui/badge'
import { Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'

interface TransactionBadgesProps {
    tag?: string | null
    isInstallment?: boolean
    metadata?: Record<string, unknown> | null
    status?: string
}

/**
 * Displays transaction badges (tags, status indicators)
 * High contrast colors per design rules
 */
export function TransactionBadges({
    tag,
    isInstallment,
    metadata,
    status,
}: TransactionBadgesProps) {
    const refundStatus = metadata?.refund_status as string | undefined
    const isPendingRefund = refundStatus === 'requested'
    const isRefunded = refundStatus === 'confirmed'

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Tag Badge */}
            {tag && (
                <Badge
                    variant="outline"
                    className="text-xs font-medium rounded-sm bg-slate-100 text-slate-700 border-slate-300"
                >
                    {tag}
                </Badge>
            )}

            {/* Installment Badge */}
            {isInstallment && (
                <Link href="/installments" className="inline-block">
                    <Badge
                        variant="outline"
                        className="text-xs font-medium rounded-sm bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200 transition-colors"
                    >
                        <LinkIcon className="h-3 w-3 mr-1" />
                        INSTALLMENT
                    </Badge>
                </Link>
            )}

            {/* Refund Status Badges */}
            {isPendingRefund && (
                <Badge
                    variant="outline"
                    className="text-xs font-medium rounded-sm bg-yellow-100 text-yellow-700 border-yellow-300"
                >
                    REFUND PENDING
                </Badge>
            )}

            {isRefunded && (
                <Badge
                    variant="outline"
                    className="text-xs font-medium rounded-sm bg-green-100 text-green-700 border-green-300"
                >
                    REFUNDED
                </Badge>
            )}

            {/* Void Status */}
            {status === 'void' && (
                <Badge
                    variant="outline"
                    className="text-xs font-medium rounded-sm bg-red-100 text-red-700 border-red-300"
                >
                    VOID
                </Badge>
            )}
        </div>
    )
}
