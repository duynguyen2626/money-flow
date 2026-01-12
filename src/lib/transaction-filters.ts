import { TransactionWithDetails } from '@/types/moneyflow.types'

export type FilterType = 'all' | 'income' | 'expense' | 'transfer' | 'lend' | 'repay' | 'cashback' | 'debt'

export function filterTransactionByType(
    txn: TransactionWithDetails,
    selectedType: FilterType
): boolean {
    const visualType = (txn as any).displayType ?? txn.type
    // Safe check for person_id existence (string or non-empty)
    const hasPerson = Boolean(txn.person_id)

    // Unified Logic (User Defined):

    // LEND: Matches Type Debt (< 0) ONLY. Exclude 'expense' even if it has person.
    if (selectedType === 'lend') {
        return (txn.type === 'debt' && (txn.amount ?? 0) < 0)
    }

    // REPAY: Matches Type Repayment OR (Debt + Positive) OR (Income + Person)
    if (selectedType === 'repay') {
        return txn.type === 'repayment' || (txn.type === 'debt' && (txn.amount ?? 0) > 0) || (visualType === 'income' && hasPerson)
    }

    // MY EXPENSES (Out): Matches pure Expense (no person)
    if (selectedType === 'expense') {
        return visualType === 'expense' && !hasPerson && txn.type !== 'debt'
    }

    // MY INCOME (In): Matches pure Income (no person)
    if (selectedType === 'income') {
        return visualType === 'income' && !hasPerson && txn.type !== 'repayment'
    }

    // CASHBACK: Show only > 0 cashback
    if (selectedType === 'cashback') {
        const amount = Math.abs(Number(txn.amount) || 0)
        let cashback = 0

        // Calculate actual cashback
        if (txn.final_price !== null && txn.final_price !== undefined) {
            const effectiveFinal = Math.abs(Number(txn.final_price))
            if (amount > effectiveFinal) {
                cashback = amount - effectiveFinal
            }
        } else if (txn.cashback_share_amount) {
            cashback = Number(txn.cashback_share_amount)
        } else if (txn.cashback_share_percent && txn.cashback_share_percent > 0) {
            cashback = amount * txn.cashback_share_percent
        }

        // Include income-based cashback
        // Note: checking metadata specifically
        if (txn.type === 'income' && (txn.note?.toLowerCase().includes('cashback') || (txn.metadata as any)?.is_cashback)) {
            cashback += amount
        }

        return cashback > 0
    }

    // Fallback for 'all', 'transfer', etc.
    // 'all' should handled by caller usually, but if passed here:
    if (selectedType === 'all') return true

    return visualType === selectedType
}
