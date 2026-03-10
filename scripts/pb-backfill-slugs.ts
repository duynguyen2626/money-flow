import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const PB_URL = process.env.POCKETBASE_URL || 'https://api-db.reiwarden.io.vn'
const PB_EMAIL = process.env.POCKETBASE_DB_EMAIL!
const PB_PASSWORD = process.env.POCKETBASE_DB_PASSWORD!
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

let pbToken = ''

function toPocketBaseId(sourceId: string): string {
  const hash = sourceId.split('-').join('').slice(0, 15)
  const base32 = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 15; i++) {
    const charCode = hash.charCodeAt(i % hash.length)
    result += base32[charCode % base32.length]
  }
  return result
}

async function pbAuth() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  })
  if (!res.ok) throw new Error(`PB auth failed: ${res.status}`)
  const data = await res.json()
  pbToken = data.token
}

async function pbPatch(collection: string, id: string, body: Record<string, unknown>) {
  const res = await fetch(`${PB_URL}/api/collections/${collection}/records/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pbToken}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PB patch failed [${res.status}] ${collection}/${id}: ${text}`)
  }
}

async function run() {
  await pbAuth()
  const supabase = createClient(SB_URL, SB_KEY)

  const tasks = [
    { collection: 'shops', table: 'shops' },
    { collection: 'categories', table: 'categories' },
  ] as const

  const { data: sbPeople, error: sbPeopleError } = await supabase.from('people').select('id,name')
  if (sbPeopleError) throw new Error(`SB read failed for people: ${sbPeopleError.message}`)

  const pbPeopleResponse = await fetch(`${PB_URL}/api/collections/people/records?perPage=500&fields=id,name,slug`, {
    headers: { Authorization: `Bearer ${pbToken}` },
  })
  if (!pbPeopleResponse.ok) {
    throw new Error(`PB read failed for people: ${pbPeopleResponse.status}`)
  }
  const pbPeopleData = await pbPeopleResponse.json()
  const pbPeople = pbPeopleData.items || []

  const sbByName = new Map<string, string[]>()
  for (const person of sbPeople || []) {
    const key = String(person.name || '').trim().toLowerCase()
    if (!key) continue
    const existing = sbByName.get(key) || []
    existing.push(person.id)
    sbByName.set(key, existing)
  }

  let peoplePatched = 0
  let peopleSkipped = 0

  for (const pbPerson of pbPeople) {
    const key = String(pbPerson.name || '').trim().toLowerCase()
    const matches = sbByName.get(key) || []
    if (matches.length !== 1) {
      peopleSkipped += 1
      continue
    }

    try {
      await pbPatch('people', pbPerson.id, { slug: matches[0] })
      peoplePatched += 1
    } catch {
      peopleSkipped += 1
    }
  }

  console.log(`[slug-backfill] people: patched=${peoplePatched}, skipped=${peopleSkipped}`)

  for (const task of tasks) {
    const { data, error } = await supabase.from(task.table).select('id')
    if (error) throw new Error(`SB read failed for ${task.table}: ${error.message}`)

    let patched = 0
    let skipped = 0

    for (const item of data || []) {
      const pbId = toPocketBaseId(item.id)
      try {
        await pbPatch(task.collection, pbId, { slug: item.id })
        patched += 1
      } catch {
        skipped += 1
      }
    }

    console.log(`[slug-backfill] ${task.collection}: patched=${patched}, skipped=${skipped}`)
  }
}

run().catch((error) => {
  console.error('[slug-backfill] failed', error)
  process.exit(1)
})
