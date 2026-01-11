import { ArrowRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

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

    const showAccount = !isAccountContext && accountName
    const showPerson = !isPersonContext && personName && (type === 'debt' || type === 'repayment')
    const showArrow = showAccount && showPerson

    if (!showAccount && !showPerson) {
        return null
    }

    const isDebt = type === 'debt'
    const isRepayment = type === 'repayment'

    return (
        <div className="flex items-center justify-center gap-3">
            {/* Account Card - Image BEFORE Text */}
            {showAccount && (
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                        {/* Image First */}
                        {accountImageUrl ? (
                            <Link href={`/accounts/${accountId}`} target="_blank" className="flex-shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={accountImageUrl}
                                    alt={accountName || 'Account'}
                                    className="h-8 w-8 rounded-none object-cover border border-slate-200 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
                                />
                            </Link>
                        ) : (
                            <Link href={`/accounts/${accountId}`} target="_blank" className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-none bg-blue-100 border border-blue-200 flex items-center justify-center hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer">
                                    <span className="text-xs font-semibold text-blue-700">
                                        {accountName?.charAt(0).toUpperCase() || 'A'}
                                    </span>
                                </div>
                            </Link>
                        )}
                        {/* Badge After */}
                        <Badge variant="secondary" className="text-xs font-medium rounded-sm truncate max-w-[100px]">
                            {accountName}
                        </Badge>
                    </div>
                    {/* Cycle Tag Badge under account */}
                    {cycleTag && (
                        <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {cycleTag}
                        </span>
                    )}
                </div>
            )}

            {/* Arrow */}
            {showArrow && (
                <div className="flex flex-col items-center gap-1">
                    <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    {/* Badges under arrow: Split, Refund, +xPaid */}
                    <div className="flex flex-wrap items-center gap-1 justify-center">
                        {isSplit && (
                            <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                                Split
                            </span>
                        )}
                        {refundStatus === 'requested' && (
                            <span className="inline-flex items-center rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                                Refund
                            </span>
                        )}
                        {refundStatus === 'confirmed' && (
                            <span className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                                Refunded
                            </span>
                        )}
                        {installmentsPaid !== undefined && installmentsTotal !== undefined && (
                            <span className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                                +{installmentsPaid}/{installmentsTotal}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Person Avatar - Image BEFORE Text */}
            {showPerson && (
                <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2">
                        {/* Image First */}
                        {personImageUrl ? (
                            <Link href={`/people/${personId}`} target="_blank" className="flex-shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={personImageUrl}
                                    alt={personName || 'Person'}
                                    className="h-8 w-8 rounded-full object-cover border border-slate-200 hover:ring-2 hover:ring-purple-400 transition-all cursor-pointer"
                                />
                            </Link>
                        ) : (
                            <Link href={`/people/${personId}`} target="_blank" className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center hover:ring-2 hover:ring-purple-400 transition-all cursor-pointer">
                                    <span className="text-xs font-semibold text-purple-700">
                                        {personName?.charAt(0).toUpperCase() || 'P'}
                                    </span>
                                </div>
                            </Link>
                        )}
                        {/* Badge After */}
                        <Badge variant="secondary" className="text-xs font-medium rounded-sm truncate max-w-[100px]">
                            {personName}
                        </Badge>
                    </div>
                    {/* Debt/Repayment Badge under person */}
                    {isDebt && (
                        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            <ArrowUpRight className="h-3 w-3" />
                            Debt
                        </span>
                    )}
                    {isRepayment && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <ArrowDownLeft className="h-3 w-3" />
                            Repayment
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
