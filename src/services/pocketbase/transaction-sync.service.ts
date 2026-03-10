
import { pocketbaseCreate, pocketbaseUpdate, pocketbaseDelete, toPocketBaseId } from './server'
import { createClient } from '@/lib/supabase/server'

/**
 * Syncs a transaction from Supabase to PocketBase.
 * This is a fire-and-forget operation to keep PocketBase as a read replica.
 */

function mapToPocketBaseTransaction(t: any) {
    return {
        occurred_at: t.occurred_at,
        date: t.occurred_at,
        description: t.note || '',
        note: t.note || '',
        amount: parseFloat(String(t.amount || 0)),
        type: t.type,
        status: t.status || 'posted',
        account_id: t.account_id ? toPocketBaseId(t.account_id, 'accounts') : null,
        to_account_id: t.target_account_id ? toPocketBaseId(t.target_account_id, 'accounts') : null,
        category_id: t.category_id ? toPocketBaseId(t.category_id, 'categories') : null,
        shop_id: t.shop_id ? toPocketBaseId(t.shop_id, 'shops') : null,
        person_id: t.person_id ? toPocketBaseId(t.person_id, 'people') : null,
        final_price: parseFloat(String(t.final_price || 0)),
        cashback_amount: parseFloat(String(t.cashback_share_fixed || 0)),
        is_installment: Boolean(t.is_installment),
        parent_transaction_id: t.parent_transaction_id ? toPocketBaseId(t.parent_transaction_id, 'transactions') : null,
        metadata: {
            ...(t.metadata || {}),
            persisted_cycle_tag: t.persisted_cycle_tag || null
        }
    }
}

export async function syncTransactionCreateToPB(supabaseTransaction: any) {
    if (!supabaseTransaction?.id) return

    const pbId = toPocketBaseId(supabaseTransaction.id, 'transactions')
    const payload = mapToPocketBaseTransaction(supabaseTransaction)

    console.log(`[DB:PB] Syncing CREATE for transaction ${supabaseTransaction.id} -> ${pbId}`)

    try {
        // PocketBase API doesn't have a direct upsert in the same way, 
        // but the server helpers handle the request.
        await pocketbaseCreate('transactions', { id: pbId, ...payload })
    } catch (err) {
        // If it already exists, try update
        try {
            await pocketbaseUpdate('transactions', pbId, payload)
        } catch (patchErr) {
            console.error(`[DB:PB] Sync CREATE failed for ${pbId}:`, patchErr)
        }
    }
}

export async function syncTransactionUpdateToPB(transactionId: string, supabaseTransaction: any) {
    const pbId = toPocketBaseId(transactionId, 'transactions')
    const payload = mapToPocketBaseTransaction(supabaseTransaction)

    console.log(`[DB:PB] Syncing UPDATE for transaction ${transactionId} -> ${pbId}`)

    try {
        await pocketbaseUpdate('transactions', pbId, payload)
    } catch (err) {
        console.error(`[DB:PB] Sync UPDATE failed for ${pbId}:`, err)
    }
}

export async function syncTransactionDeleteToPB(transactionId: string) {
    const pbId = toPocketBaseId(transactionId, 'transactions')

    console.log(`[DB:PB] Syncing DELETE for transaction ${transactionId} -> ${pbId}`)

    try {
        await pocketbaseDelete('transactions', pbId)
    } catch (err) {
        console.error(`[DB:PB] Sync DELETE failed for ${pbId}:`, err)
    }
}
