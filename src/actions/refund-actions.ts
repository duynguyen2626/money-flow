'use server'

import { createClient } from '@/lib/supabase/server'
import { SYSTEM_ACCOUNTS } from '@/lib/constants'
import { revalidatePath } from 'next/cache'

/**
 * Confirm money received from pending refunds
 * Creates a transaction moving money from Pending Refunds to the target account
 */
export async function confirmRefundMoneyReceived(
    transactionId: string,
    targetAccountId: string
) {
    try {
        const supabase: any = await createClient()

        // 1. Get the original transaction to find the refund amount
        const { data: originalTx, error: txError } = await supabase
            .from('transactions')
            .select('*, transaction_lines(*)')
            .eq('id', transactionId)
            .single()

        if (txError || !originalTx) {
            throw new Error('Transaction not found')
        }

        // Find the refund line (debit to pending refunds account)
        const refundLine = (originalTx.transaction_lines as any[])?.find(
            (line: any) =>
                line.account_id === SYSTEM_ACCOUNTS.PENDING_REFUNDS &&
                line.type === 'debit'
        )

        if (!refundLine) {
            throw new Error('No refund line found in this transaction')
        }

        const refundAmount = Math.abs(refundLine.amount)

        // 2. Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser()
        const userId = user?.id ?? SYSTEM_ACCOUNTS.DEFAULT_USER_ID

        // 3. Create new transaction for confirmation
        const { data: newTx, error: newTxError } = await supabase
            .from('transactions')
            .insert({
                occurred_at: new Date().toISOString(),
                note: `Refund Received: ${originalTx.note || 'Pending refund'}`,
                status: 'posted',
                tag: 'REFUND_CONFIRMED',
                created_by: userId,
            })
            .select()
            .single()

        if (newTxError) throw newTxError

        // 4. Create transaction lines (Pending Refunds -> Target Account)
        const lines = [
            {
                transaction_id: newTx.id,
                account_id: SYSTEM_ACCOUNTS.PENDING_REFUNDS,
                amount: -refundAmount,
                type: 'credit',
            },
            {
                transaction_id: newTx.id,
                account_id: targetAccountId,
                amount: refundAmount,
                type: 'debit',
            },
        ]

        const { error: linesError } = await supabase
            .from('transaction_lines')
            .insert(lines)

        if (linesError) throw linesError

        // 5. Recalculate balances
        const { recalculateBalance } = await import('@/services/account.service')
        await recalculateBalance(SYSTEM_ACCOUNTS.PENDING_REFUNDS)
        await recalculateBalance(targetAccountId)

        revalidatePath('/')
        return { success: true, transactionId: newTx.id }
    } catch (error: any) {
        console.error('Error confirming refund:', error)
        return { success: false, error: error.message }
    }
}
