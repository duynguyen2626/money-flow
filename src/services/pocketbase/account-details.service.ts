'use server'

import { Account, Category, Person, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { AccountSpendingStats } from '@/types/cashback.types'
import { getCashbackCycleRange, formatIsoCycleTag, parseCashbackConfig } from '@/lib/cashback'
import { getCreditCardAvailableBalance, getCreditCardUsage } from '@/lib/account-balance'
import { pocketbaseGetById, pocketbaseList, pocketbaseRequest, toPocketBaseId } from './server'

type PocketBaseRecord = Record<string, any>

function escapeFilterValue(value: string): string {
  return String(value).replace(/'/g, "\\'")
}

function isPocketBase400Error(error: unknown): boolean {
  return error instanceof Error && error.message.includes('PocketBase request failed [400]')
}

function buildTransactionQueryAttempts(
  baseParams: Record<string, string | number | boolean | undefined>,
): Array<Record<string, string | number | boolean | undefined>> {
  const attempts: Array<Record<string, string | number | boolean | undefined>> = []
  const dedupe = new Set<string>()

  const pushAttempt = (params: Record<string, string | number | boolean | undefined>) => {
    const key = JSON.stringify(params)
    if (!dedupe.has(key)) {
      dedupe.add(key)
      attempts.push(params)
    }
  }

  pushAttempt(baseParams)

  const baseExpand = typeof baseParams.expand === 'string' ? baseParams.expand : ''
  const baseFilter = typeof baseParams.filter === 'string' ? baseParams.filter : ''
  const baseSort = typeof baseParams.sort === 'string' ? baseParams.sort : '-date'

  if (baseExpand.includes('to_account_id')) {
    pushAttempt({ ...baseParams, expand: baseExpand.replace(/to_account_id/g, 'target_account_id') })
    pushAttempt({ ...baseParams, expand: baseExpand.replace(/,?to_account_id,?/g, ',').replace(/(^,|,$)/g, '') })
  }

  if (baseFilter.includes('to_account_id')) {
    pushAttempt({ ...baseParams, filter: baseFilter.replace(/to_account_id/g, 'target_account_id') })
    pushAttempt({ ...baseParams, filter: baseFilter.replace(/\s*\|\|\s*to_account_id='[^']*'/g, '') })
  }

  if (baseSort !== '-occurred_at') {
    pushAttempt({ ...baseParams, sort: '-occurred_at' })
  }

  pushAttempt({ ...baseParams, expand: undefined })

  return attempts
}

async function listTransactionsWithFallback(
  params: Record<string, string | number | boolean | undefined>,
): Promise<PocketBaseRecord[]> {
  const attempts = buildTransactionQueryAttempts(params)
  let lastError: unknown

  for (const attempt of attempts) {
    try {
      return await listAllRecords('transactions', attempt)
    } catch (error) {
      lastError = error
      if (!isPocketBase400Error(error)) {
        throw error
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('PocketBase transactions query failed')
}

async function listTransactionPageWithFallback(
  params: Record<string, string | number | boolean | undefined>,
): Promise<PocketBaseRecord[]> {
  const attempts = buildTransactionQueryAttempts(params)
  let lastError: unknown

  for (const attempt of attempts) {
    try {
      const response = await pocketbaseList<PocketBaseRecord>('transactions', attempt)
      return response.items || []
    } catch (error) {
      lastError = error
      if (!isPocketBase400Error(error)) {
        throw error
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('PocketBase transactions query failed')
}

function toAccountType(value: string | null | undefined): Account['type'] {
  if (!value) return 'bank'
  if (value === 'e_wallet') return 'ewallet'
  if (value === 'credit_card' || value === 'debt' || value === 'savings' || value === 'investment' || value === 'asset' || value === 'system') {
    return value as Account['type']
  }
  return 'bank'
}

function mapAccount(record: PocketBaseRecord): Account {
  return {
    id: record.id,
    name: record.name,
    type: toAccountType(record.type),
    currency: record.currency || 'VND',
    current_balance: Number(record.current_balance || 0),
    credit_limit: Number(record.credit_limit || 0),
    owner_id: record.owner_id || '',
    cashback_config: record.cashback_config ?? null,
    cashback_config_version: Number(record.cashback_config_version || 1),
    parent_account_id: record.parent_account_id || null,
    account_number: record.account_number || null,
    secured_by_account_id: record.secured_by_account_id || null,
    is_active: typeof record.is_active === 'boolean' ? record.is_active : true,
    image_url: record.image_url || null,
    receiver_name: record.receiver_name || null,
    total_in: Number(record.total_in || 0),
    total_out: Number(record.total_out || 0),
    annual_fee: record.annual_fee ?? null,
    annual_fee_waiver_target: record.annual_fee_waiver_target ?? null,
    cb_type: record.cb_type || 'none',
    cb_base_rate: Number(record.cb_base_rate || 0),
    cb_max_budget: record.cb_max_budget ?? null,
    cb_is_unlimited: Boolean(record.cb_is_unlimited),
    cb_rules_json: record.cb_rules_json ?? null,
    cb_min_spend: record.cb_min_spend ?? null,
    cb_cycle_type: record.cb_cycle_type || 'calendar_month',
    statement_day: record.statement_day ?? null,
    due_date: record.due_date ?? null,
    holder_type: record.holder_type || 'me',
    holder_person_id: record.holder_person_id || null,
    stats: null,
    relationships: null,
  }
}

function mapCategory(record: PocketBaseRecord): Category {
  return {
    id: record.id,
    name: record.name,
    type: (record.type || 'expense').toLowerCase() as Category['type'],
    icon: record.icon || null,
    image_url: record.image_url || null,
    kind: record.kind || null,
    is_archived: Boolean(record.is_archived || false),
  }
}

function mapPerson(record: PocketBaseRecord): Person {
  return {
    id: record.id,
    name: record.name,
    image_url: record.image_url || null,
    is_owner: Boolean(record.is_owner || false),
  }
}

function mapShop(record: PocketBaseRecord): Shop {
  return {
    id: record.id,
    name: record.name,
    image_url: record.image_url || null,
    default_category_id: record.default_category_id || null,
    is_archived: Boolean(record.is_archived || false),
  }
}

export async function resolvePocketBaseAccountId(sourceId: string): Promise<string> {
  const pbId = toPocketBaseId(sourceId, 'accounts')
  try {
    const record = await pocketbaseGetById<PocketBaseRecord>('accounts', pbId)
    return record.id
  } catch (err) {
    // Check if it's a slug
    const slugMatch = await pocketbaseList<PocketBaseRecord>('accounts', {
      filter: `slug='${sourceId}'`,
      perPage: 1,
      fields: 'id'
    })
    if (slugMatch.items?.[0]) {
      return slugMatch.items[0].id
    }
    // Fallback to hashed ID if everything else fails
    return pbId
  }
}

function parseCycleTagFromTransaction(record: PocketBaseRecord): string | null {
  if (record.persisted_cycle_tag) return String(record.persisted_cycle_tag)
  if (record.tag) return String(record.tag)
  if (record.metadata && typeof record.metadata === 'object' && record.metadata.persisted_cycle_tag) {
    return String(record.metadata.persisted_cycle_tag)
  }
  return null
}

function mapTransaction(record: PocketBaseRecord, currentAccountSourceId: string): TransactionWithDetails {
  const expandedAccount = record.expand?.account_id
  const expandedTargetAccount = record.expand?.target_account_id || record.expand?.to_account_id
  const expandedCategory = record.expand?.category_id
  const expandedShop = record.expand?.shop_id
  const expandedPerson = record.expand?.person_id

  const sourceAccountSourceId = expandedAccount?.id || (record.account_id === toPocketBaseId(currentAccountSourceId, 'accounts') ? record.account_id : record.account_id)
  const targetAccountSourceId = expandedTargetAccount?.id || record.target_account_id || record.to_account_id || null

  const occurredAt = record.occurred_at || record.date || record.created || new Date().toISOString()

  return {
    id: record.id,
    occurred_at: occurredAt,
    date: record.date || occurredAt,
    note: record.note || record.description || null,
    amount: Number(record.amount || 0),
    final_price: Number(record.final_price || 0),
    type: record.type,
    status: record.status || 'posted',
    account_id: sourceAccountSourceId,
    target_account_id: targetAccountSourceId,
    to_account_id: targetAccountSourceId,
    category_id: record.category_id || null,
    shop_id: record.shop_id || null,
    person_id: record.person_id || null,
    category_name: expandedCategory?.name || null,
    category_icon: expandedCategory?.icon || null,
    category_image_url: expandedCategory?.image_url || null,
    shop_name: expandedShop?.name || null,
    shop_image_url: expandedShop?.image_url || null,
    person_name: expandedPerson?.name || null,
    person_image_url: expandedPerson?.image_url || null,
    persisted_cycle_tag: parseCycleTagFromTransaction(record),
    tag: record.tag || null,
    cashback_mode: record.cashback_mode || null,
    cashback_share_percent: record.cashback_share_percent ?? null,
    cashback_share_fixed: record.cashback_share_fixed ?? null,
    cashback_share_amount: record.cashback_amount ?? null,
    is_installment: Boolean(record.is_installment || false),
    parent_transaction_id: record.parent_transaction_id || null,
    metadata: record.metadata || null,
  } as TransactionWithDetails
}

async function listAllRecords(collection: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<PocketBaseRecord[]> {
  let page = 1
  let totalPages = 1
  const allItems: PocketBaseRecord[] = []

  while (page <= totalPages) {
    const response = await pocketbaseList<PocketBaseRecord>(collection, {
      page,
      perPage: 200,
      ...params,
    })

    allItems.push(...(response.items || []))
    totalPages = response.totalPages || 1
    page += 1
  }

  return allItems
}

export async function getPocketBaseCategories(): Promise<Category[]> {
  console.log('[DB:PB] categories.list')
  const records = await listAllRecords('categories', { sort: '-created' })
  const items = records.map(mapCategory).sort((a, b) => a.name.localeCompare(b.name))
  console.log('[DB:PB] categories.list →', items.length, 'records')
  return items
}

export async function createPocketBaseCategory(
  supabaseId: string,
  data: {
    name: string
    type: Category['type']
    icon?: string | null
    image_url?: string | null
    kind?: Category['kind'] | null
    mcc_codes?: string[] | null
  }
): Promise<boolean> {
  const pbId = toPocketBaseId(supabaseId)
  console.log('[DB:PB] categories.create', { pbId, name: data.name })
  try {
    await pocketbaseRequest<PocketBaseRecord>('/api/collections/categories/records', {
      method: 'POST',
      body: {
        id: pbId,
        name: data.name,
        type: data.type,
        icon: data.icon ?? null,
        image_url: data.image_url ?? null,
        kind: data.kind ?? null,
        mcc_codes: data.mcc_codes ?? null,
        is_archived: false,
      },
    })
    return true
  } catch (err) {
    console.error('[DB:PB] categories.create failed:', err)
    return false
  }
}

export async function updatePocketBaseCategory(
  supabaseId: string,
  data: Partial<{
    name: string
    type: Category['type']
    icon: string | null
    image_url: string | null
    kind: Category['kind'] | null
    mcc_codes: string[] | null
  }>
): Promise<boolean> {
  const pbId = toPocketBaseId(supabaseId)
  console.log('[DB:PB] categories.update', { pbId })
  try {
    await pocketbaseRequest<PocketBaseRecord>(`/api/collections/categories/records/${pbId}`, {
      method: 'PATCH',
      body: data,
    })
    return true
  } catch (err) {
    console.error('[DB:PB] categories.update failed:', err)
    return false
  }
}

export async function togglePocketBaseCategoryArchive(
  supabaseId: string,
  isArchived: boolean
): Promise<boolean> {
  const pbId = toPocketBaseId(supabaseId)
  console.log('[DB:PB] categories.toggleArchive', { pbId, isArchived })
  try {
    await pocketbaseRequest(`/api/collections/categories/records/${pbId}`, {
      method: 'PATCH',
      body: { is_archived: isArchived },
    })
    return true
  } catch (err) {
    console.error('[DB:PB] categories.toggleArchive failed:', err)
    return false
  }
}

export async function deletePocketBaseCategory(supabaseId: string): Promise<boolean> {
  const pbId = toPocketBaseId(supabaseId)
  console.log('[DB:PB] categories.delete', { pbId })
  try {
    await pocketbaseRequest(`/api/collections/categories/records/${pbId}`, {
      method: 'DELETE',
    })
    return true
  } catch (err) {
    console.error('[DB:PB] categories.delete failed:', err)
    return false
  }
}

export async function togglePocketBaseCategoriesArchiveBulk(
  supabaseIds: string[],
  isArchived: boolean
): Promise<void> {
  console.log('[DB:PB] categories.toggleArchiveBulk', { count: supabaseIds.length, isArchived })
  await Promise.allSettled(
    supabaseIds.map((sbId) =>
      pocketbaseRequest(`/api/collections/categories/records/${toPocketBaseId(sbId)}`, {
        method: 'PATCH',
        body: { is_archived: isArchived },
      }).catch((err) => console.error('[DB:PB] categories.toggleArchiveBulk item failed:', sbId, err))
    )
  )
}

export async function deletePocketBaseCategoriesBulk(supabaseIds: string[]): Promise<void> {
  console.log('[DB:PB] categories.deleteBulk', { count: supabaseIds.length })
  await Promise.allSettled(
    supabaseIds.map((sbId) =>
      pocketbaseRequest(`/api/collections/categories/records/${toPocketBaseId(sbId)}`, {
        method: 'DELETE',
      }).catch((err) => console.error('[DB:PB] categories.deleteBulk item failed:', sbId, err))
    )
  )
}

export async function getPocketBasePeople(): Promise<Person[]> {
  console.log('[DB:PB] people.list')
  const records = await listAllRecords('people', { sort: '-created' })
  const items = records.map(mapPerson).sort((a, b) => a.name.localeCompare(b.name))
  console.log('[DB:PB] people.list →', items.length, 'records')
  return items
}

export async function getPocketBaseShops(): Promise<Shop[]> {
  console.log('[DB:PB] shops.list')
  const records = await listAllRecords('shops', { sort: '-created' })
  const items = records.map(mapShop).sort((a, b) => a.name.localeCompare(b.name))
  console.log('[DB:PB] shops.list →', items.length, 'records')
  return items
}

export async function createPocketBaseShop(
  supabaseId: string,
  data: {
    name: string
    image_url?: string | null
    default_category_id?: string | null
  }
): Promise<boolean> {
  const pbId = toPocketBaseId(supabaseId)
  const pbCategoryId = data.default_category_id ? toPocketBaseId(data.default_category_id) : null
  console.log('[DB:PB] shops.create', { pbId, name: data.name })
  try {
    await pocketbaseRequest<Record<string, unknown>>('/api/collections/shops/records', {
      method: 'POST',
      body: {
        id: pbId,
        name: data.name,
        image_url: data.image_url ?? null,
        default_category_id: pbCategoryId,
        is_archived: false,
      },
    })
    return true
  } catch (err) {
    console.error('[DB:PB] shops.create failed:', err)
    return false
  }
}

export async function updatePocketBaseShop(
  supabaseId: string,
  data: Partial<{
    name: string
    image_url: string | null
    default_category_id: string | null
  }>
): Promise<boolean> {
  const pbId = toPocketBaseId(supabaseId)
  const body: Record<string, unknown> = {}
  if (typeof data.name !== 'undefined') body.name = data.name
  if (typeof data.image_url !== 'undefined') body.image_url = data.image_url
  if (typeof data.default_category_id !== 'undefined') {
    body.default_category_id = data.default_category_id ? toPocketBaseId(data.default_category_id) : null
  }
  if (!Object.keys(body).length) return true
  console.log('[DB:PB] shops.update', { pbId })
  try {
    await pocketbaseRequest<Record<string, unknown>>(`/api/collections/shops/records/${pbId}`, {
      method: 'PATCH',
      body,
    })
    return true
  } catch (err) {
    console.error('[DB:PB] shops.update failed:', err)
    return false
  }
}

export async function togglePocketBaseShopArchive(
  supabaseId: string,
  isArchived: boolean
): Promise<boolean> {
  const pbId = toPocketBaseId(supabaseId)
  console.log('[DB:PB] shops.toggleArchive', { pbId, isArchived })
  try {
    await pocketbaseRequest(`/api/collections/shops/records/${pbId}`, {
      method: 'PATCH',
      body: { is_archived: isArchived },
    })
    return true
  } catch (err) {
    console.error('[DB:PB] shops.toggleArchive failed:', err)
    return false
  }
}

export async function deletePocketBaseShop(supabaseId: string): Promise<boolean> {
  const pbId = toPocketBaseId(supabaseId)
  console.log('[DB:PB] shops.delete', { pbId })
  try {
    await pocketbaseRequest(`/api/collections/shops/records/${pbId}`, {
      method: 'DELETE',
    })
    return true
  } catch (err) {
    console.error('[DB:PB] shops.delete failed:', err)
    return false
  }
}

export async function togglePocketBaseShopsArchiveBulk(
  supabaseIds: string[],
  isArchived: boolean
): Promise<void> {
  console.log('[DB:PB] shops.toggleArchiveBulk', { count: supabaseIds.length, isArchived })
  await Promise.allSettled(
    supabaseIds.map((sbId) =>
      pocketbaseRequest(`/api/collections/shops/records/${toPocketBaseId(sbId)}`, {
        method: 'PATCH',
        body: { is_archived: isArchived },
      }).catch((err) => console.error('[DB:PB] shops.toggleArchiveBulk item failed:', sbId, err))
    )
  )
}

export async function deletePocketBaseShopsBulk(supabaseIds: string[]): Promise<void> {
  console.log('[DB:PB] shops.deleteBulk', { count: supabaseIds.length })
  await Promise.allSettled(
    supabaseIds.map((sbId) =>
      pocketbaseRequest(`/api/collections/shops/records/${toPocketBaseId(sbId)}`, {
        method: 'DELETE',
      }).catch((err) => console.error('[DB:PB] shops.deleteBulk item failed:', sbId, err))
    )
  )
}

// ─── People write functions (Phase 3) ────────────────────────────────────────

export async function createPocketBasePerson(
  supabaseId: string,
  data: {
    name: string
    image_url?: string | null
    sheet_link?: string | null
    google_sheet_url?: string | null
    is_owner?: boolean | null
    is_archived?: boolean | null
    is_group?: boolean | null
    group_parent_id?: string | null
    sheet_full_img?: string | null
    sheet_show_bank_account?: boolean
    sheet_bank_info?: string | null
    sheet_linked_bank_id?: string | null
    sheet_show_qr_image?: boolean
  }
): Promise<boolean> {
  const pbId = toPocketBaseId(supabaseId)
  console.log('[DB:PB] people.create', { pbId, name: data.name })
  try {
    await pocketbaseRequest<Record<string, unknown>>('/api/collections/people/records', {
      method: 'POST',
      body: {
        id: pbId,
        slug: supabaseId,
        name: data.name,
        image_url: data.image_url ?? null,
        sheet_link: data.sheet_link ?? null,
        google_sheet_url: data.google_sheet_url ?? null,
        is_owner: data.is_owner ?? null,
        is_archived: data.is_archived ?? null,
        is_group: data.is_group ?? null,
        group_parent_id: data.group_parent_id ? toPocketBaseId(data.group_parent_id) : null,
        sheet_full_img: data.sheet_full_img ?? null,
        sheet_show_bank_account: data.sheet_show_bank_account ?? false,
        sheet_bank_info: data.sheet_bank_info ?? null,
        sheet_linked_bank_id: data.sheet_linked_bank_id ?? null,
        sheet_show_qr_image: data.sheet_show_qr_image ?? false,
      },
    })
    return true
  } catch (err) {
    console.error('[DB:PB] people.create failed:', err)
    return false
  }
}

export async function updatePocketBasePerson(
  supabaseId: string,
  data: Partial<{
    name: string
    image_url: string | null
    sheet_link: string | null
    google_sheet_url: string | null
    is_owner: boolean | null
    is_archived: boolean | null
    is_group: boolean | null
    group_parent_id: string | null
    sheet_full_img: string | null
    sheet_show_bank_account: boolean
    sheet_bank_info: string | null
    sheet_linked_bank_id: string | null
    sheet_show_qr_image: boolean
  }>
): Promise<boolean> {
  const pbId = toPocketBaseId(supabaseId)
  console.log('[DB:PB] people.update', { pbId })
  const body: Record<string, unknown> = { ...data }
  if ('group_parent_id' in body && body.group_parent_id) {
    body.group_parent_id = toPocketBaseId(body.group_parent_id as string)
  }
  try {
    await pocketbaseRequest<Record<string, unknown>>(`/api/collections/people/records/${pbId}`, {
      method: 'PATCH',
      body,
    })
    return true
  } catch (err) {
    console.error('[DB:PB] people.update failed:', err)
    return false
  }
}

// ─── Account write functions (Phase 4) ───────────────────────────────────────

export async function createPocketBaseAccount(
  supabaseAccountId: string,
  data: {
    name: string
    type: string
    currency?: string
    owner_id?: string | null
    credit_limit?: number | null
    current_balance?: number
    total_in?: number
    total_out?: number
    is_active?: boolean
    image_url?: string | null
    account_number?: string | null
    receiver_name?: string | null
    parent_account_id?: string | null
    secured_by_account_id?: string | null
    annual_fee?: number | null
    annual_fee_waiver_target?: number | null
    holder_type?: string
    holder_person_id?: string | null
    statement_day?: number | null
    due_date?: number | null
    cb_type?: string
    cb_base_rate?: number
    cb_max_budget?: number | null
    cb_is_unlimited?: boolean
    cb_rules_json?: unknown
    cb_min_spend?: number | null
    cb_cycle_type?: string
  }
): Promise<boolean> {
  const pbId = toPocketBaseId(supabaseAccountId)
  const pbOwnerId = data.owner_id ? toPocketBaseId(data.owner_id) : null
  const pbParentId = data.parent_account_id ? toPocketBaseId(data.parent_account_id) : null
  const pbSecuredById = data.secured_by_account_id ? toPocketBaseId(data.secured_by_account_id) : null
  const pbHolderPersonId = data.holder_person_id ? toPocketBaseId(data.holder_person_id) : null
  console.log('[DB:PB] accounts.create', { pbId, name: data.name, type: data.type })
  try {
    await pocketbaseRequest<Record<string, unknown>>('/api/collections/accounts/records', {
      method: 'POST',
      body: {
        id: pbId,
        slug: supabaseAccountId,
        name: data.name,
        type: data.type,
        currency: data.currency ?? 'VND',
        owner_id: pbOwnerId,
        credit_limit: data.credit_limit ?? null,
        current_balance: data.current_balance ?? 0,
        total_in: data.total_in ?? 0,
        total_out: data.total_out ?? 0,
        is_active: data.is_active ?? true,
        image_url: data.image_url ?? null,
        account_number: data.account_number ?? null,
        receiver_name: data.receiver_name ?? null,
        parent_account_id: pbParentId,
        secured_by_account_id: pbSecuredById,
        annual_fee: data.annual_fee ?? null,
        annual_fee_waiver_target: data.annual_fee_waiver_target ?? null,
        holder_type: data.holder_type ?? 'me',
        holder_person_id: pbHolderPersonId,
        statement_day: data.statement_day ?? null,
        due_date: data.due_date ?? null,
        cb_type: data.cb_type ?? 'none',
        cb_base_rate: data.cb_base_rate ?? 0,
        cb_max_budget: data.cb_max_budget ?? null,
        cb_is_unlimited: data.cb_is_unlimited ?? false,
        cb_rules_json: data.cb_rules_json ?? null,
        cb_min_spend: data.cb_min_spend ?? null,
        cb_cycle_type: data.cb_cycle_type ?? 'calendar_month',
      },
    })
    return true
  } catch (err) {
    console.error('[DB:PB] accounts.create failed:', err)
    return false
  }
}

export async function updatePocketBaseAccountInfo(
  supabaseAccountId: string,
  data: Partial<{
    name: string
    type: string
    currency: string
    credit_limit: number | null
    is_active: boolean
    image_url: string | null
    account_number: string | null
    receiver_name: string | null
    parent_account_id: string | null
    secured_by_account_id: string | null
    annual_fee: number | null
    annual_fee_waiver_target: number | null
    holder_type: string
    holder_person_id: string | null
    statement_day: number | null
    due_date: number | null
  }>
): Promise<boolean> {
  const pbId = toPocketBaseId(supabaseAccountId)
  console.log('[DB:PB] accounts.updateInfo', { pbId })
  const body: Record<string, unknown> = { ...data }
  if ('parent_account_id' in body && body.parent_account_id) {
    body.parent_account_id = toPocketBaseId(body.parent_account_id as string)
  } else if ('parent_account_id' in body) {
    body.parent_account_id = null
  }
  if ('secured_by_account_id' in body && body.secured_by_account_id) {
    body.secured_by_account_id = toPocketBaseId(body.secured_by_account_id as string)
  } else if ('secured_by_account_id' in body) {
    body.secured_by_account_id = null
  }
  if ('holder_person_id' in body && body.holder_person_id) {
    body.holder_person_id = toPocketBaseId(body.holder_person_id as string)
  } else if ('holder_person_id' in body) {
    body.holder_person_id = null
  }
  try {
    await pocketbaseRequest<Record<string, unknown>>(`/api/collections/accounts/records/${pbId}`, {
      method: 'PATCH',
      body,
    })
    return true
  } catch (err) {
    console.error('[DB:PB] accounts.updateInfo failed:', err)
    return false
  }
}

export async function updatePocketBaseAccountConfig(
  supabaseAccountId: string,
  data: Partial<{
    cb_type: string
    cb_base_rate: number
    cb_max_budget: number | null
    cb_is_unlimited: boolean
    cb_rules_json: unknown
    cb_min_spend: number | null
    cb_cycle_type: string
    cashback_config: unknown
    cashback_config_version: number
    statement_day: number | null
    due_date: number | null
    name: string
    credit_limit: number | null
    type: string
    secured_by_account_id: string | null
    is_active: boolean | null
    image_url: string | null
    annual_fee: number | null
    annual_fee_waiver_target: number | null
    parent_account_id: string | null
    account_number: string | null
    receiver_name: string | null
    holder_type: string
    holder_person_id: string | null
  }>
): Promise<boolean> {
  const pbId = toPocketBaseId(supabaseAccountId)
  console.log('[DB:PB] accounts.updateConfig', { pbId })
  const body: Record<string, unknown> = { ...data }
  if ('secured_by_account_id' in body && body.secured_by_account_id) {
    body.secured_by_account_id = toPocketBaseId(body.secured_by_account_id as string)
  }
  if ('parent_account_id' in body && body.parent_account_id) {
    body.parent_account_id = toPocketBaseId(body.parent_account_id as string)
  }
  if ('holder_person_id' in body && body.holder_person_id) {
    body.holder_person_id = toPocketBaseId(body.holder_person_id as string)
  }
  try {
    await pocketbaseRequest<Record<string, unknown>>(`/api/collections/accounts/records/${pbId}`, {
      method: 'PATCH',
      body,
    })
    return true
  } catch (err) {
    console.error('[DB:PB] accounts.updateConfig failed:', err)
    return false
  }
}

export async function getPocketBaseAccounts(): Promise<Account[]> {
  const records = await listAllRecords('accounts', { sort: '-created' })
  const mapped = records.map(mapAccount).sort((a, b) => a.name.localeCompare(b.name))

  const byPocketBaseId = new Map(records.map((item) => [item.id, item]))
  const pocketBaseToSource = new Map(records.map((item) => [item.id, item.slug || item.id]))

  // FAST PATH: Identify and pre-fetch cycles for current state
  const now = new Date()

  // First pass: Resolve which tags we need to fetch
  const accTagMap = new Map<string, string>();
  const tagsToFetch = new Set<string>();

  for (const account of mapped) {
    if (account.type !== 'credit_card') continue;

    const config = parseCashbackConfig(account.cashback_config, account.id);
    const range = getCashbackCycleRange(config, now);
    const tag = formatIsoCycleTag(range?.end ?? now);

    const pbId = toPocketBaseId(account.id, 'accounts');
    accTagMap.set(pbId, tag);
    tagsToFetch.add(tag);
  }

  // Second pass: Fetch all relevant cycles in one go (or batches if too many)
  const allCycles: PocketBaseRecord[] = [];
  if (tagsToFetch.size > 0) {
    // If many disparate tags, this might be slow, but usually it's just 1-2 (current month, prev month)
    const tagFilter = Array.from(tagsToFetch).map(t => `cycle_tag='${t}'`).join(' || ');
    const cyclesResp = await pocketbaseList<PocketBaseRecord>('cashback_cycles', {
      filter: `(${tagFilter})`,
      perPage: 200
    });
    allCycles.push(...(cyclesResp.items || []));
  }

  const cyclesByAccTag = new Map(allCycles.map(c => [`${c.account_id}:${c.cycle_tag}`, c]));

  return mapped.map((account) => {
    const pbId = toPocketBaseId(account.id, 'accounts')
    const sourceRecord = byPocketBaseId.get(pbId)
    const parentPocketBaseId = sourceRecord?.parent_account_id || null
    const securedByPocketBaseId = sourceRecord?.secured_by_account_id || null

    // Attach Stats if credit card
    let stats: any = null
    if (account.type === 'credit_card') {
      const resolvedTag = accTagMap.get(pbId)
      const cycle = cyclesByAccTag.get(`${pbId}:${resolvedTag}`)
      if (cycle) {
        const earnedSoFar = Number(cycle.real_awarded || 0) + Number(cycle.virtual_profit || 0)
        const maxBudget = cycle.max_budget ?? account.cb_max_budget ?? null
        stats = {
          spent_this_cycle: Number(cycle.spent_amount || 0),
          shared_cashback: Number(cycle.real_awarded || 0),
          virtual_profit: Number(cycle.virtual_profit || 0),
          remains_cap: maxBudget === null ? null : Math.max(0, maxBudget - earnedSoFar),
          is_qualified: Boolean(cycle.met_min_spend),
          earned_so_far: earnedSoFar,
          cycle_tag: resolvedTag
        }
      }
    }

    return {
      ...account,
      stats,
      parent_account_id: parentPocketBaseId || null,
      secured_by_account_id: securedByPocketBaseId || null,
    }
  })
}

export async function getPocketBaseAccountSpendingStatsSnapshot(sourceAccountId: string, date: Date, cycleTag?: string): Promise<AccountSpendingStats | null> {
  const pocketBaseAccountId = await resolvePocketBaseAccountId(sourceAccountId)
  const accountRecord = await pocketbaseGetById<PocketBaseRecord>('accounts', pocketBaseAccountId)

  const account = mapAccount(accountRecord)

  if (account.type !== 'credit_card') return null

  const config = parseCashbackConfig(account.cashback_config, account.id)
  const cycleRange = getCashbackCycleRange(config, date)
  const resolvedCycleTag = cycleTag || formatIsoCycleTag(cycleRange?.end ?? date)

  const cycleResponse = await pocketbaseList<PocketBaseRecord>('cashback_cycles', {
    perPage: 1,
    filter: `account_id='${pocketBaseAccountId}' && cycle_tag='${resolvedCycleTag}'`,
  })

  const cycle = cycleResponse.items?.[0]

  const currentSpend = Number(cycle?.spent_amount || 0)
  const minSpend = cycle?.min_spend_target ?? account.cb_min_spend ?? null
  const maxCashback = cycle?.max_budget ?? account.cb_max_budget ?? null
  const actualClaimed = Number(cycle?.real_awarded || 0)
  const virtualProfit = Number(cycle?.virtual_profit || 0)
  const sharedAmount = Number(cycle?.shared_amount ?? actualClaimed)
  const netProfit = Number(cycle?.net_profit ?? virtualProfit)
  const earnedSoFar = actualClaimed + virtualProfit
  const remainingBudget = maxCashback === null ? null : Math.max(0, Number(maxCashback) - earnedSoFar)
  const isMinSpendMet = minSpend === null ? true : currentSpend >= Number(minSpend)

  // OPTIONAL: Resolve policy for metadata (Zero-latency path if stats are cached)
  const { resolveCashbackPolicy } = await import('../cashback/policy-resolver')
  const policy = resolveCashbackPolicy({
    account: {
      id: account.id,
      cb_type: account.cb_type,
      cb_base_rate: account.cb_base_rate,
      cb_max_budget: account.cb_max_budget,
      cb_is_unlimited: account.cb_is_unlimited,
      cb_rules_json: account.cb_rules_json,
      cb_min_spend: account.cb_min_spend,
      cashback_config: account.cashback_config
    },
    amount: 1000000, // Dummy for policy check
    cycleTotals: { spent: currentSpend }
  })

  const statementDay = account.statement_day || null
  const cycleLabel = cycleRange
    ? (config.cycleType === 'statement_cycle'
      ? `${String(cycleRange.start.getDate()).padStart(2, '0')}.${String(cycleRange.start.getMonth() + 1).padStart(2, '0')} - ${String(cycleRange.end.getDate()).padStart(2, '0')}.${String(cycleRange.end.getMonth() + 1).padStart(2, '0')}`
      : resolvedCycleTag)
    : resolvedCycleTag

  return {
    currentSpend,
    minSpend: minSpend === null ? null : Number(minSpend),
    maxCashback: maxCashback === null ? null : Number(maxCashback),
    actualClaimed,
    rate: policy.rate, // Use policy rate
    earnedSoFar,
    sharedAmount,
    potentialProfit: netProfit,
    netProfit,
    remainingBudget,
    is_min_spend_met: isMinSpendMet,
    estYearlyTotal: earnedSoFar * 12,
    activeRules: [],
    policyMetadata: policy.metadata,
    matchReason: policy.metadata?.reason,
    cycle: cycleRange ? {
      tag: resolvedCycleTag,
      label: cycleLabel,
      start: cycleRange.start.toISOString(),
      end: cycleRange.end.toISOString(),
    } : null
  }
}

export async function getPocketBaseAccountDetails(sourceAccountId: string): Promise<Account | null> {
  const pocketBaseAccountId = await resolvePocketBaseAccountId(sourceAccountId)
  const allAccounts = await getPocketBaseAccounts()
  const account = allAccounts.find((item) => item.id === pocketBaseAccountId)

  if (!account) return null

  const usagePercent = account.type === 'credit_card'
    ? getCreditCardUsage({ type: account.type, credit_limit: account.credit_limit || 0, current_balance: account.current_balance || 0 }).percent
    : 0

  const remainingLimit = account.type === 'credit_card'
    ? getCreditCardAvailableBalance({ type: account.type, credit_limit: account.credit_limit || 0, current_balance: account.current_balance || 0 })
    : account.current_balance || 0

  const childAccounts = allAccounts.filter((item) => item.parent_account_id === account.id)
  const parent = account.parent_account_id ? allAccounts.find((item) => item.id === account.parent_account_id) : null

  const statsSnapshot = await getPocketBaseAccountSpendingStatsSnapshot(sourceAccountId, new Date())

  return {
    ...account,
    stats: {
      usage_percent: usagePercent,
      remaining_limit: remainingLimit,
      spent_this_cycle: statsSnapshot?.currentSpend || 0,
      min_spend: statsSnapshot?.minSpend ?? null,
      missing_for_min: statsSnapshot?.minSpend ? Math.max(0, statsSnapshot.minSpend - (statsSnapshot.currentSpend || 0)) : null,
      is_qualified: Boolean(statsSnapshot?.is_min_spend_met),
      cycle_range: statsSnapshot?.cycle?.label || '',
      due_date_display: null,
      due_date: null,
      remains_cap: statsSnapshot?.remainingBudget ?? null,
      shared_cashback: statsSnapshot?.sharedAmount ?? null,
      real_awarded: statsSnapshot?.actualClaimed ?? 0,
      virtual_profit: statsSnapshot?.netProfit ?? 0,
      annual_fee_waiver_target: account.annual_fee_waiver_target ?? null,
      annual_fee_waiver_progress: 0,
      annual_fee_waiver_met: false,
      max_budget: statsSnapshot?.maxCashback ?? null,
    },
    relationships: {
      is_parent: childAccounts.length > 0,
      child_count: childAccounts.length,
      child_accounts: childAccounts.map((item) => ({ id: item.id, name: item.name, image_url: item.image_url || null })),
      parent_info: parent ? { id: parent.id, name: parent.name, type: parent.type, image_url: parent.image_url || null } : null,
    },
    credit_card_info: {
      statement_day: account.statement_day || undefined,
      payment_due_day: account.due_date || undefined,
    },
  }
}

export async function loadPocketBaseTransactionsForAccount(sourceAccountId: string, limit = 2000): Promise<TransactionWithDetails[]> {
  const pocketBaseAccountId = await resolvePocketBaseAccountId(sourceAccountId)
  const records = await listTransactionsWithFallback({
    perPage: Math.min(limit, 200),
    sort: '-date',
    expand: 'account_id,to_account_id,category_id,shop_id,person_id',
    filter: `(account_id='${pocketBaseAccountId}' || to_account_id='${pocketBaseAccountId}')`,
  })

  return records.map((item) => mapTransaction(item, sourceAccountId))
}

export async function getPocketBaseAccountCycleOptions(sourceAccountId: string, limit = 12): Promise<Array<{
  tag: string
  label: string
  cycleId: string | null
  statementDay: number | null
  cycleType: string | null
  stats?: {
    spent_amount: number
    real_awarded: number
    virtual_profit: number
  }
}>> {
  const pocketBaseAccountId = await resolvePocketBaseAccountId(sourceAccountId)

  const accountRecord = await pocketbaseGetById<PocketBaseRecord>('accounts', pocketBaseAccountId)
  const account = mapAccount(accountRecord)
  const config = parseCashbackConfig(account.cashback_config, account.id)

  const cyclesResponse = await pocketbaseList<PocketBaseRecord>('cashback_cycles', {
    page: 1,
    perPage: Math.max(limit * 2, 24),
    filter: `account_id='${pocketBaseAccountId}'`,
    sort: '-cycle_tag',
    fields: 'id,cycle_tag,spent_amount,real_awarded,virtual_profit',
  })

  const cycleItems = cyclesResponse.items || []
  return cycleItems.slice(0, Math.max(limit, 1)).map((cycle) => {
    const parsed = String(cycle.cycle_tag || '').split('-')
    const year = parseInt(parsed[0] || '0', 10)
    const month = parseInt(parsed[1] || '1', 10)

    let label = cycle.cycle_tag
    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      if (config.cycleType === 'statement_cycle' && config.statementDay) {
        const end = new Date(year, month - 1, config.statementDay - 1)
        const start = new Date(year, month - 2, config.statementDay)
        const formatDate = (value: Date) => `${String(value.getDate()).padStart(2, '0')}.${String(value.getMonth() + 1).padStart(2, '0')}`
        label = `${formatDate(start)} - ${formatDate(end)}`
      } else {
        label = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1))
      }
    }

    return {
      tag: cycle.cycle_tag,
      label,
      cycleId: cycle.id || null,
      statementDay: account.statement_day ?? null,
      cycleType: account.cb_cycle_type || null,
      stats: {
        spent_amount: Number(cycle.spent_amount || 0),
        real_awarded: Number(cycle.real_awarded || 0),
        virtual_profit: Number(cycle.virtual_profit || 0),
      },
    }
  })
}

export async function getPocketBaseCycleTransactions(sourceAccountId: string, cycleTag: string): Promise<TransactionWithDetails[]> {
  const pocketBaseAccountId = await resolvePocketBaseAccountId(sourceAccountId)
  const records = await listTransactionsWithFallback({
    sort: '-date',
    expand: 'account_id,to_account_id,category_id,shop_id,person_id',
    filter: `(account_id='${pocketBaseAccountId}' || to_account_id='${pocketBaseAccountId}') && (persisted_cycle_tag='${cycleTag}' || tag='${cycleTag}')`,
  })

  return records.map((item) => mapTransaction(item, sourceAccountId))
}
export async function loadPocketBaseTransactions(options: {
  transactionId?: string;
  accountId?: string;
  personId?: string;
  personIds?: string[];
  categoryId?: string;
  shopId?: string;
  installmentPlanId?: string;
  limit?: number;
  includeVoided?: boolean;
}): Promise<TransactionWithDetails[]> {
  const filters: string[] = []

  if (options.transactionId) {
    const normalizedInputId = options.transactionId.trim()
    const hashedId = toPocketBaseId(normalizedInputId, 'transactions')
    const possibleIds = new Set<string>([normalizedInputId, hashedId].filter(Boolean))
    const idFilter = Array.from(possibleIds)
      .map((id) => `id='${escapeFilterValue(id)}'`)
      .join(' || ')
    filters.push(`(${idFilter})`)
  } else {
    if (options.personIds && options.personIds.length > 0) {
      const pIdList = options.personIds
        .map((id) => toPocketBaseId(id, 'people'))
        .map((id) => `person_id='${escapeFilterValue(id)}'`)
        .join(' || ')
      filters.push(`(${pIdList})`)
    } else if (options.personId) {
      const pbPersonId = toPocketBaseId(options.personId, 'people')
      filters.push(`person_id='${escapeFilterValue(pbPersonId)}'`)
    } else if (options.accountId) {
      const pbAccountId = await resolvePocketBaseAccountId(options.accountId)
      filters.push(`(account_id='${escapeFilterValue(pbAccountId)}' || to_account_id='${escapeFilterValue(pbAccountId)}')`)
    }
  }

  if (options.shopId) {
    const pbShopId = toPocketBaseId(options.shopId, 'shops')
    filters.push(`shop_id='${escapeFilterValue(pbShopId)}'`)
  }

  if (options.categoryId) {
    const pbCategoryId = toPocketBaseId(options.categoryId, 'categories')
    filters.push(`category_id='${escapeFilterValue(pbCategoryId)}'`)
  }

  if (options.installmentPlanId) {
    filters.push(`installment_plan_id='${escapeFilterValue(options.installmentPlanId)}'`)
  }

  const queryParams: any = {
    sort: '-date',
    expand: 'account_id,to_account_id,category_id,shop_id,person_id',
    perPage: options.limit ? Math.min(options.limit, 200) : 200,
  }

  if (filters.length > 0) {
    queryParams.filter = filters.join(' && ')
  }

  const items = await listTransactionPageWithFallback(queryParams)
  const mapped = items.map((item) => mapTransaction(item, options.accountId || ''))

  if (options.includeVoided) {
    return mapped
  }

  return mapped.filter((item) => String(item.status || '').toLowerCase() !== 'void')
}

export async function getPocketBaseTransactionById(transactionId: string): Promise<TransactionWithDetails | null> {
  const results = await loadPocketBaseTransactions({ transactionId, limit: 1, includeVoided: true })
  return results[0] || null
}

// ============================================================
// PHASE 5 — Transaction write functions (dual-write secondary)
// ============================================================

type TransactionWriteData = {
  occurred_at: string
  note?: string | null
  type: string
  account_id: string
  amount: number
  tag?: string | null
  category_id?: string | null
  person_id?: string | null
  target_account_id?: string | null
  shop_id?: string | null
  status?: string
  persisted_cycle_tag?: string | null
  cashback_share_percent?: number | null
  cashback_share_fixed?: number | null
  cashback_mode?: string | null
  metadata?: unknown
}

export async function createPocketBaseTransaction(supabaseId: string, data: TransactionWriteData): Promise<void> {
  console.log('[DB:PB] transactions.create', { id: supabaseId, type: data.type, amount: data.amount })
  const pbId = toPocketBaseId(supabaseId)
  // Merge source_id into metadata so mapTransaction can reverse-lookup the SB UUID via record.metadata.source_id
  const mergedMetadata = {
    ...(data.metadata && typeof data.metadata === 'object' ? (data.metadata as Record<string, unknown>) : {}),
    source_id: supabaseId,
  }
  await pocketbaseRequest(`/api/collections/transactions/records`, {
    method: 'POST',
    body: {
      id: pbId,
      occurred_at: data.occurred_at,
      note: data.note ?? null,
      type: data.type,
      account_id: toPocketBaseId(data.account_id),
      amount: data.amount,
      tag: data.tag ?? null,
      category_id: data.category_id ? toPocketBaseId(data.category_id) : null,
      person_id: data.person_id ? toPocketBaseId(data.person_id) : null,
      target_account_id: data.target_account_id ? toPocketBaseId(data.target_account_id) : null,
      shop_id: data.shop_id ? toPocketBaseId(data.shop_id) : null,
      status: data.status ?? 'posted',
      persisted_cycle_tag: data.persisted_cycle_tag ?? null,
      cashback_share_percent: data.cashback_share_percent ?? null,
      cashback_share_fixed: data.cashback_share_fixed ?? null,
      cashback_mode: data.cashback_mode ?? null,
      metadata: mergedMetadata,
    },
  })
}

export async function updatePocketBaseTransaction(supabaseId: string, data: Partial<TransactionWriteData>): Promise<void> {
  console.log('[DB:PB] transactions.update', { id: supabaseId })
  const pbId = toPocketBaseId(supabaseId)
  const payload: Record<string, unknown> = {}
  if (data.occurred_at !== undefined) payload.occurred_at = data.occurred_at
  if (data.note !== undefined) payload.note = data.note
  if (data.type !== undefined) payload.type = data.type
  if (data.account_id !== undefined) payload.account_id = toPocketBaseId(data.account_id)
  if (data.amount !== undefined) payload.amount = data.amount
  if (data.tag !== undefined) payload.tag = data.tag
  if (data.category_id !== undefined) payload.category_id = data.category_id ? toPocketBaseId(data.category_id) : null
  if (data.person_id !== undefined) payload.person_id = data.person_id ? toPocketBaseId(data.person_id) : null
  if (data.target_account_id !== undefined) payload.target_account_id = data.target_account_id ? toPocketBaseId(data.target_account_id) : null
  if (data.shop_id !== undefined) payload.shop_id = data.shop_id ? toPocketBaseId(data.shop_id) : null
  if (data.status !== undefined) payload.status = data.status
  if (data.persisted_cycle_tag !== undefined) payload.persisted_cycle_tag = data.persisted_cycle_tag
  if (data.cashback_share_percent !== undefined) payload.cashback_share_percent = data.cashback_share_percent
  if (data.cashback_share_fixed !== undefined) payload.cashback_share_fixed = data.cashback_share_fixed
  if (data.cashback_mode !== undefined) payload.cashback_mode = data.cashback_mode
  if (data.metadata !== undefined) payload.metadata = data.metadata
  if (Object.keys(payload).length === 0) return
  await pocketbaseRequest(`/api/collections/transactions/records/${pbId}`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function voidPocketBaseTransaction(supabaseId: string): Promise<void> {
  console.log('[DB:PB] transactions.void', { id: supabaseId })
  const pbId = toPocketBaseId(supabaseId)
  await pocketbaseRequest(`/api/collections/transactions/records/${pbId}`, {
    method: 'PATCH',
    body: { status: 'void' },
  })
}

// ============================================================
// PHASE 5 — Unified transaction read (global, no account filter)
// ============================================================

export async function getPocketBaseUnifiedTransactions(options: {
  limit?: number
  includeVoided?: boolean
} = {}): Promise<TransactionWithDetails[]> {
  const { limit = 1000, includeVoided = false } = options
  console.log('[DB:PB] transactions.unified.list', { limit, includeVoided })

  const filter = includeVoided ? undefined : `status != 'void'`
  const records = await listAllRecords('transactions', {
    perPage: Math.min(limit, 200),
    sort: '-occurred_at',
    expand: 'account_id,target_account_id,to_account_id,category_id,shop_id,person_id',
    ...(filter ? { filter } : {}),
  })

  // Respect the limit after pagination (listAllRecords fetches all pages)
  const sliced = limit < records.length ? records.slice(0, limit) : records
  const result = sliced.map((item) => mapTransaction(item, ''))
  console.log('[DB:PB] transactions.unified.list →', result.length, 'records')
  return result
}
