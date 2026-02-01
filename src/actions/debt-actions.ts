'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Handles batch debt repayment.
 * 1. Creates a PARENT transaction (Real Money In to Bank).
 * 2. Creates CHILD transactions (Virtual Allocations to Person's Debt Cycles).
 */
export async function repayBatchDebt(
    personId: string,
    totalAmount: number,
    bankAccountId: string,
    allocations: Record<string, number>, // Maps tagLabel -> amount
    note?: string
) {
    const supabase = createClient()

    try {
        // 1. Create PARENT Transaction (Money Movement)
        // accounts: Bank +Total
        // person: NULL (to avoid double counting with children)
        const parentTxn = {
            occurred_at: new Date().toISOString(),
            note: note ? `Repayment: ${note}` : 'Debt Repayment (Batch)',
            type: 'income', // Income = Money In
            account_id: bankAccountId,
            amount: Math.abs(totalAmount),
            person_id: null,
            metadata: {
                is_debt_repayment_parent: true,
                original_person_id: personId
            },
            status: 'posted'
        }

        const { data: parentData, error: parentError } = await supabase
            .from('transactions')
            .insert(parentTxn)
            .select()
            .single()

        const parent = parentData as any

        if (parentError || !parent) {
            throw new Error(`Failed to create parent transaction: ${parentError?.message}`)
        }

        // 2. Create CHILD Transactions (Allocations)
        // accounts: NULL (Virtual)
        // person: assigned
        // Linked to parent
        const childrenToInsert = Object.entries(allocations)
            .filter(([_, amount]) => amount > 0)
            .map(([tag, amount]) => ({
                occurred_at: new Date().toISOString(),
                note: `Allocated Repayment for ${tag}`,
                type: 'income',
                account_id: null as string | null, // Virtual transaction
                person_id: personId,
                amount: Math.abs(amount),
                tag: tag as string | null, // Using the tagLabel as the tag
                linked_transaction_id: parent.id,
                status: 'posted',
                metadata: {
                    is_debt_repayment_child: true,
                    parent_transaction_id: parent.id
                }
            }))

        // Handle Excess (Unallocated) -> generic credit to person
        const allocatedSum = Object.values(allocations).reduce((a, b) => a + b, 0)
        const excess = Math.abs(totalAmount) - allocatedSum

        if (excess > 0.01) {
            childrenToInsert.push({
                occurred_at: new Date().toISOString(),
                note: `Unallocated Repayment (Excess)`,
                type: 'income',
                account_id: null,
                person_id: personId,
                amount: excess,
                tag: null,
                linked_transaction_id: parent.id,
                status: 'posted', // posted immediately
                metadata: {
                    is_debt_repayment_child: true,
                    is_excess: true,
                    parent_transaction_id: parent.id
                } as any
            })
        }

        if (childrenToInsert.length > 0) {
            const { error: childrenError } = await supabase
                .from('transactions')
                .insert(childrenToInsert as any)

            if (childrenError) {
                // Formatting error for better debugging
                console.error("Child Creation Error:", childrenError)

                // Rollback parent
                await supabase.from('transactions').delete().eq('id', parent.id)
                throw new Error(`Failed to create child transactions: ${childrenError.message}`)
            }
        }

        // 3. Recalculate Bank Balance
        // We need to trigger recalculation for the bank account
        const { recalculateBalance, getAccountById } = await import('@/services/account.service')

        // Fetch Bank Name for Sync
        let bankName = "Bank Transfer"
        try {
            const bankAccount = await getAccountById(bankAccountId)
            if (bankAccount) bankName = bankAccount.name
        } catch (e) {
            console.warn("Could not fetch bank name for repayment tag", e)
        }

        // Update Parent with Shop Name (for Sync)
        await supabase
            .from('transactions')
            .update({ shop: bankName })
            .eq('id', parent.id)

        await recalculateBalance(bankAccountId)

        // 4. Revalidate UI
        revalidatePath('/people')
        revalidatePath(`/people/${personId}`)
        revalidatePath('/transactions')
        revalidatePath('/accounts')

        return { success: true, parentId: parent.id }

    } catch (error: any) {
        console.error("repayBatchDebt failed:", error)
        return { success: false, error: error.message }
    }
}
