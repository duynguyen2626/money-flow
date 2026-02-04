
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { normalizeMonthTag, toYYYYMMFromDate, yyyyMMToLegacyMMMYY } from '../lib/month-tag'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)


async function run() {
    console.log('--- DEEP INSPECTION ---')

    const monthTag = normalizeMonthTag(process.env.MONTH_TAG ?? toYYYYMMFromDate(new Date())) ?? toYYYYMMFromDate(new Date())
    const legacyMonthTag = yyyyMMToLegacyMMMYY(monthTag)

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
        .select('id, person_id, slots, people(name)')
        .eq('service_id', targetService.id)

    console.log(`\nMembers for ${targetService.name} (${targetService.id}): ${members?.length}`)
    members?.forEach(m => {
        console.log(`- ${(m.people as any)?.name} (${m.person_id}) Slots: ${m.slots}`)
    })

    // 3. Transactions
    const { data: txs } = await supabase
        .from('transactions')
        .select('id, status, created_at, person_id, metadata, account_id, target_account_id, type, is_installment')
        .in('tag', Array.from(new Set([monthTag, legacyMonthTag].filter(Boolean))) as string[])
        .ilike('note', '%youtube%')

    console.log(`\nTransactions (Count: ${txs?.length}):`)
    txs?.forEach(t => {
        const pId = t.person_id
        const mId = (t.metadata as any)?.member_id
        console.log(`[${t.status}] Type: ${t.type} | Installment: ${t.is_installment} | Person: ${pId} | ID: ${t.id}`)
    })
}

run()
