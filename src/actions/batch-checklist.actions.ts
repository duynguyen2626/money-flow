'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Fetch all data needed for the 12-month recurring checklist
 */
export async function getChecklistDataAction(bankType: 'MBB' | 'VIB', year: number = new Date().getFullYear()) {
    try {
        const supabase = await createClient()

        // 1. Fetch Master Items
        const { data: masterItems, error: masterError } = await supabase
            .from('batch_master_items')
            .select('*, accounts(*)')
            .eq('bank_type', bankType)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

        if (masterError) throw masterError

        // 2. Fetch Batches and their Items for the given year
        // We use month_year like '2026-%'
        const yearPattern = `${year}-%`
        const { data: batches, error: batchError } = await supabase
            .from('batches')
            .select(`
                *,
                batch_items (
                    id,
                    master_item_id,
                    amount,
                    status,
                    receiver_name,
                    transaction_id
                )
            `)
            .eq('bank_type', bankType)
            .like('month_year', yearPattern)

        if (batchError) throw batchError

        // 3. Fetch active phases for this bank type (isolated — must never block main data)
        let phases: any[] = []
        try {
            const { data: phasesData, error: phasesError } = await (supabase as any)
                .from('batch_phases')
                .select('*')
                .eq('bank_type', bankType)
                .eq('is_active', true)
                .order('sort_order', { ascending: true })

            if (phasesError) {
                console.warn('batch_phases query error (non-fatal):', phasesError.message)
            } else {
                phases = phasesData || []
            }
        } catch (phaseErr: any) {
            console.warn('batch_phases fetch failed (non-fatal):', phaseErr?.message)
        }

        // Fetch Funding Txns
        const fundingTxnIds = batches?.map((b: any) => b.funding_transaction_id).filter(Boolean) || []
        let fundingTxns: any[] = []
        if (fundingTxnIds.length > 0) {
            const { data: txns, error: txnsError } = await supabase
                .from('transactions')
                .select(`
                    id, amount, note, occurred_at,
                    account:accounts!account_id (name, image_url),
                    target_account:accounts!target_account_id (name, image_url)
                `)
                .in('id', fundingTxnIds)
            if (!txnsError && txns) {
                fundingTxns = txns
            }
        }

        const enrichedBatches = batches?.map((b: any) => ({
            ...b,
            funding_transaction: fundingTxns.find((t: any) => t.id === b.funding_transaction_id) || null
        }))

        return {
            success: true,
            data: {
                masterItems,
                batches: enrichedBatches,
                phases: phases || []
            }
        }
    } catch (error: any) {
        console.error('Failed to fetch checklist data:', error)
        return { success: false, error: error.message }
    }
}
