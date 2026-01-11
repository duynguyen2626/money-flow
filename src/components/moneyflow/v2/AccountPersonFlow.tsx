import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
}: AccountPersonFlowProps) {
    const isAccountContext = contextAccountId && contextAccountId === transactionAccountId
    const isPersonContext = contextPersonId && contextPersonId === transactionPersonId

    const showAccount = !isAccountContext && accountName
    const showPerson = !isPersonContext && personName && (type === 'debt' || type === 'repayment')
    const showArrow = showAccount && showPerson

    if (!showAccount && !showPerson) {
        return null
    }

    return (
        <div className="flex items-center gap-3">
            {/* Account Card */}
            {showAccount && (
                <div className="flex items-center gap-2 min-w-0">
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
                    <Badge variant="secondary" className="text-xs font-medium rounded-sm truncate max-w-[120px]">
                        {accountName}
                    </Badge>
                </div>
            )}

            {/* Arrow */}
            {showArrow && (
                <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
            )}

            {/* Person Avatar */}
            {showPerson && (
                <div className="flex items-center gap-2 min-w-0">
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
                    <Badge variant="secondary" className="text-xs font-medium rounded-sm truncate max-w-[120px]">
                        {personName}
                    </Badge>
                </div>
            )}
        </div>
    )
}
