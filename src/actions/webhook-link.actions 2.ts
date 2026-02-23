'use server'

import {
    getSheetWebhookLinks,
    createSheetWebhookLink,
    deleteSheetWebhookLink
} from '@/services/webhook-link.service'
import { revalidatePath } from 'next/cache'

export async function getSheetWebhookLinksAction() {
    return getSheetWebhookLinks()
}

export async function createSheetWebhookLinkAction(payload: { name: string; url: string }) {
    const link = await createSheetWebhookLink(payload)
    revalidatePath('/batch')
    return link
}

export async function deleteSheetWebhookLinkAction(id: string) {
    await deleteSheetWebhookLink(id)
    revalidatePath('/batch')
    return true
}
