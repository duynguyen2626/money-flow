'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpsertBatchItemParams {
    monthYear: string
    period: 'before' | 'after'
    bankType: 'MBB' | 'VIB'
    masterItemId: string
    amount: number
    receiverName: string
    bankNumber: string
    bankName: string
    targetAccountId: string | null
}

/**
 * High-speed amount update action
 * Ensures a batch exists and an item exists, then updates the amount.
 */
export async function upsertBatchItemAmountAction(params: UpsertBatchItemParams) {
    try {
        const supabase: any = await createClient()

        // 1. Ensure Batch exists
        // monthYear is YYYY-MM
        const [year, month] = params.monthYear.split('-')
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthName = `${monthNames[parseInt(month) - 1]} ${year} (${params.period === 'before' ? 'Early' : 'Late'})`

        let { data: batch, error: batchError } = await supabase
            .from('batches')
            .select('id, name')
            .eq('month_year', params.monthYear)
            .eq('bank_type', params.bankType)

        if (batchError) throw batchError

        // Manual filter by period name suffix or column if possible
        const expectedSuffix = params.period === 'before' ? '(Early)' : '(Late)'
        batch = batch?.find((b: any) =>
            (b.period === params.period) ||
            (b.name?.includes(expectedSuffix))
        ) || null

        let batchId = batch?.id

        if (!batchId) {
            // Create batch
            const { data: newBatch, error: createError } = await supabase
                .from('batches')
                .insert({
                    month_year: params.monthYear,
                    name: monthName,
                    bank_type: params.bankType,
                    period: params.period,
                    status: 'draft'
                })
                .select()
                .single()

            if (createError) throw createError
            batchId = newBatch.id
        }

        // 2. Ensure Batch Item exists
        const { data: existingItem, error: itemSearchError } = await supabase
            .from('batch_items')
            .select('id')
            .eq('batch_id', batchId)
            .eq('master_item_id', params.masterItemId)
            .maybeSingle()

        if (itemSearchError) throw itemSearchError

        if (existingItem) {
            // Update
            const { error: updateError } = await supabase
                .from('batch_items')
                .update({ amount: params.amount })
                .eq('id', existingItem.id)
            if (updateError) throw updateError
        } else {
            // Create
            const { error: insertError } = await supabase
                .from('batch_items')
                .insert({
                    batch_id: batchId,
                    master_item_id: params.masterItemId,
                    amount: params.amount,
                    receiver_name: params.receiverName,
                    bank_number: params.bankNumber,
                    bank_name: params.bankName,
                    target_account_id: params.targetAccountId,
                    status: 'draft'
                })
            if (insertError) throw insertError
        }

        revalidatePath('/batch')
        return { success: true, batchId }
    } catch (error: any) {
        console.error('Speed update failed:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Bulk initialize a batch for a month/period using all active master items
 */
export async function bulkInitializeFromMasterAction(params: {
    monthYear: string
    period: 'before' | 'after'
    bankType: 'MBB' | 'VIB'
    phaseId?: string
}) {
    try {
        const supabase: any = await createClient()

        // 1. Fetch all active master items (prefer phase_id, fallback to cutoff_period)
        let masterQuery = supabase
            .from('batch_master_items')
            .select('*')
            .eq('bank_type', params.bankType)
            .eq('is_active', true)

        if (params.phaseId) {
            masterQuery = masterQuery.eq('phase_id', params.phaseId)
        } else {
            masterQuery = masterQuery.eq('cutoff_period', params.period)
        }

        const { data: masterItems, error: masterError } = await masterQuery

        if (masterError) throw masterError
        if (!masterItems || masterItems.length === 0) {
            return { success: false, error: 'No active master items found for this period.' }
        }

        // 2. Ensure Batch exists
        const [year, month] = params.monthYear.split('-')
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthName = `${monthNames[parseInt(month) - 1]} ${year} (${params.period === 'before' ? 'Early' : 'Late'})`

        let { data: allBatches, error: batchError } = await supabase
            .from('batches')
            .select('id, name')
            .eq('month_year', params.monthYear)
            .eq('bank_type', params.bankType)

        if (batchError) throw batchError

        const expectedSuffix = params.period === 'before' ? '(Early)' : '(Late)'
        const batch = allBatches?.find((b: any) =>
            (b.period === params.period) ||
            (b.name?.includes(expectedSuffix))
        ) || null

        let batchId = batch?.id
        if (!batchId) {
            const insertData: any = {
                month_year: params.monthYear,
                name: monthName,
                bank_type: params.bankType,
                status: 'draft'
            }
            // Only add period if the column is likely to exist (we'll try and if it fails, we'll try without)
            try {
                const { data: newBatch, error: createError } = await supabase
                    .from('batches')
                    .insert({ ...insertData, period: params.period, phase_id: params.phaseId || null })
                    .select()
                    .single()

                if (createError) throw createError
                batchId = newBatch.id
            } catch (e) {
                const { data: newBatch, error: createError } = await supabase
                    .from('batches')
                    .insert(insertData)
                    .select()
                    .single()
                if (createError) throw createError
                batchId = newBatch.id
            }
        }

        // 3. Fetch existing items to avoid duplicates
        const { data: existingItems } = await supabase
            .from('batch_items')
            .select('master_item_id')
            .eq('batch_id', batchId)

        const existingMasterIds = new Set(existingItems?.map((i: any) => i.master_item_id) || [])

        // 4. Filter and insert missing items
        const itemsToInsert = masterItems
            .filter((m: any) => !existingMasterIds.has(m.id))
            .map((m: any) => ({
                batch_id: batchId,
                master_item_id: m.id,
                amount: 0,
                receiver_name: m.receiver_name,
                bank_number: m.bank_number,
                bank_name: m.bank_name,
                target_account_id: m.target_account_id,
                status: 'draft'
            }))

        if (itemsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('batch_items')
                .insert(itemsToInsert)
            if (insertError) throw insertError
        }

        revalidatePath('/batch')
        return { success: true, batchId, initializedCount: itemsToInsert.length }
    } catch (error: any) {
        console.error('Bulk initialization failed:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Toggle confirmation status of a batch item
 */
export async function toggleBatchItemConfirmAction(params: {
    batchItemId: string
    currentStatus: string
}) {
    try {
        const supabase: any = await createClient()
        if (params.currentStatus === 'confirmed') {
            // Unconfirm (void transaction)
            const { data: item } = await supabase.from('batch_items').select('transaction_id').eq('id', params.batchItemId).single()
            if (item?.transaction_id) {
                const { voidTransaction } = await import('@/services/transaction.service')
                await voidTransaction(item.transaction_id)
                // Also revert batch item status
                const { revertBatchItem } = await import('@/services/batch.service')
                await revertBatchItem(item.transaction_id)
            } else {
                await supabase.from('batch_items').update({ status: 'pending' }).eq('id', params.batchItemId)
            }
            revalidatePath('/batch')
            return { success: true, newStatus: 'pending' }
        } else {
            // Confirm (create transaction)
            const { confirmBatchItem } = await import('@/services/batch.service')
            await confirmBatchItem(params.batchItemId)
            revalidatePath('/batch')
            return { success: true, newStatus: 'confirmed' }
        }
    } catch (error: any) {
        console.error('Confirm toggle failed:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Bulk confirm batch items
 */
export async function bulkConfirmBatchItemsAction(batchId: string, itemIds: string[]) {
    try {
        if (!itemIds || itemIds.length === 0) return { success: true, count: 0 }
        const { confirmBatchItem } = await import('@/services/batch.service')

        let count = 0
        for (const id of itemIds) {
            await confirmBatchItem(id)
            count++
        }

        revalidatePath('/batch')
        return { success: true, count }
    } catch (error: any) {
        console.error('Bulk confirm failed:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Bulk unconfirm batch items
 */
export async function bulkUnconfirmBatchItemsAction(batchId: string, itemIds: string[]) {
    try {
        if (!itemIds || itemIds.length === 0) return { success: true, count: 0 }

        const supabase: any = await createClient()
        const { data: items } = await supabase.from('batch_items').select('id, transaction_id').in('id', itemIds)

        const { voidTransaction } = await import('@/services/transaction.service')
        const { revertBatchItem } = await import('@/services/batch.service')

        let count = 0
        for (const item of items || []) {
            if (item.transaction_id) {
                await voidTransaction(item.transaction_id)
                await revertBatchItem(item.transaction_id)
            } else {
                await supabase.from('batch_items').update({ status: 'pending' }).eq('id', item.id)
            }
            count++
        }

        revalidatePath('/batch')
        return { success: true, count }
    } catch (error: any) {
        console.error('Bulk unconfirm failed:', error)
        return { success: false, error: error.message }
    }
}
