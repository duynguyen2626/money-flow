import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function listCycles() {
    const aid = '83a27121-0e34-4231-b060-2818da672eca'
    const { data: cycles } = await supabase.from('cashback_cycles').select('*').eq('account_id', aid)
    console.log('--- All Cycles for Vpbank Lady ---')
    console.table(cycles?.map(c => ({
        tag: c.cycle_tag,
        real: c.real_awarded,
        virtual: c.virtual_profit,
        spent: c.spent_amount
    })))
}

listCycles().catch(console.error)
