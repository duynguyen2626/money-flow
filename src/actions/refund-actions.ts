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
            .select('*')
            .eq('id', transactionId)
            .single()

        if (txError || !originalTx) {
            throw new Error('Transaction not found')
        }

        // Verify this is a refund to Pending Refunds
        // In flat schema: Transaction with target_account_id = PENDING_REFUNDS
        if (originalTx.target_account_id !== SYSTEM_ACCOUNTS.PENDING_REFUNDS) {
            // Fallback/Legacy check: if it was a legacy txn, we might be stuck.
            // But for now strict enforcement preferred.
            throw new Error('Transaction is not a valid pending refund (Target != Pending Refunds)')
        }

        const refundAmount = Math.abs(originalTx.amount)

        // 2. Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser()
        const userId = user?.id ?? SYSTEM_ACCOUNTS.DEFAULT_USER_ID

        // 3. Create new transaction for confirmation (Pending Refunds -> Target Account)
        // This is a Transfer.
        const { data: newTx, error: newTxError } = await supabase
            .from('transactions')
            .insert({
                occurred_at: new Date().toISOString(),
                note: `Refund Received: ${originalTx.note || 'Pending refund'}`,
                status: 'posted',
                tag: 'REFUND_CONFIRMED',
                created_by: userId,
                type: 'transfer',
                account_id: SYSTEM_ACCOUNTS.PENDING_REFUNDS,
                target_account_id: targetAccountId,
                amount: -refundAmount, // Standard transfer logic: negative from source
            })
            .select()
            .single()

        if (newTxError) throw newTxError

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
