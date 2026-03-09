import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../../..')
dotenv.config({ path: path.join(root, '.env.local'), override: true })

const PB_URL = 'https://api-db.reiwarden.io.vn'
const PB_EMAIL = (process.env.POCKETBASE_DB_EMAIL || '').trim()
const PB_PASSWORD = (process.env.POCKETBASE_DB_PASSWORD || '').trim()

if (!PB_EMAIL || !PB_PASSWORD) {
  console.error('Missing POCKETBASE_DB_EMAIL or POCKETBASE_DB_PASSWORD in .env.local')
  process.exit(1)
}

async function request(url, init = {}) {
  const res = await fetch(url, init)
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { res, text, json }
}

async function listRecordIds(token, collection) {
  const ids = []
  let page = 1
  while (true) {
    const { res, json, text } = await request(`${PB_URL}/api/collections/${collection}/records?page=${page}&perPage=500&fields=id`, {
      headers: { Authorization: token }
    })

    if (!res.ok) throw new Error(`Failed listing records for ${collection}: ${text}`)

    for (const item of json.items || []) ids.push(item.id)
    if (!json.totalPages || page >= json.totalPages) break
    page += 1
  }
  return ids
}

async function deleteAllRecords(token, collection) {
  const ids = await listRecordIds(token, collection)
  if (!ids.length) {
    console.log(`- ${collection}: no records to delete`)
    return
  }

  const chunkSize = 20
  let deleted = 0
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    await Promise.all(chunk.map(async (id) => {
      const { res, text } = await request(`${PB_URL}/api/collections/${collection}/records/${id}`, {
        method: 'DELETE',
        headers: { Authorization: token }
      })
      if (!res.ok) throw new Error(`Delete ${collection}/${id} failed: ${text}`)
    }))
    deleted += chunk.length
  }

  console.log(`- ${collection}: deleted ${deleted} records`)
}

async function patchCollectionSchema(token, collectionDef) {
  const { name, fields } = collectionDef
  const { res, text } = await request(`${PB_URL}/api/collections/${name}`, {
    method: 'PATCH',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  })

  if (!res.ok) throw new Error(`Patch schema for ${name} failed: ${text}`)
  console.log(`- ${name}: schema patched (${fields.length} fields)`)
}

async function main() {
  const schemaPath = path.join(__dirname, 'schema.accounts-transactions.reset.api.json')
  const content = await fs.readFile(schemaPath, 'utf8')
  const schema = JSON.parse(content)

  console.log('Authenticating PocketBase...')
  const auth = await request(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD })
  })

  if (!auth.res.ok || !auth.json?.token) {
    throw new Error(`Auth failed: ${auth.text}`)
  }

  const token = auth.json.token
  console.log('Auth OK')

  console.log('Step 1: Clear records in accounts + transactions')
  await deleteAllRecords(token, 'transactions')
  await deleteAllRecords(token, 'accounts')

  console.log('Step 2: Patch schema for accounts + transactions')
  for (const collection of schema) {
    await patchCollectionSchema(token, collection)
  }

  console.log('Done. You can re-run migration phases now.')
}

main().catch((err) => {
  console.error('Reset failed:', err.message)
  process.exit(1)
})
