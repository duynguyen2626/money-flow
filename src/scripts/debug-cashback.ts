import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'
import { normalizeMonthTag, yyyyMMToLegacyMMMYY } from '../lib/month-tag'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables.')
    process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey)

async function debugAccount() {
    const aid = '83a27121-0e34-4231-b060-2818da672eca'
    console.log(`Checking Account: ${aid}`)

    // 1. Account Config
    const { data: account } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', aid)
        .single()

    console.log('--- Account Config ---')
    console.log(JSON.stringify((account as any)?.cashback_config, null, 2))

    // 2. Cycles
    const { data: cycles } = await supabase
        .from('cashback_cycles')
        .select('*')
        .eq('account_id', aid)
        .order('cycle_tag', { ascending: false })

    console.log('--- Cashback Cycles ---')
    console.table((cycles as any)?.map((c: any) => ({
        tag: c.cycle_tag,
        spent: c.spent_amount,
        real: c.real_awarded,
        virtual: c.virtual_profit,
        is_exhausted: c.is_exhausted
    })))

    const requestedTag = process.env.CYCLE_TAG ? normalizeMonthTag(process.env.CYCLE_TAG) : null
    const cyclesAny = cycles as any;
    const latestTag = cyclesAny?.[0]?.cycle_tag ? (normalizeMonthTag(cyclesAny?.[0]?.cycle_tag) ?? cyclesAny?.[0]?.cycle_tag) : null
    const cycleTag = requestedTag ?? latestTag

    if (!cycleTag) {
        console.log('No cycle tag found. Set CYCLE_TAG to target a specific cycle.')
        return
    }

    // 3. Entries for selected cycle
    const selectedCycle = (cycles as any)?.find((c: any) => (normalizeMonthTag(c.cycle_tag) ?? c.cycle_tag) === cycleTag)
    if (selectedCycle) {
        const { data: entries } = await supabase
            .from('cashback_entries')
            .select('amount, mode, counts_to_budget, transaction_id, transactions(note)')
            .eq('cycle_id', selectedCycle.id)

        console.log(`--- Entries for ${cycleTag} ---`)
        console.table((entries as any)?.map((e: any) => ({
            note: (e.transactions as any)?.note,
            amount: e.amount,
            mode: e.mode,
            counts: e.counts_to_budget
        })))
    } else {
        console.log(`No cycle found for ${cycleTag}.`)
    }

    // 4. Transactions for selected cycle
    const legacyCycleTag = yyyyMMToLegacyMMMYY(cycleTag)
    const cycleTagsToQuery = Array.from(new Set([cycleTag, legacyCycleTag].filter(Boolean))) as string[]

    const { data: txns } = await supabase
        .from('transactions')
        .select('id, amount, note, cashback_mode, cashback_share_fixed, persisted_cycle_tag')
        .eq('account_id', aid)
        .in('persisted_cycle_tag', cycleTagsToQuery)

    console.log(`--- Transactions for ${cycleTag} ---`)
    console.table(txns as any)
}

debugAccount().catch(console.error)
