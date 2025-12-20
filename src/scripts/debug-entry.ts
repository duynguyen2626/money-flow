import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function debug() {
    const txnId = '183b530b-473c-4592-9f82-df613dfc60de'

    console.log('--- Checking Transaction ---')
    const { data: txn } = await supabase.from('transactions').select('*').eq('id', txnId).single()
    console.log(JSON.stringify(txn, null, 2))

    console.log('--- Checking Entry ---')
    const { data: entry } = await supabase.from('cashback_entries').select('*').eq('transaction_id', txnId).maybeSingle()
    console.log(JSON.stringify(entry, null, 2))

    console.log('--- Checking Cycle ---')
    if (entry?.cycle_id) {
        const { data: cycle } = await supabase.from('cashback_cycles').select('*').eq('id', entry.cycle_id).single()
        console.log(JSON.stringify(cycle, null, 2))
    } else {
        console.log('No entry found for transaction.')
    }
}

debug().catch(console.error)
