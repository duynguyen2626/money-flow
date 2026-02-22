'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateBatchSettingsAction(
    bankType: 'MBB' | 'VIB',
    settings: {
        sheet_url?: string | null
        webhook_url?: string | null
        image_url?: string | null
        cutoff_day?: number | null
    }
) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('batch_settings')
            .update({
                ...settings,
                updated_at: new Date().toISOString()
            })
            .eq('bank_type', bankType)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/batch')
        revalidatePath('/batch/settings')

        return { success: true, data }
    } catch (error: any) {
        console.error('Error updating batch settings:', error)
        return { success: false, error: error.message }
    }
}

export async function getBatchSettingsAction(bankType: 'MBB' | 'VIB') {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('batch_settings')
            .select('*')
            .eq('bank_type', bankType)
            .single()

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching batch settings:', error)
        return { success: false, error: error.message }
    }
}
