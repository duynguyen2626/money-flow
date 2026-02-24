'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type BatchPhase = {
    id: string
    bank_type: 'MBB' | 'VIB'
    label: string
    period_type: 'before' | 'after'
    cutoff_day: number
    sort_order: number
    is_active: boolean
    created_at: string
    updated_at: string
}

/**
 * List all active phases for a bank type, ordered by sort_order
 */
export async function listBatchPhasesAction(bankType: 'MBB' | 'VIB') {
    try {
        const supabase: any = await createClient()

        const { data, error } = await supabase
            .from('batch_phases')
            .select('*')
            .eq('bank_type', bankType)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

        if (error) throw error

        return { success: true, data: data as BatchPhase[] }
    } catch (error: any) {
        console.error('Error listing batch phases:', error)
        return { success: false, error: error.message, data: [] as BatchPhase[] }
    }
}

/**
 * List ALL active phases for settings management
 */
export async function listAllBatchPhasesAction(bankType: 'MBB' | 'VIB') {
    try {
        const supabase: any = await createClient()

        const { data, error } = await supabase
            .from('batch_phases')
            .select('*')
            .eq('bank_type', bankType)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

        if (error) throw error

        return { success: true, data: data as BatchPhase[] }
    } catch (error: any) {
        console.error('Error listing all batch phases:', error)
        return { success: false, error: error.message, data: [] as BatchPhase[] }
    }
}

/**
 * Create a new batch phase
 */
export async function createBatchPhaseAction(params: {
    bankType: 'MBB' | 'VIB'
    label: string
    periodType: 'before' | 'after'
    cutoffDay: number
    sortOrder?: number
}) {
    try {
        const supabase: any = await createClient()

        // Auto-assign sort_order if not provided
        let sortOrder = params.sortOrder
        if (sortOrder === undefined) {
            const { data: existing } = await supabase
                .from('batch_phases')
                .select('sort_order')
                .eq('bank_type', params.bankType)
                .order('sort_order', { ascending: false })
                .limit(1)

            sortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0
        }

        const { data, error } = await supabase
            .from('batch_phases')
            .insert({
                bank_type: params.bankType,
                label: params.label,
                period_type: params.periodType,
                cutoff_day: params.cutoffDay,
                sort_order: sortOrder
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/batch')
        revalidatePath('/batch/settings')

        return { success: true, data: data as BatchPhase }
    } catch (error: any) {
        console.error('Error creating batch phase:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Update an existing batch phase
 */
export async function updateBatchPhaseAction(
    id: string,
    updates: {
        label?: string
        periodType?: 'before' | 'after'
        cutoffDay?: number
        sortOrder?: number
        isActive?: boolean
    }
) {
    try {
        const supabase: any = await createClient()

        const updateData: any = { updated_at: new Date().toISOString() }
        if (updates.label !== undefined) updateData.label = updates.label
        if (updates.periodType !== undefined) updateData.period_type = updates.periodType
        if (updates.cutoffDay !== undefined) updateData.cutoff_day = updates.cutoffDay
        if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive

        const { data, error } = await supabase
            .from('batch_phases')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/batch')
        revalidatePath('/batch/settings')

        return { success: true, data: data as BatchPhase }
    } catch (error: any) {
        console.error('Error updating batch phase:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Soft-delete a batch phase (set is_active = false)
 */
export async function deleteBatchPhaseAction(id: string, options?: { revalidate?: boolean }) {
    try {
        const supabase: any = await createClient()

        const { data, error } = await supabase
            .from('batch_phases')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // Only revalidate if explicitly requested (default true for backward compatibility)
        if (options?.revalidate !== false) {
            revalidatePath('/batch')
            revalidatePath('/batch/settings')
        }

        return { success: true, data }
    } catch (error: any) {
        console.error('Error deleting batch phase:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Reorder phases by updating sort_order for each
 */
export async function reorderBatchPhasesAction(orderedIds: string[]) {
    try {
        const supabase: any = await createClient()

        for (let i = 0; i < orderedIds.length; i++) {
            const { error } = await supabase
                .from('batch_phases')
                .update({ sort_order: i, updated_at: new Date().toISOString() })
                .eq('id', orderedIds[i])

            if (error) throw error
        }

        revalidatePath('/batch')
        revalidatePath('/batch/settings')

        return { success: true }
    } catch (error: any) {
        console.error('Error reordering batch phases:', error)
        return { success: false, error: error.message }
    }
}
