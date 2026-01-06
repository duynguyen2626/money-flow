'use server'

import { createClient } from '@/lib/supabase/server'
import { allocateTransactionRepayment } from '@/lib/debt-allocation'
import { revalidatePath } from 'next/cache'

export async function migrateRepaymentMetadata(personId: string) {
    const supabase = createClient()

    // 1. Fetch ALL transactions for person (asc date) to replay history
    const { data: rawTxns, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('person_id', personId)
        .neq('status', 'void')
        .order('occurred_at', { ascending: true })

    if (error || !rawTxns) {
        console.error('Error fetching transactions for migration:', error)
        return { success: false, message: 'Failed to fetch transactions' }
    }

    const txns = rawTxns as any[]

    const debts: any[] = []
    const updates: { id: string, metadata: any }[] = []

    // 2. Replay History
    for (const txn of txns) {
        const type = txn.type
        // Identify Debts vs Repayments
        // Debts: 'debt' or 'expense' (legacy)
        // Repayments: 'repayment' or 'income' (legacy)

        const isDebt = type === 'debt' || type === 'expense'
        const isRepayment = type === 'repayment' || type === 'income'

        if (isDebt) {
            // Add to debt pool with full amount remaining initially
            debts.push({ ...txn, remaining: Math.abs(txn.amount) })
        } else if (isRepayment) {
            const amount = Math.abs(txn.amount)

            // Check if metadata already exists
            const existingAllocation = (txn.metadata as any)?.bulk_allocation

            if (existingAllocation) {
                // Already has data. Apply it to our running `debts` pool to keep state consistent.
                const paidDebts = existingAllocation.debts || []
                paidDebts.forEach((paid: any) => {
                    const target = debts.find(d => d.id === paid.id)
                    if (target) {
                        target.remaining -= paid.amount
                    }
                })
            } else {
                // Missing metadata. Calculate FIFO.
                const outstanding = debts
                    .filter(d => d.remaining > 0.01) // Filter fully paid
                    .map(d => ({
                        ...d,
                        amount: d.remaining, // IMPORTANT: Pass remaining as 'amount' for the allocator to see correct balance
                        original_id: d.id // Keep ref
                    })) as any[]

                const allocation = allocateTransactionRepayment(outstanding, amount)

                // Update running pool
                allocation.paidDebts.forEach((p: any) => {
                    // p.transaction is the mapped object. p.transaction.original_id is the real ID.
                    const realId = (p.transaction as any).original_id
                    const target = debts.find(d => d.id === realId)
                    if (target) {
                        target.remaining -= p.allocatedAmount
                    }
                })

                // Prepare Update if we actually allocated something
                if (allocation.paidDebts.length > 0) {
                    const newMetadata = {
                        ...(txn.metadata as object || {}),
                        bulk_allocation: {
                            amount: amount,
                            debts: allocation.paidDebts.map((p: any) => ({
                                id: (p.transaction as any).original_id,
                                amount: p.allocatedAmount,
                                tag: p.transaction.tag,
                                note: p.transaction.note ? p.transaction.note.substring(0, 20) : undefined
                            }))
                        }
                    }
                    updates.push({ id: txn.id, metadata: newMetadata })
                }
            }
        }
    }

    // 3. Batch Update
    console.log(`Migrating ${updates.length} repayments for person ${personId}`)
    let successCount = 0
    for (const update of updates) {
        const { error: updateError } = await supabase
            .from('transactions')
            .update({ metadata: update.metadata })
            .eq('id', update.id)

        if (!updateError) successCount++
    }

    revalidatePath(`/people/${personId}`)

    return { success: true, count: successCount, total: updates.length }
}
