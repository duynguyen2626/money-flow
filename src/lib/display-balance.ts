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

    // In family tab:
    // 1. Identify valid Parent
    const parentId = account.parent_account_id || account.relationships?.parent_info?.id

    // If this IS a parent (no parentId but might have children - handled by UI usually passing parent as is, but logic below works if we are child)
    // Actually, if I am a Child, I want to show the FAMILY Shared Limit.
    // If I am a Parent, I also want to show the FAMILY Shared Limit.

    let targetParentId = parentId;
    // If no parentId, maybe I am the parent? Check if I have children? 
    // The current logic only overrides 'isChild'. 
    // If I am Parent, I show 'current_balance'. 
    // BUT 'current_balance' might be wrong if it doesn't account for children usage!
    // So we should APPLY THE SAME LOGIC for Parent too if we want consistency.
    // However, the function signature doesn't easily let us know if 'account' is a parent without searching 'allAccounts'.

    if (!targetParentId) {
        // Assume I am parent if looking for aggregation, OR just return own balance.
        // Let's stick to fixing the CHILD case first as reported.
        // But if Child shows 27M and Parent shows 30M, user complains about mismatch?
        // Actually user complained Child showed 30M (Parent's raw) instead of 27M (Real shared).

        // If 'account' is Parent, and we want to show aggregated, we need to find its children.
        targetParentId = account.id;
    }

    if (allAccounts) {
        const parent = allAccounts.find(acc => acc.id === targetParentId);
        if (parent) {
            // Find all family members (Parent + Children)
            const children = allAccounts.filter(acc =>
                acc.parent_account_id === parent.id ||
                acc.relationships?.parent_info?.id === parent.id
            );

            const familyMembers = [parent, ...children];

            // Calculate Total Used
            // Assumption: Credit Card 'current_balance' = Available Limit.
            // Used = Credit Limit - Current Balance.
            // If Account is NOT credit card, this logic might be weird.
            // Ensure we only do this for credit cards.
            if (parent.type === 'credit_card') {
                const totalLimit = parent.credit_limit ?? 0;

                let totalUsed = 0;

                familyMembers.forEach(member => {
                    const limit = member.credit_limit ?? 0;
                    const balance = member.current_balance ?? 0;

                    // Usage on this card
                    // If member has its own limit (sub-limit), logic is complex.
                    // Assume Shared Limit model: All usage deducts from Parent Limit.
                    // Member Used = Limit - Balance? 
                    // No, if member shares limit, usually member.limit == parent.limit (visually) or 0?
                    // Let's assume: Used = (Limit > 0 ? Limit : 0) - Balance. 
                    // WAIT. If Child Limit is 0, and Balance is -3M (spent 3M). Used = 0 - (-3M) = 3M.
                    // If Child Limit is 30M, and Balance is 27M. Used = 30M - 27M = 3M.
                    // So `max(0, (Limit || 0) - Balance)` isn't quite right if Balance can be negative.

                    // Robust check:
                    let used = 0;
                    if ((member.credit_limit || 0) > 0) {
                        used = (member.credit_limit || 0) - balance;
                    } else {
                        // If no limit, assume balance is negative debt? 
                        // Or maybe `current_balance` is just positive available?
                        // If limit is 0, and balance is 0 => used 0.
                        // If limit is 0, and balance is -100 => used 100.
                        used = -balance;
                    }
                    // Sanity check
                    if (used < 0) used = 0;

                    totalUsed += used;
                });

                // Effective Available
                const effectiveAvailable = totalLimit - totalUsed;
                return effectiveAvailable;
            }

            // Fallback for non-credit cards (e.g. Bank Account Parent/Child?)
            return parent.current_balance ?? 0;
        }
    }

    // Default: show own balance
    return account.current_balance ?? 0
}
