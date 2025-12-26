import { createClient } from '@/lib/supabase/server'
import { toYYYYMMFromDate } from '@/lib/month-tag'

export async function debugYoutube() {
  const logs: string[] = []
  const log = (msg: any) => logs.push(typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg))

  const supabase = createClient()
  const monthTag = toYYYYMMFromDate(new Date())

  // 1. Find Youtube Service
  const { data: services } = await supabase
    .from('subscriptions')
    .select('id, name, price, max_slots')
    .ilike('name', '%youtube%')

  if (!services || services.length === 0) {
    log('No Youtube service found')
    return logs
  }

  const youtube = (services as any[])[0]
  log('--- Service ---')
  log(youtube)

  // 2. List Members
  const { data: members } = await supabase
    .from('service_members')
    .select('*, profiles(name, is_owner)')
    .eq('service_id', youtube.id)

  log('\n--- Members ---')
    ; (members as any[])?.forEach(m => {
      log(`${(m.profiles as any).name} (is_owner: ${(m.profiles as any).is_owner}) - Slots: ${m.slots} - ProfileID: ${m.profile_id} `)
    })

  // 3. List Transactions
  const { data: txs } = await supabase
    .from('transactions')
    .select('id, note, amount, type, person_id, created_at, metadata')
    .eq('tag', monthTag)
    .ilike('note', '%youtube%')

  log(`\n--- Transactions ${monthTag} Youtube ---`)
    ; (txs as any[])?.forEach(t => {
      log(`ID: ${t.id} | Note: ${t.note} | Amount: ${t.amount} | Type: ${t.type} | PersonID: ${t.person_id} `)
    })

  const fs = await import('fs')
  const path = await import('path')
  fs.writeFileSync(path.join(process.cwd(), 'debug_output.txt'), logs.join('\n'))
  return logs
}
