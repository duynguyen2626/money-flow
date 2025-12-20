import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

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
    console.log(JSON.stringify(account?.cashback_config, null, 2))

    // 2. Cycles
    const { data: cycles } = await supabase
        .from('cashback_cycles')
        .select('*')
        .eq('account_id', aid)
        .order('cycle_tag', { ascending: false })

    console.log('--- Cashback Cycles ---')
    console.table(cycles?.map(c => ({
        tag: c.cycle_tag,
        spent: c.spent_amount,
        real: c.real_awarded,
        virtual: c.virtual_profit,
        is_exhausted: c.is_exhausted
    })))

    // 3. Entries for DEC25
    const dec25Cycle = cycles?.find(c => c.cycle_tag === 'DEC25')
    if (dec25Cycle) {
        const { data: entries } = await supabase
            .from('cashback_entries')
            .select('amount, mode, counts_to_budget, transaction_id, transactions(note)')
            .eq('cycle_id', dec25Cycle.id)

        console.log('--- Entries for DEC25 ---')
        console.table(entries?.map(e => ({
            note: (e.transactions as any)?.note,
            amount: e.amount,
            mode: e.mode,
            counts: e.counts_to_budget
        })))
    } else {
        console.log('No DEC25 cycle found.')
    }

    // 4. Transactions for DEC25
    const { data: txns } = await supabase
        .from('transactions')
        .select('id, amount, note, cashback_mode, cashback_share_fixed, persisted_cycle_tag')
        .eq('account_id', aid)
        .eq('persisted_cycle_tag', 'DEC25')

    console.log('--- Transactions for DEC25 ---')
    console.table(txns)
}

debugAccount().catch(console.error)
