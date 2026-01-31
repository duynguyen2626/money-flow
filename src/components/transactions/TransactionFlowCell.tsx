import { TransactionWithDetails } from '@/types/moneyflow.types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'

interface TransactionFlowCellProps {
    transaction: TransactionWithDetails
    className?: string
}

export function TransactionFlowCell({ transaction, className }: TransactionFlowCellProps) {
    // Source Account Info
    const sourceName = transaction.account_name || 'Cash'
    const sourceImg = transaction.account_image_url || transaction.source_image
    // Use the newly calculated cycle range from service, fallback to format logic if needed (but service should handle it)
    // Or fallback to "Monthly Cycle" if null
    const sourceCycle = transaction.account_billing_cycle || 'Monthly Cycle'

    // Target Info
    let targetName = transaction.shop_name || transaction.category_name
    const targetImg = transaction.shop_image_url || transaction.shop?.image_url // Prefer explicit mapped url
    let targetType = transaction.shop_name ? 'shop' : 'category'
    let targetCycleTag = null

    if (transaction.person_id) {
        targetName = transaction.person_name || 'Unknown'
        targetType = 'person'
        // Use persisted cycle tag or fallback to transaction tag
        targetCycleTag = transaction.persisted_cycle_tag || transaction.tag || null
    }

    // Center Badges Logic
    const isSettled = transaction.metadata?.is_settled
    const isVoid = transaction.status === 'void'
    const hasCashback = (transaction.cashback_share_percent && transaction.cashback_share_percent > 0) || (transaction.cashback_share_amount && transaction.cashback_share_amount > 0)

    // Format cashback string if needed (e.g. "15K")
    let cbLabel = `CB`
    if (transaction.cashback_share_amount) {
        const kValue = Math.round(Number(transaction.cashback_share_amount) / 1000)
        if (kValue > 0) cbLabel = `CB: ${kValue}K`
    }

    return (
        <div className={cn("flex items-center justify-between gap-2 w-full", className)}>

            {/* Source Side (Account) - Align LEFT */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <Link href={`/accounts/${transaction.account_id}`} target="_blank" className="shrink-0">
                    {sourceImg ? (
                        <img
                            src={sourceImg}
                            alt={sourceName}
                            className="max-w-[64px] h-auto"
                            style={{ objectFit: 'contain' }}
                        />
                    ) : (
                        <div className="w-[48px] h-[30px] border rounded-none bg-white flex items-center justify-center">
                            <span className="text-[10px] font-bold text-muted-foreground">{sourceName?.slice(0, 2)}</span>
                        </div>
                    )}
                </Link>
                <div className="flex flex-col min-w-0 items-start">
                    <Link href={`/accounts/${transaction.account_id}`} target="_blank" className="hover:underline">
                        <span className="text-sm font-medium truncate w-full" title={sourceName}>{sourceName}</span>
                    </Link>
                    {sourceCycle && sourceCycle !== 'Monthly Cycle' && (
                        <Badge variant="secondary" className="h-[24px] px-2 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 mt-0.5">
                            {sourceCycle}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Center Flow / Status Badges */}
            <div className="flex flex-col items-center gap-1 shrink-0 px-2 min-w-[60px]">
                {isSettled && (
                    <Badge variant="outline" className="h-[24px] px-2 text-xs font-medium bg-green-50 text-green-700 border-green-200">
                        +1 Paid
                    </Badge>
                )}
                {hasCashback && (
                    <Badge variant="outline" className="h-[24px] px-2 text-xs font-medium bg-amber-50 text-amber-700 border-amber-200">
                        {cbLabel}
                    </Badge>
                )}
                {isVoid && (
                    <Badge variant="destructive" className="h-[24px] px-2 text-xs font-medium">
                        VOID
                    </Badge>
                )}
                {!isSettled && !isVoid && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                )}
            </div>

            {/* Target Side (Person/Shop) - Align RIGHT */}
            <div className="flex items-center justify-end gap-3 flex-1 min-w-0 text-right">
                <div className="flex flex-col items-end min-w-0">
                    {targetType === 'person' ? (
                        <Link href={`/people/${transaction.person_id}/details`} target="_blank" className="hover:underline">
                            <span className="text-sm font-medium truncate" title={targetName || ''}>{targetName}</span>
                        </Link>
                    ) : (
                        <span className="text-sm font-medium truncate" title={targetName || ''}>{targetName}</span>
                    )}

                    {targetType === 'person' && targetCycleTag && (
                        <Badge variant="secondary" className="h-[24px] px-2 text-xs font-medium mt-0.5">
                            {targetCycleTag}
                        </Badge>
                    )}
                </div>

                {targetType === 'person' ? (
                    <Link href={`/people/${transaction.person_id}/details`} target="_blank">
                        <div className="w-8 h-8 rounded-none overflow-hidden bg-indigo-600 cursor-pointer hover:ring-2 hover:ring-indigo-400 shrink-0">
                            {transaction.person_image_url || transaction.person?.image_url ? (
                                <img
                                    src={transaction.person_image_url || transaction.person?.image_url}
                                    alt={targetName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white text-sm font-medium">
                                    {transaction.person?.initials || targetName?.slice(0, 2)}
                                </div>
                            )}
                        </div>
                    </Link>
                ) : targetImg ? (
                    <div className="w-10 h-10 rounded-none overflow-hidden bg-white flex items-center justify-center shrink-0">
                        <img
                            src={targetImg}
                            alt={targetName}
                            className="w-full h-full object-contain"
                        />
                    </div>
                ) : (
                    <div className="w-8 h-8 rounded-none bg-muted flex items-center justify-center border shrink-0">
                        <span className="text-[10px] font-bold opacity-50">{targetName?.slice(0, 2)}</span>
                    </div>
                )}
            </div>

        </div>
    )
}
