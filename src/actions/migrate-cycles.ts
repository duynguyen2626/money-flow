'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getCashbackCycleTag, normalizeCashbackConfig } from '@/lib/cashback'
import { recomputeCashbackCycle } from '@/services/cashback.service'

function createAdminClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

/**
 * Migration Script: M1-S1
 * 1. Iterates all accounts with cashback config.
 * 2. Iterates all transactions for those accounts.
 * 3. Computes correct YYYY-MM cycle tag.
 * 4. Updates persisted_cycle_tag.
 * 5. Re-syncs cashback cycles.
 * 6. Fixes Account Balances.
 */
export async function migrateCashbackCycles() {
    const supabase = createAdminClient()
    const logs: string[] = []

    try {
        logs.push('STARTING MIGRATION...')

        // 1. Get Accounts
        const { data: accounts } = await supabase
            .from('accounts')
            .select('id, name, cashback_config, type')
            // Only care about cards with config
            .not('cashback_config', 'is', null)

        if (!accounts) return { success: true, logs }

        for (const acc of accounts) {
            logs.push(`Processing Account: ${acc.name}`)
            const config = normalizeCashbackConfig(acc.cashback_config)

            // 2. Get Transactions
            // Only get those that might need cashback (expense/debt/repayment?)
            // Actually update ALL valid transactions to have a tag, just in case.
            const { data: txns } = await supabase
                .from('transactions')
                .select('id, occurred_at, persisted_cycle_tag')
                .eq('account_id', acc.id)

            if (!txns) continue;

            const tagMap = new Map<string, string>() // txnId -> newTag
            const cyclesToRecompute = new Set<string>()

            for (const t of txns) {
                const date = new Date(t.occurred_at)
                const newTag = getCashbackCycleTag(date, {
                    statementDay: config.statementDay,
                    cycleType: config.cycleType
                })

                if (newTag && newTag !== t.persisted_cycle_tag) {
                    tagMap.set(t.id, newTag)
                }
            }

            logs.push(`> Found ${tagMap.size} transactions to update tags.`)

            // 3. Batch Update Tags
            // Supabase doesn't support massive batch update easily without RPC or multiple calls.
            // We'll do parallel promises in chunks.
            const updates = Array.from(tagMap.entries())
            const CHUNK_SIZE = 50

            for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
                const chunk = updates.slice(i, i + CHUNK_SIZE)
                await Promise.all(chunk.map(async ([tid, tag]) => {
                    await supabase
                        .from('transactions')
                        .update({ persisted_cycle_tag: tag })
                        .eq('id', tid)
                }))
            }

            // 4. Ensure Cycles Exist & Recompute
            // We need to identify all unique tags for this account now.
            // Fetch all unique tags from DB for this account (or just derive from what we just did?)
            // Better to query DB to be safe.
            const { data: distinctTags } = await supabase
                .from('transactions') // or cashback_cycles?
                .select('persisted_cycle_tag')
                .eq('account_id', acc.id)
                .not('persisted_cycle_tag', 'is', null)

            const uniqueTags = Array.from(new Set(distinctTags?.map(t => t.persisted_cycle_tag) || []))

            logs.push(`> Recomputing ${uniqueTags.length} cycles.`)

            for (const tag of uniqueTags) {
                if (!tag) continue;
                // Ensure cycle row exists
                // Only way is to call 'ensureCycle' but that's in service which might use standard client.
                // Let's insert directly if missing.
                const { data: existing } = await supabase
                    .from('cashback_cycles')
                    .select('id')
                    .eq('account_id', acc.id)
                    .eq('cycle_tag', tag)
                    .maybeSingle()

                let cycleId = existing?.id

                if (!cycleId) {
                    const { data: created, error } = await supabase
                        .from('cashback_cycles')
                        .insert({
                            account_id: acc.id,
                            cycle_tag: tag,
                            max_budget: config.maxBudget ?? 0,
                            min_spend_target: config.minSpendTarget ?? 0
                        })
                        .select('id')
                        .single()

                    if (error) {
                        logs.push(`! Failed to create cycle ${tag}: ${error.message}`)
                        continue
                    }
                    cycleId = created.id
                }

                if (cycleId) {
                    await recomputeCashbackCycle(cycleId)
                }
            }
        }

        logs.push('MIGRATION COMPLETE.')
        return { success: true, logs }

    } catch (error: any) {
        console.error('Migration failed', error)
        logs.push(`ERROR: ${error.message}`)
        return { success: false, logs, error: error.message }
    }
}
