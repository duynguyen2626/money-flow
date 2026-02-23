'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { BatchMasterItem } from '@/services/batch-master.service'

/**
 * Action to upsert a master checklist item
 */
export async function upsertBatchMasterItemAction(item: Partial<BatchMasterItem>) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('batch_master_items')
            .upsert({
                ...item,
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/batch/settings')
        revalidatePath('/batch')

        return { success: true, data }
    } catch (error: any) {
        console.error('Error upserting batch master item:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Action to delete a master checklist item
 */
export async function deleteBatchMasterItemAction(id: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('batch_master_items')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/batch/settings')
        revalidatePath('/batch')

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting batch master item:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Action to get master items (Server Side)
 */
export async function getBatchMasterItemsAction(bankType?: 'MBB' | 'VIB') {
    try {
        const supabase = await createClient()
        let query = supabase
            .from('batch_master_items')
            .select('*, accounts(*), categories(*)')
            .order('sort_order', { ascending: true })

        if (bankType) {
            query = query.eq('bank_type', bankType)
        }

        const { data, error } = await query
        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching batch master items:', error)
        return { success: false, error: error.message }
    }
}
