import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AccountPersonFlowProps {
    accountName?: string | null
    accountImageUrl?: string | null
    personName?: string | null
    personImageUrl?: string | null
    type: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'
    /**
     * Context ID to determine what to hide
     * If viewing account detail page, pass accountId to hide account card
     * If viewing person detail page, pass personId to hide person avatar
     */
    contextAccountId?: string | null
    contextPersonId?: string | null
    transactionAccountId?: string | null
    transactionPersonId?: string | null
}

/**
 * Displays account → person flow for transactions
 * Context-aware: hides redundant information based on current page
 * Per PHASE 75 rules:
 * - On Account page: hide account, show person
 * - On Person page: hide person, show account
 * - Arrow only shows when both sides are visible
 */
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
    // Determine what to show based on context
    const isAccountContext = contextAccountId && contextAccountId === transactionAccountId
    const isPersonContext = contextPersonId && contextPersonId === transactionPersonId

    const showAccount = !isAccountContext && accountName
    const showPerson = !isPersonContext && personName && (type === 'debt' || type === 'repayment')
    const showArrow = showAccount && showPerson

    // If nothing to show, return null
    if (!showAccount && !showPerson) {
        return null
    }

    return (
        <div className="flex items-center gap-3">
            {/* Account Card */}
            {showAccount && (
                <div className="flex items-center gap-2">
                    {accountImageUrl ? (
                        <img
                            src={accountImageUrl}
                            alt={accountName || 'Account'}
                            className="h-8 w-8 rounded-none object-cover border border-slate-200"
                        />
                    ) : (
                        <div className="h-8 w-8 rounded-none bg-blue-100 border border-blue-200 flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-700">
                                {accountName?.charAt(0).toUpperCase() || 'A'}
                            </span>
                        </div>
                    )}
                    <Badge variant="secondary" className="text-xs font-medium rounded-sm">
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
                <div className="flex items-center gap-2">
                    {personImageUrl ? (
                        <img
                            src={personImageUrl}
                            alt={personName || 'Person'}
                            className="h-8 w-8 rounded-full object-cover border border-slate-200"
                        />
                    ) : (
                        <div className="h-8 w-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center">
                            <span className="text-xs font-semibold text-purple-700">
                                {personName?.charAt(0).toUpperCase() || 'P'}
                            </span>
                        </div>
                    )}
                    <Badge variant="secondary" className="text-xs font-medium rounded-sm">
                        {personName}
                    </Badge>
                </div>
            )}
        </div>
    )
}
