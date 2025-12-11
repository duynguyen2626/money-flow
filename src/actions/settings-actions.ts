'use server'

import { revalidatePath } from 'next/cache'
import {
    updateQuickPeopleConfig,
    trackPersonUsage,
    getQuickPeopleConfig
} from '@/services/settings.service'
import { QuickPeopleConfig } from '@/types/settings.types'

export async function updateQuickPeopleUsageAction(personId: string, type: 'lend' | 'repay') {
    try {
        await trackPersonUsage(personId, type)
        // No revalidate needed for stats update usually, unless we want immediate reflection? 
        // Usually stats are for next load.
        // parse: true
        return { success: true }
    } catch (error) {
        console.error('Failed to track usage', error)
        return { success: false }
    }
}

export async function saveQuickPeopleConfigAction(config: Partial<QuickPeopleConfig>) {
    try {
        await updateQuickPeopleConfig(config)
        revalidatePath('/')
        revalidatePath('/accounts')
        return { success: true }
    } catch (error) {
        console.error('Failed to save quick people config', error)
        return { success: false, error: 'Failed' }
    }
}

export async function getQuickPeopleConfigAction() {
    try {
        const config = await getQuickPeopleConfig();
        return { success: true, data: config }
    } catch (e) {
        return { success: false, error: 'Failed' }
    }
}
