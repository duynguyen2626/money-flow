'use server'

import { confirmBatchItem } from '@/services/batch.service'
import { revalidatePath } from 'next/cache'

export async function confirmBatchItemAction(itemId: string) {
    try {
        await confirmBatchItem(itemId)
        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
