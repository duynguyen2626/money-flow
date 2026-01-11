import { ArrowRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CustomTooltip } from '@/components/ui/custom-tooltip'

interface AccountPersonFlowProps {
    accountId?: string | null
    accountName?: string | null
    accountImageUrl?: string | null
    personId?: string | null
    personName?: string | null
    personImageUrl?: string | null
    type: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'
    contextAccountId?: string | null
    contextPersonId?: string | null
    transactionAccountId?: string | null
    transactionPersonId?: string | null
    cycleTag?: string | null
    isSplit?: boolean
    refundStatus?: string | null
    installmentsPaid?: number
    installmentsTotal?: number
}

export function AccountPersonFlow({
    accountId,
    accountName,
    accountImageUrl,
    personId,
    personName,
    personImageUrl,
    type,
    contextAccountId,
    contextPersonId,
    transactionAccountId,
    transactionPersonId,
    cycleTag,
    isSplit,
    refundStatus,
    installmentsPaid,
    installmentsTotal,
}: AccountPersonFlowProps) {
    const isAccountContext = contextAccountId && contextAccountId === transactionAccountId
    const isPersonContext = contextPersonId && contextPersonId === transactionPersonId

    // SIMPLIFIED LOGIC: Always show if name exists, regardless of type
    const showAccount = !isAccountContext && !!accountName
    const showPerson = !isPersonContext && !!personName
    const showArrow = showAccount && showPerson

    if (!showAccount && !showPerson) {
        return null
    }

    const isDebt = type === 'debt'
    const isRepayment = type === 'repayment'

    return (
        <div className="flex items-center justify-between gap-2 w-full">
            {/* Account Side - ALIGN LEFT */}
            <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                {showAccount ? (
                    <div className="flex flex-col items-start w-full">
                        <div className="flex items-center gap-2 w-full">
                            {/* Image First */}
                            <Link href={`/accounts/${accountId}`} target="_blank" className="flex-shrink-0">
                                {accountImageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={accountImageUrl}
                                        alt={accountName || 'Account'}
                                        className="h-9 w-9 rounded-lg object-cover hover:opacity-80 transition-opacity cursor-pointer"
                                    />
                                ) : (
                                    <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer">
                                        <span className="text-sm font-semibold text-blue-700">
                                            {accountName?.charAt(0).toUpperCase() || 'A'}
                                        </span>
                                    </div>
                                )}
                            </Link>

                            {/* Name After */}
                            <Link href={`/accounts/${accountId}`} target="_blank" className="min-w-0 flex-1">
                                <Badge variant="secondary" className="text-xs font-medium rounded-sm truncate w-full justify-start hover:bg-slate-200 cursor-pointer px-2 py-1">
                                    {accountName}
                                </Badge>
                            </Link>
                        </div>

                        {/* Cycle Tag under account - Align Left */}
                        {cycleTag && (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200 ml-11">
                                {cycleTag}
                            </span>
                        )}
                    </div>
                ) : <div className="flex-1" />}
            </div>

            {/* Arrow Center */}
            <div className="flex flex-col items-center justify-center px-1 shrink-0">
                {showArrow && (
                    <>
                        <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        {/* Badges under arrow */}
                        <div className="flex flex-col items-center gap-0.5 mt-0.5">
                            {isSplit && (
                                <span className="text-[10px] text-amber-600 font-medium whitespace-nowrap bg-amber-50 px-1 rounded border border-amber-100">
                                    Split
                                </span>
                            )}
                            {refundStatus === 'requested' && (
                                <span className="text-[10px] text-orange-600 font-medium whitespace-nowrap bg-orange-50 px-1 rounded border border-orange-100">
                                    Refund
                                </span>
                            )}
                            {refundStatus === 'confirmed' && (
                                <span className="text-[10px] text-green-600 font-medium whitespace-nowrap bg-green-50 px-1 rounded border border-green-100">
                                    Refunded
                                </span>
                            )}
                            {installmentsPaid !== undefined && installmentsTotal !== undefined && installmentsPaid > 0 && (
                                <span className="text-[10px] text-purple-600 font-medium whitespace-nowrap bg-purple-50 px-1 rounded border border-purple-100">
                                    +{installmentsPaid} Paid
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Person Side - ALIGN RIGHT */}
            <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
                {showPerson ? (
                    <div className="flex flex-col items-end w-full">
                        <div className="flex items-center gap-2 w-full justify-end">
                            {/* Name First - Person Badge (Different Color/Size) */}
                            <Link href={`/people/${personId}/details`} target="_blank" className="min-w-0 flex-1 flex justify-end">
                                <Badge variant="secondary" className="text-xs font-semibold rounded-sm truncate w-full justify-end hover:bg-purple-100 cursor-pointer px-2 py-1 bg-purple-50 text-purple-700 border-purple-100">
                                    {personName}
                                </Badge>
                            </Link>

                            {/* Image After (Original Size, No Rounded) */}
                            <Link href={`/people/${personId}/details`} target="_blank" className="flex-shrink-0">
                                {personImageUrl ? (
                                    <CustomTooltip content={personName}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={personImageUrl}
                                            alt={personName || 'Person'}
                                            className="h-9 w-auto object-contain hover:opacity-80 transition-opacity cursor-pointer"
                                            style={{ maxWidth: '40px' }}
                                        />
                                    </CustomTooltip>
                                ) : (
                                    <div className="h-9 w-9 rounded-md bg-purple-100 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer">
                                        <span className="text-sm font-semibold text-purple-700">
                                            {personName?.charAt(0).toUpperCase() || 'P'}
                                        </span>
                                    </div>
                                )}
                            </Link>
                        </div>

                        {/* Cycle Tag under person - Align Right */}
                        {cycleTag && (isDebt || isRepayment) && (
                            <span className={cn(
                                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border mr-11",
                                isDebt ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}>
                                {isDebt && <ArrowUpRight className="h-2.5 w-2.5" />}
                                {isRepayment && <ArrowDownLeft className="h-2.5 w-2.5" />}
                                {cycleTag}
                            </span>
                        )}
                    </div>
                ) : <div className="flex-1" />}
            </div>
        </div>
    )
}
