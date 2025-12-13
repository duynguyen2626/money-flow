import { Account } from '@/types/moneyflow.types'

export type DisplayContext = 'family_tab' | 'table' | 'card' | 'other'

/**
 * Get display balance for an account based on context
 * 
 * Rule: In Family tab, child cards show parent's balance (shared limit model)
 * In all other contexts, show account's own balance
 * 
 * @param account - The account to get balance for
 * @param context - Display context (family_tab, table, card, other)
 * @param allAccounts - All accounts (needed to find parent in family_tab context)
 * @returns Display balance for the account
 */
export function getDisplayBalance(
    account: Account,
    context: DisplayContext,
    allAccounts?: Account[]
): number {
    // If not in family tab, always show own balance
    if (context !== 'family_tab') {
        return account.current_balance ?? 0
    }

    // In family tab: if this is a child card, show parent's balance
    const isChild = !!account.parent_account_id || !!account.relationships?.parent_info

    if (isChild && allAccounts) {
        // Find parent account
        const parentId = account.parent_account_id || account.relationships?.parent_info?.id
        const parent = allAccounts.find(acc => acc.id === parentId)

        if (parent) {
            return parent.current_balance ?? 0
        }
    }

    // Default: show own balance
    return account.current_balance ?? 0
}
