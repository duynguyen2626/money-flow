'use server'

import { Account, Category, Person, Shop, TransactionWithDetails } from '@/types/moneyflow.types'
import { AccountSpendingStats } from '@/types/cashback.types'
import { getCashbackCycleRange, formatIsoCycleTag, parseCashbackConfig } from '@/lib/cashback'
import { getCreditCardAvailableBalance, getCreditCardUsage } from '@/lib/account-balance'
import { pocketbaseGetById, pocketbaseList, toPocketBaseId } from './server'

type PocketBaseRecord = Record<string, any>

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

async function resolvePocketBaseAccountId(sourceId: string): Promise<string> {
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

  return {
    id: record.id,
    occurred_at: record.occurred_at,
    date: record.date || record.occurred_at,
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
  const records = await listAllRecords('categories', {})
  return records.map(mapCategory)
}

export async function getPocketBasePeople(): Promise<Person[]> {
  const records = await listAllRecords('people', {})
  return records.map(mapPerson)
}

export async function getPocketBaseShops(): Promise<Shop[]> {
  const records = await listAllRecords('shops', {})
  return records.map(mapShop)
}

export async function getPocketBaseAccounts(): Promise<Account[]> {
  const records = await listAllRecords('accounts', { sort: 'name' })
  const mapped = records.map(mapAccount)

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
  const records = await listAllRecords('transactions', {
    perPage: Math.min(limit, 200),
    sort: '-occurred_at',
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
  const records = await listAllRecords('transactions', {
    sort: '-occurred_at',
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

  if (!options.includeVoided) {
    filters.push("status != 'void'")
  }

  if (options.transactionId) {
    filters.push(`(id = '${options.transactionId}' || metadata.source_id = '${options.transactionId}')`)
  } else {
    if (options.personIds && options.personIds.length > 0) {
      const pIdList = options.personIds.map(id => `person_id = '${id}'`).join(' || ')
      filters.push(`(${pIdList})`)
    } else if (options.personId) {
      filters.push(`person_id = '${options.personId}'`)
    } else if (options.accountId) {
      const pbAccountId = await resolvePocketBaseAccountId(options.accountId)
      filters.push(`(account_id = '${pbAccountId}' || to_account_id = '${pbAccountId}')`)
    }
  }

  if (options.shopId) {
    const pbShopId = toPocketBaseId(options.shopId, 'shops')
    filters.push(`shop_id = '${pbShopId}'`)
  }

  if (options.categoryId) {
    const pbCategoryId = toPocketBaseId(options.categoryId, 'categories')
    filters.push(`category_id = '${pbCategoryId}'`)
  }

  if (options.installmentPlanId) {
    filters.push(`installment_plan_id = '${options.installmentPlanId}'`)
  }

  const queryParams: any = {
    sort: '-occurred_at',
    expand: 'account_id,to_account_id,category_id,shop_id,person_id',
    perPage: options.limit ? Math.min(options.limit, 200) : 200,
  }

  if (filters.length > 0) {
    queryParams.filter = filters.join(' && ')
  }

  const response = await pocketbaseList<PocketBaseRecord>('transactions', queryParams)
  return (response.items || []).map((item) => mapTransaction(item, options.accountId || ''))
}

export async function getPocketBaseTransactionById(transactionId: string): Promise<TransactionWithDetails | null> {
  const results = await loadPocketBaseTransactions({ transactionId, limit: 1, includeVoided: true })
  return results[0] || null
}
