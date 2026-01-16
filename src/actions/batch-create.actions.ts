'use server'

import { revalidatePath } from 'next/cache'
import { createBatch, createBatchFromClone } from '@/services/batch.service'

/**
 * Create a fresh batch (empty)
 */
export async function createFreshBatchAction(params: {
    monthYear: string
    monthName: string
    bankType: 'MBB' | 'VIB'
}) {
    try {
        const batch = await createBatch({
            name: params.monthName,
            month_year: params.monthYear,
            bank_type: params.bankType,
            status: 'pending',

            is_template: false
        })

        revalidatePath(`/batch/${params.bankType.toLowerCase()}`)
        revalidatePath('/batch')

        return {
            success: true,
            data: batch
        }
    } catch (error) {
        console.error('Failed to create fresh batch:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create batch'
        }
    }
}

/**
 * Create a batch by cloning from another batch
 */
export async function createCloneBatchAction(params: {
    monthYear: string
    monthName: string
    bankType: 'MBB' | 'VIB'
    sourceBatchId: string
    amounts: Record<string, { amount: number; skip: boolean }>
}) {
    try {
        // Convert amounts to items array
        const items = Object.entries(params.amounts)
            .filter(([_, data]) => !data.skip && data.amount > 0)
            .map(([bankCode, data]) => ({
                bank_name: bankCode, // Will be mapped to full name in service
                bank_code: bankCode,
                amount: data.amount
            }))

        const batch = await createBatchFromClone({
            source_batch_id: params.sourceBatchId,
            month_year: params.monthYear,
            bank_type: params.bankType,
            items
        })

        revalidatePath(`/batch/${params.bankType.toLowerCase()}`)
        revalidatePath('/batch')

        return {
            success: true,
            data: batch
        }
    } catch (error) {
        console.error('Failed to create clone batch:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create batch'
        }
    }
}

/**
 * Get batch items for a specific batch
 */
export async function getBatchItemsAction(batchId: string) {
    try {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = createClient()

        const { data, error } = await supabase
            .from('batch_items')
            .select('*')
            .eq('batch_id', batchId)
            .order('created_at', { ascending: true })

        if (error) throw error

        return {
            success: true,
            data: data || []
        }
    } catch (error) {
        console.error('Failed to get batch items:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get batch items',
            data: []
        }
    }
}
