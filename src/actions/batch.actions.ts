'use server'

import {
    getBatches,
    createBatch,
    updateBatch,
    deleteBatch,
    getBatchById,
    addBatchItem,
    updateBatchItem,
    deleteBatchItem,
    confirmBatchItem,
    revertBatchItem,
    importBatchItemsFromExcel,
    fundBatch,
    confirmBatchSource,
    sendBatchToSheet,
    cloneBatch,
    cloneBatchItem,
    deleteBatchItemsBulk,
    Batch,
    BatchItem
} from '@/services/batch.service'
import { revalidatePath } from 'next/cache'

export async function cloneBatchItemAction(itemId: string, batchId: string) {
    try {
        const clonedItem = await cloneBatchItem(itemId)
        revalidatePath(`/batch/detail/${batchId}`)
        return { success: true, data: clonedItem }
    } catch (error: any) {
        console.error('Clone batch item failed:', error)
        return { success: false, error: error.message }
    }
}

export async function confirmBatchItemAction(itemId: string, batchId: string, targetAccountId?: string) {
    try {
        await confirmBatchItem(itemId, targetAccountId)
        revalidatePath(`/batch/detail/${batchId}`)
        return { success: true }
    } catch (error: any) {
        console.error('Confirm batch item failed:', error)
        return { success: false, error: error.message }
    }
}

export async function voidBatchItemAction(itemId: string, batchId: string) {
    try {
        await revertBatchItem(itemId)
        revalidatePath(`/batch/detail/${batchId}`)
        revalidatePath('/accounts')
        return { success: true }
    } catch (error: any) {
        console.error('Void batch item failed:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteBatchItemAction(itemId: string, batchId: string) {
    try {
        await deleteBatchItem(itemId)
        revalidatePath(`/batch/detail/${batchId}`)
        return { success: true }
    } catch (error: any) {
        console.error('Delete batch item failed:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteBatchItemsBulkAction(itemIds: string[], batchId: string) {
    try {
        await deleteBatchItemsBulk(itemIds)
        revalidatePath(`/batch/detail/${batchId}`)
        return { success: true }
    } catch (error: any) {
        console.error('Delete batch items failed:', error)
        return { success: false, error: error.message }
    }
}

export async function getBatchesAction() {
    return await getBatches()
}

export async function getBatchByIdAction(id: string) {
    return await getBatchById(id)
}

export async function fundBatchAction(batchId: string) {
    const result = await fundBatch(batchId)
    revalidatePath('/batch')
    revalidatePath(`/batch/detail/${batchId}`)
    revalidatePath('/accounts')
    if (result?.sourceAccountId) {
        revalidatePath(`/accounts/${result.sourceAccountId}`)
    }
    return result
}

export async function updateBatchItemAction(id: string, data: any, batchId?: string) {
    try {
        const result = await updateBatchItem(id, data)
        if (batchId) {
            revalidatePath(`/batch/detail/${batchId}`)
            revalidatePath('/batch')
        }
        return { success: true, data: result }
    } catch (error: any) {
        console.error('Failed to update batch item:', error)
        return { success: false, error: error.message || 'Failed to update item' }
    }
}

export async function importBatchItemsAction(
    batchId: string,
    excelData: string,
    batchTag?: string
) {
    const result = await importBatchItemsFromExcel(batchId, excelData, batchTag)
    revalidatePath(`/batch/detail/${batchId}`)
    return result
}
export async function confirmBatchSourceAction(batchId: string, accountId: string) {
    await confirmBatchSource(batchId, accountId)
    revalidatePath(`/batch/detail/${batchId}`)
    revalidatePath('/accounts')
}

export async function sendBatchToSheetAction(batchId: string) {
    const result = await sendBatchToSheet(batchId)
    return result
}

export async function deleteBatchAction(batchId: string) {
    await deleteBatch(batchId)
    revalidatePath('/batch')
}

export async function updateBatchAction(id: string, data: any) {
    const result = await updateBatch(id, data)
    revalidatePath('/batch')
    revalidatePath(`/batch/detail/${id}`)
    return result
}

export async function createBatchAction(data: any) {
    const result = await createBatch(data)
    revalidatePath('/batch')
    return result
}

export async function cloneBatchAction(batchId: string, overrides: any = {}) {
    const result = await cloneBatch(batchId, overrides)
    revalidatePath('/batch')
    return result
}

export async function addBatchItemAction(data: any) {
    const result = await addBatchItem(data)
    revalidatePath(`/batch/detail/${data.batch_id}`)
    return result
}

export async function updateBatchCycleAction(batchId: string, action: 'prev' | 'next') {
    const { updateBatchCycle } = await import('@/services/batch.service')
    const result = await updateBatchCycle(batchId, action)
    revalidatePath(`/batch/detail/${batchId}`)
    return result
}


export async function updateBatchNoteModeAction(batchId: string, mode: 'previous' | 'current') {
    const { updateBatchNoteMode } = await import('@/services/batch.service')
    const result = await updateBatchNoteMode(batchId, mode)
    revalidatePath(`/batch/detail/${batchId}`)
    return result
}

export async function archiveBatchAction(batchId: string) {
    const { archiveBatch } = await import('@/services/batch.service')
    await archiveBatch(batchId)
    revalidatePath('/batch')
    revalidatePath(`/batch/detail/${batchId}`)
}

export async function restoreBatchAction(batchId: string) {
    const { restoreBatch } = await import('@/services/batch.service')
    await restoreBatch(batchId)
    revalidatePath('/batch')
    revalidatePath(`/batch/detail/${batchId}`)
}
