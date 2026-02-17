import { createClient } from '@/lib/supabase/server'

export type SheetWebhookLink = {
    id: string
    name: string
    url: string
    created_at?: string
}

export async function getSheetWebhookLinks(): Promise<SheetWebhookLink[]> {
    const supabase: any = createClient()
    const { data, error } = await supabase
        .from('sheet_webhook_links')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        // Graceful fallback if migration not applied yet
        console.warn('sheet_webhook_links not available or failed to fetch', error)
        return []
    }
    return data || []
}

export async function createSheetWebhookLink(payload: { name: string; url: string }) {
    const supabase: any = createClient()
    const { data, error } = await supabase
        .from('sheet_webhook_links')
        .insert({ name: payload.name, url: payload.url })
        .select()
        .single()

    if (error) throw error
    return data as SheetWebhookLink
}

export async function deleteSheetWebhookLink(id: string) {
    const supabase: any = createClient()
    const { error } = await supabase
        .from('sheet_webhook_links')
        .delete()
        .eq('id', id)

    if (error) throw error
    return true
}
