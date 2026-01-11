import { ArrowRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface AccountPersonFlowProps {
    accountName?: string | null
    accountImageUrl?: string | null
    personName?: string | null
    personImageUrl?: string | null
    type: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'
    contextAccountId?: string | null
    contextPersonId?: string | null
    transactionAccountId?: string | null
    transactionPersonId?: string | null
    cycleTag?: string | null
}

export function AccountPersonFlow({
    accountName,
    accountImageUrl,
    personName,
    personImageUrl,
    type,
    contextAccountId,
    contextPersonId,
    transactionAccountId,
    transactionPersonId,
    cycleTag,
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
            {/* Account Card - Right aligned */}
            {showAccount && (
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-medium rounded-sm truncate max-w-[100px]">
                            {accountName}
                        </Badge>
                        {accountImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={accountImageUrl}
                                alt={accountName || 'Account'}
                                className="h-8 w-8 rounded-none object-cover border border-slate-200 flex-shrink-0"
                            />
                        ) : (
                            <div className="h-8 w-8 rounded-none bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-blue-700">
                                    {accountName?.charAt(0).toUpperCase() || 'A'}
                                </span>
                            </div>
                        )}
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
                <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
            )}

            {/* Person Avatar - Left aligned */}
            {showPerson && (
                <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2">
                        {personImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={personImageUrl}
                                alt={personName || 'Person'}
                                className="h-8 w-8 rounded-full object-cover border border-slate-200 flex-shrink-0"
                            />
                        ) : (
                            <div className="h-8 w-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-purple-700">
                                    {personName?.charAt(0).toUpperCase() || 'P'}
                                </span>
                            </div>
                        )}
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
