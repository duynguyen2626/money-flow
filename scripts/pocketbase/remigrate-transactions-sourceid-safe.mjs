import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PB_URL = process.env.POCKETBASE_URL || 'https://api-db.reiwarden.io.vn'
const PB_EMAIL = (process.env.POCKETBASE_DB_EMAIL || '').trim()
const PB_PASSWORD = (process.env.POCKETBASE_DB_PASSWORD || '').trim()

if (!SUPABASE_URL || !SUPABASE_KEY || !PB_EMAIL || !PB_PASSWORD) {
  throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / POCKETBASE_DB_EMAIL / POCKETBASE_DB_PASSWORD')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const argSet = new Set(process.argv.slice(2))
const isApply = argSet.has('--apply')
const shouldReset = argSet.has('--reset')
const includeCycles = !argSet.has('--skip-cycles')
const strictRelations = !argSet.has('--no-strict-relations')
const autoSyncTxnSchema = !argSet.has('--no-auto-sync-schema')
const recreateCollection = argSet.has('--recreate-collection')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const onlyIdArg = process.argv.find((a) => a.startsWith('--only-id='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : null
const onlyId = onlyIdArg ? String(onlyIdArg.split('=')[1] || '').trim() : null

function toPocketBaseId(sourceId, fallbackPrefix = 'mf3') {
  if (!sourceId) {
    const randomSeed = `${fallbackPrefix}-${Date.now()}-${Math.random()}`
    const hash = crypto.createHash('sha256').update(randomSeed).digest()
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let randomId = ''
    for (let i = 0; i < 15; i++) randomId += chars[hash[i] % chars.length]
    return randomId
  }

  if (/^[a-z0-9]{15}$/.test(sourceId)) return sourceId

  const hash = crypto.createHash('sha256').update(String(sourceId)).digest()
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 15; i++) result += chars[hash[i] % chars.length]
  return result
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

function calculateCycleTag(dateStr, statementDay) {
  if (!statementDay || !dateStr) return null
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return null

  let month = date.getMonth() + 1
  let year = date.getFullYear()

  if (date.getDate() > statementDay) {
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return `${year}-${String(month).padStart(2, '0')}`
}

function normalizeStatus(status) {
  const raw = String(status || '').trim().toLowerCase()
  if (raw === 'pending') return 'pending'
  if (raw === 'void') return 'void'
  return 'posted'
}

function normalizeDate(dateValue) {
  if (!dateValue) return null
  const value = new Date(dateValue)
  if (Number.isNaN(value.getTime())) return null
  return value.toISOString()
}

function parseMoney(value) {
  if (value === null || value === undefined || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

function computeExpectedFinalPrice(amount, sharePercent, shareFixed) {
  const base = Number(amount || 0)
  const percent = Number(sharePercent || 0)
  const fixed = Number(shareFixed || 0)
  const discount = (base * percent) / 100 + fixed
  return Math.round((base - discount) * 100) / 100
}

async function pbAuthHeaders() {
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  })

  if (!authRes.ok) {
    throw new Error(`PB auth failed: ${authRes.status} ${await authRes.text()}`)
  }

  const authData = await authRes.json()
  return {
    'Content-Type': 'application/json',
    Authorization: authData.token,
  }
}

async function pbListAll(collection, headers, fields = 'id') {
  const all = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await fetch(
      `${PB_URL}/api/collections/${collection}/records?page=${page}&perPage=200&fields=${encodeURIComponent(fields)}`,
      { headers }
    )

    if (!res.ok) {
      throw new Error(`List ${collection} page ${page} failed: ${res.status} ${await res.text()}`)
    }

    const data = await res.json()
    all.push(...(data.items || []))
    totalPages = data.totalPages || 1
    page += 1
  }

  return all
}

async function pbDeleteAll(collection, headers) {
  const records = await pbListAll(collection, headers, 'id')
  if (records.length === 0) return 0

  let deleted = 0
  for (const record of records) {
    const delRes = await fetch(`${PB_URL}/api/collections/${collection}/records/${record.id}`, {
      method: 'DELETE',
      headers,
    })

    if (!delRes.ok) {
      throw new Error(`Delete ${collection}/${record.id} failed: ${delRes.status} ${await delRes.text()}`)
    }

    deleted += 1
  }

  return deleted
}

async function pbCreate(collection, id, body, headers) {
  const res = await fetch(`${PB_URL}/api/collections/${collection}/records`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id, ...body }),
  })

  if (!res.ok) {
    throw new Error(`Create ${collection}/${id} failed: ${res.status} ${await res.text()}`)
  }
}

async function pbPatch(collection, id, body, headers) {
  const res = await fetch(`${PB_URL}/api/collections/${collection}/records/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Patch ${collection}/${id} failed: ${res.status} ${await res.text()}`)
  }
}

async function pbGetCollectionFields(collection, headers) {
  const res = await fetch(`${PB_URL}/api/collections/${collection}`, { headers })
  if (!res.ok) {
    throw new Error(`Get collection ${collection} failed: ${res.status} ${await res.text()}`)
  }
  const payload = await res.json()
  const fields = Array.isArray(payload.fields) ? payload.fields.map((f) => f.name) : []
  return new Set(fields)
}

async function syncTransactionsSchemaFromLocal(headers) {
  const schemaPath = path.resolve(__dirname, 'schema.json')
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema.json not found at ${schemaPath}`)
  }

  const raw = fs.readFileSync(schemaPath, 'utf8')
  const collections = JSON.parse(raw)
  const txnCollection = collections.find((item) => item && item.name === 'transactions')

  if (!txnCollection) {
    throw new Error('transactions schema block not found in scripts/pocketbase/schema.json')
  }

  const patchRes = await fetch(`${PB_URL}/api/collections/transactions`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(txnCollection),
  })

  if (!patchRes.ok) {
    throw new Error(`Failed to sync transactions schema: ${patchRes.status} ${await patchRes.text()}`)
  }
}

function readTransactionsSchemaFromLocal() {
  const schemaPath = path.resolve(__dirname, 'schema.json')
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema.json not found at ${schemaPath}`)
  }

  const raw = fs.readFileSync(schemaPath, 'utf8')
  const collections = JSON.parse(raw)
  const txnCollection = collections.find((item) => item && item.name === 'transactions')

  if (!txnCollection) {
    throw new Error('transactions schema block not found in scripts/pocketbase/schema.json')
  }

  return txnCollection
}

async function recreateTransactionsCollection(headers) {
  const txnCollection = readTransactionsSchemaFromLocal()

  const existingRes = await fetch(`${PB_URL}/api/collections/transactions`, { headers })
  if (existingRes.ok) {
    const existing = await existingRes.json()
    const existingId = existing.id || 'transactions'

    const deleteRes = await fetch(`${PB_URL}/api/collections/${existingId}`, {
      method: 'DELETE',
      headers,
    })

    if (!deleteRes.ok) {
      throw new Error(`Failed deleting transactions collection: ${deleteRes.status} ${await deleteRes.text()}`)
    }
  } else if (existingRes.status !== 404) {
    throw new Error(`Unable to check transactions collection: ${existingRes.status} ${await existingRes.text()}`)
  }

  const createRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers,
    body: JSON.stringify(txnCollection),
  })

  if (!createRes.ok) {
    throw new Error(`Failed creating transactions collection: ${createRes.status} ${await createRes.text()}`)
  }
}

async function buildResolver(collection, headers) {
  const rows = await pbListAll(collection, headers, 'id,slug')
  const idSet = new Set(rows.map((r) => r.id))
  const bySlug = new Map(
    rows
      .filter((r) => typeof r.slug === 'string' && r.slug.length > 0)
      .map((r) => [String(r.slug), r.id])
  )

  function resolve(sourceId) {
    if (!sourceId) return null
    const raw = String(sourceId)
    if (idSet.has(raw)) return raw
    if (bySlug.has(raw)) return bySlug.get(raw)

    if (isUuid(raw)) {
      const hashed = toPocketBaseId(raw, collection)
      if (idSet.has(hashed)) return hashed
    }

    return null
  }

  return { resolve, total: rows.length }
}

async function fetchSupabaseData() {
  let query = supabase
    .from('transactions')
    .select('id,occurred_at,note,amount,type,status,account_id,target_account_id,category_id,shop_id,person_id,parent_transaction_id,is_installment,metadata,final_price,cashback_amount,cashback_share_percent,cashback_share_fixed,cashback_mode,statement_cycle_tag,tag')
    .order('occurred_at', { ascending: true })

  if (onlyId) {
    query = query.eq('id', onlyId)
  }

  if (limit && Number.isFinite(limit) && limit > 0) {
    query = query.limit(limit)
  }

  const [{ data: txns, error: txError }, { data: accounts, error: accountErr }, cyclesResult] = await Promise.all([
    query,
    supabase.from('accounts').select('id,statement_day'),
    includeCycles
      ? supabase
          .from('cashback_cycles')
          .select('id,account_id,cycle_tag,spent_amount,real_awarded,virtual_profit,max_budget,min_spend_target,is_exhausted,met_min_spend,overflow_loss')
          .order('cycle_tag', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ])

  if (txError) throw txError
  if (accountErr) throw accountErr
  if (cyclesResult.error) throw cyclesResult.error

  return {
    transactions: txns || [],
    accountStatementMap: new Map((accounts || []).map((a) => [a.id, a.statement_day])),
    cycles: cyclesResult.data || [],
  }
}

function buildTransactionPayloads({ transactions, accountStatementMap, resolvers, existingTxnBySourceId, existingTxnIdSet }) {
  const unresolved = {
    account: new Map(),
    toAccount: new Map(),
    category: new Map(),
    shop: new Map(),
    person: new Map(),
    parent: new Map(),
  }

  const skipped = []
  const formulaMismatches = []
  const payloads = []

  const sourceToPbId = new Map()

  for (const txn of transactions) {
    const sourceId = String(txn.id)

    const accountId = resolvers.accounts.resolve(txn.account_id)
    if (!accountId) {
      unresolved.account.set(txn.account_id, (unresolved.account.get(txn.account_id) || 0) + 1)
      if (strictRelations) {
        skipped.push({ sourceId, reason: `Unresolved account_id: ${txn.account_id}` })
        continue
      }
    }

    const toAccountId = txn.target_account_id ? resolvers.accounts.resolve(txn.target_account_id) : null
    if (txn.target_account_id && !toAccountId) {
      unresolved.toAccount.set(txn.target_account_id, (unresolved.toAccount.get(txn.target_account_id) || 0) + 1)
    }

    const categoryId = txn.category_id ? resolvers.categories.resolve(txn.category_id) : null
    if (txn.category_id && !categoryId) {
      unresolved.category.set(txn.category_id, (unresolved.category.get(txn.category_id) || 0) + 1)
    }

    const shopId = txn.shop_id ? resolvers.shops.resolve(txn.shop_id) : null
    if (txn.shop_id && !shopId) {
      unresolved.shop.set(txn.shop_id, (unresolved.shop.get(txn.shop_id) || 0) + 1)
    }

    const personId = txn.person_id ? resolvers.people.resolve(txn.person_id) : null
    if (txn.person_id && !personId) {
      unresolved.person.set(txn.person_id, (unresolved.person.get(txn.person_id) || 0) + 1)
    }

    const statementDay = accountStatementMap.get(txn.account_id)
    const persistedCycleTag = txn.statement_cycle_tag || calculateCycleTag(txn.occurred_at, statementDay)

    const amount = parseMoney(txn.amount) ?? 0
    const sharePercent = parseMoney(txn.cashback_share_percent)
    const shareFixed = parseMoney(txn.cashback_share_fixed)
    const finalPrice = parseMoney(txn.final_price)
    const expectedFinal = computeExpectedFinalPrice(amount, sharePercent, shareFixed)

    if (finalPrice !== null && Math.abs(finalPrice - expectedFinal) > 0.01) {
      formulaMismatches.push({ sourceId, finalPrice, expectedFinal })
    }

    const existingId = existingTxnBySourceId.get(sourceId)
    const generatedId = toPocketBaseId(sourceId, 'transactions')
    const pbId = existingId || (existingTxnIdSet.has(generatedId) ? generatedId : generatedId)

    sourceToPbId.set(sourceId, pbId)

    const metadata = {
      ...(txn.metadata && typeof txn.metadata === 'object' ? txn.metadata : {}),
      source_id: sourceId,
      persisted_cycle_tag: persistedCycleTag,
    }

    payloads.push({
      sourceId,
      pbId,
      parentSourceId: txn.parent_transaction_id || null,
      body: {
        date: normalizeDate(txn.occurred_at),
        occurred_at: normalizeDate(txn.occurred_at),
        description: txn.note || '',
        note: txn.note || null,
        amount,
        type: txn.type,
        status: normalizeStatus(txn.status),
        account_id: accountId,
        to_account_id: toAccountId,
        category_id: categoryId,
        shop_id: shopId,
        person_id: personId,
        final_price: finalPrice,
        cashback_amount: parseMoney(txn.cashback_amount) ?? parseMoney(txn.cashback_share_fixed),
        cashback_share_percent: sharePercent,
        cashback_share_fixed: shareFixed,
        cashback_mode: txn.cashback_mode ?? null,
        debt_cycle_tag: txn.type === 'debt' && txn.tag ? String(txn.tag) : null,
        persisted_cycle_tag: persistedCycleTag,
        is_installment: Boolean(txn.is_installment),
        parent_transaction_id: null,
        metadata,
      },
    })
  }

  for (const item of payloads) {
    const parentSourceId = item.parentSourceId
    if (!parentSourceId) continue
    const parentPbId = sourceToPbId.get(parentSourceId) || existingTxnBySourceId.get(parentSourceId) || null

    if (!parentPbId) {
      unresolved.parent.set(parentSourceId, (unresolved.parent.get(parentSourceId) || 0) + 1)
      continue
    }

    item.body.parent_transaction_id = parentPbId
  }

  return { payloads, unresolved, skipped, formulaMismatches }
}

function summarizeMap(map, label, max = 10) {
  const entries = Array.from(map.entries())
  if (entries.length === 0) return

  console.log(`- ${label}: ${entries.length} distinct ids`)
  entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .forEach(([id, count]) => {
      console.log(`  • ${id}: ${count}`)
    })
}

function printSummary(stats) {
  console.log('\n[remigrate-source-id] === SUMMARY ===')
  console.log(`Mode: ${isApply ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Reset before migrate: ${shouldReset ? 'yes' : 'no'}`)
  console.log(`Transactions source rows: ${stats.totalSourceTransactions}`)
  console.log(`Transactions skipped: ${stats.skipped}`)
  console.log(`Transactions created: ${stats.created}`)
  console.log(`Transactions updated: ${stats.updated}`)
  console.log(`Cycles created: ${stats.cyclesCreated}`)
  console.log(`Cycles reset count: ${stats.cyclesDeleted}`)
  console.log(`Txn reset count: ${stats.transactionsDeleted}`)
  console.log(`Formula mismatches: ${stats.formulaMismatches}`)
  console.log(`Unresolved-relations: ${stats.unresolvedRelations}`)
}

async function validateAfterApply(headers, sourceTransactions) {
  const pbTransactions = await pbListAll('transactions', headers, 'id,account_id,person_id,metadata,amount,final_price,cashback_share_percent,cashback_share_fixed')

  const sourceIds = new Set(sourceTransactions.map((t) => String(t.id)))
  const pbSourceIds = new Set(
    pbTransactions
      .map((t) => (t.metadata && typeof t.metadata === 'object' ? t.metadata.source_id : null))
      .filter(Boolean)
      .map(String)
  )

  let missingInPb = 0
  for (const id of sourceIds) {
    if (!pbSourceIds.has(id)) missingInPb += 1
  }

  let accountNullCount = 0
  let formulaMismatchCount = 0
  for (const txn of pbTransactions) {
    if (!txn.account_id) accountNullCount += 1

    const amount = Number(txn.amount || 0)
    const expected = computeExpectedFinalPrice(amount, txn.cashback_share_percent, txn.cashback_share_fixed)
    const finalPrice = txn.final_price == null ? null : Number(txn.final_price)
    if (finalPrice !== null && Math.abs(finalPrice - expected) > 0.01) formulaMismatchCount += 1
  }

  console.log('\n[remigrate-source-id] === VALIDATION ===')
  console.log(`PB transactions count: ${pbTransactions.length}`)
  console.log(`PB rows missing metadata.source_id (vs source): ${missingInPb}`)
  console.log(`PB rows missing account_id: ${accountNullCount}`)
  console.log(`PB formula mismatch rows: ${formulaMismatchCount}`)
}

async function main() {
  console.log(`\n[remigrate-source-id] mode=${isApply ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`[remigrate-source-id] options: reset=${shouldReset} includeCycles=${includeCycles} strictRelations=${strictRelations} recreateCollection=${recreateCollection}`)
  if (onlyId) console.log(`[remigrate-source-id] only-id=${onlyId}`)
  if (limit) console.log(`[remigrate-source-id] limit=${limit}`)

  if (recreateCollection && !isApply) {
    throw new Error('--recreate-collection is destructive and requires --apply')
  }

  const headers = await pbAuthHeaders()

  const requiredFields = [
    'date',
    'occurred_at',
    'note',
    'amount',
    'type',
    'status',
    'account_id',
    'to_account_id',
    'category_id',
    'shop_id',
    'person_id',
    'parent_transaction_id',
    'final_price',
    'cashback_share_percent',
    'cashback_share_fixed',
    'cashback_mode',
    'debt_cycle_tag',
    'persisted_cycle_tag',
    'metadata',
  ]

  if (recreateCollection) {
    console.log('[remigrate-source-id] recreating transactions collection from local schema...')
    await recreateTransactionsCollection(headers)
  }

  let fieldSet = await pbGetCollectionFields('transactions', headers)
  let missingFields = requiredFields.filter((field) => !fieldSet.has(field))

  if (missingFields.length > 0 && autoSyncTxnSchema) {
    console.log('[remigrate-source-id] missing transaction fields detected, auto-syncing transactions schema...')
    await syncTransactionsSchemaFromLocal(headers)
    fieldSet = await pbGetCollectionFields('transactions', headers)
    missingFields = requiredFields.filter((field) => !fieldSet.has(field))
  }

  if (missingFields.length > 0) {
    throw new Error(
      `transactions collection missing fields: ${missingFields.join(', ')}. ` +
      'Run: node scripts/pocketbase/remigrate-transactions-sourceid-safe.mjs (default auto-sync) or check schema permissions.'
    )
  }

  const resolvers = {
    accounts: await buildResolver('accounts', headers),
    categories: await buildResolver('categories', headers),
    shops: await buildResolver('shops', headers),
    people: await buildResolver('people', headers),
  }

  console.log('[remigrate-source-id] resolver inventory')
  console.log(`- accounts: ${resolvers.accounts.total}`)
  console.log(`- categories: ${resolvers.categories.total}`)
  console.log(`- shops: ${resolvers.shops.total}`)
  console.log(`- people: ${resolvers.people.total}`)

  const source = await fetchSupabaseData()

  const existingTransactions = await pbListAll('transactions', headers, 'id,metadata')
  const existingTxnBySourceId = new Map()
  const existingTxnIdSet = new Set(existingTransactions.map((item) => item.id))

  for (const item of existingTransactions) {
    const sourceId = item?.metadata && typeof item.metadata === 'object' ? item.metadata.source_id : null
    if (sourceId) existingTxnBySourceId.set(String(sourceId), item.id)
  }

  const { payloads, unresolved, skipped, formulaMismatches } = buildTransactionPayloads({
    transactions: source.transactions,
    accountStatementMap: source.accountStatementMap,
    resolvers,
    existingTxnBySourceId,
    existingTxnIdSet,
  })

  console.log('[remigrate-source-id] transaction planning')
  console.log(`- source rows: ${source.transactions.length}`)
  console.log(`- to process: ${payloads.length}`)
  console.log(`- skipped: ${skipped.length}`)
  summarizeMap(unresolved.account, 'unresolved account_id')
  summarizeMap(unresolved.toAccount, 'unresolved target_account_id')
  summarizeMap(unresolved.category, 'unresolved category_id')
  summarizeMap(unresolved.shop, 'unresolved shop_id')
  summarizeMap(unresolved.person, 'unresolved person_id')
  summarizeMap(unresolved.parent, 'unresolved parent_transaction_id')

  if (formulaMismatches.length > 0) {
    console.log(`[remigrate-source-id] formula mismatch warnings: ${formulaMismatches.length}`)
    for (const item of formulaMismatches.slice(0, 20)) {
      console.log(`  • ${item.sourceId} final=${item.finalPrice} expected=${item.expectedFinal}`)
    }
  }

  let transactionsDeleted = 0
  let cyclesDeleted = 0
  let created = 0
  let updated = 0
  let cyclesCreated = 0

  if (!isApply) {
    printSummary({
      totalSourceTransactions: source.transactions.length,
      skipped: skipped.length,
      created,
      updated,
      cyclesCreated,
      cyclesDeleted,
      transactionsDeleted,
      formulaMismatches: formulaMismatches.length,
      unresolvedRelations:
        unresolved.account.size +
        unresolved.toAccount.size +
        unresolved.category.size +
        unresolved.shop.size +
        unresolved.person.size +
        unresolved.parent.size,
    })
    console.log('\n[remigrate-source-id] DRY-RUN done. Re-run with --apply to write changes.')
    return
  }

  if (shouldReset) {
    if (includeCycles) {
      cyclesDeleted = await pbDeleteAll('cashback_cycles', headers)
    }
    transactionsDeleted = await pbDeleteAll('transactions', headers)
  }

  const seenIds = new Set()
  for (const item of payloads) {
    if (seenIds.has(item.pbId)) {
      throw new Error(`Duplicate PB id generated: ${item.pbId} for source ${item.sourceId}`)
    }
    seenIds.add(item.pbId)

    const existedBefore = existingTxnBySourceId.has(item.sourceId)

    if (shouldReset || !existedBefore) {
      await pbCreate('transactions', item.pbId, item.body, headers)
      created += 1
    } else {
      await pbPatch('transactions', item.pbId, item.body, headers)
      updated += 1
    }
  }

  if (includeCycles) {
    for (const cycle of source.cycles) {
      const accountId = resolvers.accounts.resolve(cycle.account_id)
      if (!accountId && strictRelations) continue

      const cycleId = toPocketBaseId(cycle.id, 'cashback_cycles')
      const body = {
        account_id: accountId,
        cycle_tag: cycle.cycle_tag,
        spent_amount: Number(cycle.spent_amount || 0),
        real_awarded: Number(cycle.real_awarded || 0),
        virtual_profit: Number(cycle.virtual_profit || 0),
        max_budget: cycle.max_budget == null ? null : Number(cycle.max_budget),
        min_spend_target: cycle.min_spend_target == null ? null : Number(cycle.min_spend_target),
        is_exhausted: Boolean(cycle.is_exhausted || false),
        met_min_spend: Boolean(cycle.met_min_spend || false),
        overflow_loss: cycle.overflow_loss == null ? null : Number(cycle.overflow_loss),
      }

      await pbCreate('cashback_cycles', cycleId, body, headers)
      cyclesCreated += 1
    }
  }

  const unresolvedRelations =
    unresolved.account.size +
    unresolved.toAccount.size +
    unresolved.category.size +
    unresolved.shop.size +
    unresolved.person.size +
    unresolved.parent.size

  printSummary({
    totalSourceTransactions: source.transactions.length,
    skipped: skipped.length,
    created,
    updated,
    cyclesCreated,
    cyclesDeleted,
    transactionsDeleted,
    formulaMismatches: formulaMismatches.length,
    unresolvedRelations,
  })

  await validateAfterApply(headers, source.transactions)
}

main().catch((error) => {
  console.error('[remigrate-source-id] fatal:', error)
  process.exit(1)
})
