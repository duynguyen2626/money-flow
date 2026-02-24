import { createClient } from '@/lib/supabase/client'

export type BatchMasterItem = {
    id: string
    bank_type: 'MBB' | 'VIB'
    receiver_name: string
    bank_number: string
    bank_name: string
    bank_code?: string | null
    target_account_id: string | null
    cutoff_period: 'before' | 'after'
    phase_id?: string | null
    sort_order: number
    is_active: boolean
    category_id: string | null
    default_note: string | null
    created_at?: string
    updated_at?: string
}

/**
 * Get all master checklist items for a bank
 */
export async function getBatchMasterItems(bankType?: 'MBB' | 'VIB') {
    const supabase: any = createClient()
    let query = supabase
        .from('batch_master_items')
        .select('*, accounts(*), categories(*)')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

    if (bankType) {
        query = query.eq('bank_type', bankType)
    }

    const { data, error } = await query
    if (error) throw error
    return data
}

/**
 * Upsert a master checklist item
 */
export async function upsertBatchMasterItem(item: Partial<BatchMasterItem>) {
    const supabase: any = createClient()

    // Ensure sort_order is set if new
    if (!item.id && (item.sort_order === undefined || item.sort_order === null)) {
        const existing = await getBatchMasterItems(item.bank_type)
        item.sort_order = existing.length
    }

    const { data, error } = await supabase
        .from('batch_master_items')
        .upsert(item)
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Delete a master checklist item
 */
export async function deleteBatchMasterItem(id: string) {
    const supabase: any = createClient()
    const { error } = await supabase
        .from('batch_master_items')
        .delete()
        .eq('id', id)

    if (error) throw error
}

/**
 * Update sort order for multiple items
 */
export async function updateBatchMasterSortOrder(items: { id: string, sort_order: number }[]) {
    const supabase: any = createClient()

    // Perform individual updates for now
    for (const item of items) {
        await supabase
            .from('batch_master_items')
            .update({ sort_order: item.sort_order })
            .eq('id', item.id)
    }
}
