
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)


async function run() {
    console.log('--- DEEP INSPECTION ---')

    // 1. Check Subscriptions
    const { data: services } = await supabase
        .from('subscriptions')
        .select('id, name, price, max_slots')
        .ilike('name', '%youtube%')

    console.log(`Found ${services?.length} services matching 'youtube'`)
    services?.forEach(s => console.log(`Service: ${s.name} (${s.id}) - MaxSlots: ${s.max_slots}`))

    if (!services || services.length === 0) return

    const targetService = services[0]

    // 2. Check Members
    const { data: members } = await supabase
        .from('service_members')
        .select('id, profile_id, slots, profiles(name)')
        .eq('service_id', targetService.id)

    console.log(`\nMembers for ${targetService.name} (${targetService.id}): ${members?.length}`)
    members?.forEach(m => {
        console.log(`- ${(m.profiles as any)?.name} (${m.profile_id}) Slots: ${m.slots}`)
    })

    // 3. Transactions
    const { data: txs } = await supabase
        .from('transactions')
        .select('id, status, created_at, person_id, metadata, account_id, target_account_id, type, is_installment')
        .eq('tag', 'DEC25')
        .ilike('note', '%youtube%')

    console.log(`\nTransactions (Count: ${txs?.length}):`)
    txs?.forEach(t => {
        const pId = t.person_id
        const mId = (t.metadata as any)?.member_id
        console.log(`[${t.status}] Type: ${t.type} | Installment: ${t.is_installment} | Person: ${pId} | ID: ${t.id}`)
    })
}

run()
