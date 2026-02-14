'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Account, AccountRelationships, AccountStats, TransactionWithDetails, AccountRow } from '@/types/moneyflow.types'
import {
  parseCashbackConfig,
  getCashbackCycleRange,
  calculateBankCashback,
  formatIsoCycleTag,
  formatLegacyCycleTag
} from '@/lib/cashback'
import { computeAccountTotals, getCreditCardAvailableBalance, getCreditCardUsage } from '@/lib/account-balance'
import {
  mapUnifiedTransaction
} from '@/lib/transaction-mapper'
import { Database, Json } from '@/types/database.types'



function normalizeCashbackConfig(value: Json | null): Json | null {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (parseError) {
      console.error('Failed to parse cashback_config string:', parseError)
      return null
    }
  }

  return value
}



const fmtDate = (d: Date) => {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(d)
}

async function getStatsForAccount(supabase: ReturnType<typeof createClient>, account: AccountRow): Promise<AccountStats | null> {
  const creditLimit = account.credit_limit ?? 0
  const currentBalance = account.current_balance ?? 0

  // 0. Base Stats (Usage)
  const usage_percent = account.type === 'credit_card'
    ? getCreditCardUsage({
      type: account.type,
      credit_limit: creditLimit,
      current_balance: currentBalance,
    }).percent
    : 0

  const remaining_limit = account.type === 'credit_card'
    ? getCreditCardAvailableBalance({
      type: account.type,
      credit_limit: creditLimit,
      current_balance: currentBalance,
    })
    : currentBalance

  // Default values
  const baseStats: AccountStats = {
    usage_percent,
    remaining_limit,
    spent_this_cycle: 0,
    min_spend: null,
    missing_for_min: null,
    is_qualified: false,
    cycle_range: "",
    due_date_display: null,
    due_date: null,
    remains_cap: null,
    shared_cashback: null
  }

  // Only calculate full stats for accounts with cashback config
  if (!account.cashback_config) return baseStats

  const config = parseCashbackConfig(account.cashback_config, account.id)
  if (!config) return baseStats

  const now = new Date()
  const cycleRange = getCashbackCycleRange(config, now)
  if (!cycleRange) return baseStats
  const { start, end } = cycleRange

  // MF5.2.2B FIX: Read from cashback_cycles for consistency
  // Determine cycle tag using statement day logic.
  const tagDate = cycleRange.end
  const cycleTag = formatIsoCycleTag(tagDate)
  const legacyCycleTag = formatLegacyCycleTag(tagDate)
  const cycleTags = legacyCycleTag !== cycleTag ? [cycleTag, legacyCycleTag] : [cycleTag]

  let cycle = (await supabase
    .from('cashback_cycles')
    .select('*')
    .eq('account_id', account.id)
    .eq('cycle_tag', cycleTag)
    .maybeSingle()).data as any ?? null

  if (!cycle && legacyCycleTag !== cycleTag) {
    cycle = (await supabase
      .from('cashback_cycles')
      .select('*')
      .eq('account_id', account.id)
      .eq('cycle_tag', legacyCycleTag)
      .maybeSingle()).data as any ?? null
  }

  // 1. Stats from Cycle (Primary Source)
  let spent_this_cycle = cycle?.spent_amount ?? 0
  const real_awarded = cycle?.real_awarded ?? 0
  const virtual_profit = cycle?.virtual_profit ?? 0

  if (!cycle || spent_this_cycle === 0) {
    const { data: taggedTxns, error: taggedError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('account_id', account.id)
      .neq('status', 'void')
      .in('type', ['expense', 'debt'])
      .in('persisted_cycle_tag', cycleTags)

    if (!taggedError && taggedTxns && taggedTxns.length > 0) {
      const taggedSum = taggedTxns.reduce((sum, txn: any) => sum + Math.abs(txn.amount ?? 0), 0)
      if (taggedSum > 0) {
        spent_this_cycle = taggedSum
      }
    } else if (!taggedError && start && end) {
      const { data: rangeTxns } = await supabase
        .from('transactions')
        .select('amount')
        .eq('account_id', account.id)
        .neq('status', 'void')
        .in('type', ['expense', 'debt'])
        .gte('occurred_at', start.toISOString())
        .lte('occurred_at', end.toISOString())

      if (rangeTxns && rangeTxns.length > 0) {
        const rangeSum = rangeTxns.reduce((sum, txn: any) => sum + Math.abs(txn.amount ?? 0), 0)
        if (rangeSum > 0) {
          spent_this_cycle = rangeSum
        }
      }
    }
  }

  // 2. Budget Left Calculation
  // MF5.3.3 FIX: Budget Left must come from cycle. If no cycle, show null (--) instead of fallback to full budget.
  let remains_cap: number | null = null
  if (cycle) {
    const maxBudget = cycle.max_budget ?? null
    if (maxBudget !== null) {
      const consumed = real_awarded + virtual_profit
      remains_cap = Math.max(0, maxBudget - consumed)
    }
  } else if (config.maxAmount) {
    const consumed = real_awarded + virtual_profit
    remains_cap = Math.max(0, config.maxAmount - consumed)
  }

  // 3. Fallback / Validation if cycle missing (e.g. no txns yet)
  // If no cycle, spent is 0, real is 0, virtual is 0 -> correct.

  const min_spend = cycle ? (cycle.min_spend_target ?? null) : config.minSpend
  const missing_for_min = (min_spend !== null) ? Math.max(0, min_spend - spent_this_cycle) : null
  const is_qualified = cycle?.met_min_spend ?? (min_spend !== null && spent_this_cycle >= min_spend)

  let cycle_range = (start && end) ? `${fmtDate(start)} - ${fmtDate(end)}` : null

  // Smart Cycle Detection - Format as DD-MM to DD-MM
  const isFullMonth = start.getDate() === 1 &&
    (new Date(end.getTime() + 86400000).getDate() === 1)

  if (config.cycleType === 'calendar_month' || isFullMonth) {
    // Full month: show first day to last day of month
    const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    cycle_range = `01-${String(start.getMonth() + 1).padStart(2, '0')} to ${String(lastDay).padStart(2, '0')}-${String(start.getMonth() + 1).padStart(2, '0')}`
  } else {
    // Custom cycle: DD-MM to DD-MM
    const startDay = String(start.getDate()).padStart(2, '0')
    const startMonth = String(start.getMonth() + 1).padStart(2, '0')
    const endDay = String(end.getDate()).padStart(2, '0')
    const endMonth = String(end.getMonth() + 1).padStart(2, '0')
    cycle_range = `${startDay}-${startMonth} to ${endDay}-${endMonth}`
  }

  // 4. Due Date Display
  let due_date_display: string | null = null
  let due_date: string | null = null

  if (config.dueDate) {
    const currentDay = now.getDate()
    let targetMonth = now.getMonth()
    const targetYear = now.getFullYear()

    if (currentDay > config.dueDate) {
      targetMonth += 1
    }

    const targetDate = new Date(targetYear, targetMonth, config.dueDate)
    due_date_display = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(targetDate)
    due_date = targetDate.toISOString()
  }

  // 5. Annual Fee Waiver Calculation
  let annual_fee_waiver_target: number | null = null
  let annual_fee_waiver_progress = 0
  let annual_fee_waiver_met = false

  if (account.type === 'credit_card' && account.annual_fee && account.annual_fee > 0) {
    // Get waiver target from account config, or use minSpendTarget as fallback
    annual_fee_waiver_target = account.annual_fee_waiver_target ?? config.minSpend ?? null

    if (annual_fee_waiver_target && annual_fee_waiver_target > 0) {
      // Calculate annual spend (not just current cycle)
      // For now, use spent_this_cycle as proxy; in production, aggregate full year
      const annualSpend = spent_this_cycle // TODO: Implement full year aggregation
      annual_fee_waiver_progress = Math.min(100, (annualSpend / annual_fee_waiver_target) * 100)
      annual_fee_waiver_met = annualSpend >= annual_fee_waiver_target
    }
  }

  return {
    ...baseStats,
    spent_this_cycle,
    min_spend,
    missing_for_min,
    is_qualified,
    cycle_range,
    due_date_display,
    due_date,
    remains_cap,
    shared_cashback: real_awarded,
    real_awarded,
    virtual_profit,
    annual_fee_waiver_target,
    annual_fee_waiver_progress,
    annual_fee_waiver_met,
    max_budget: cycle?.max_budget ?? config.maxAmount ?? null
  }
}



export async function getAccounts(supabaseClient?: SupabaseClient): Promise<Account[]> {
  const supabase = supabaseClient ?? createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, type, currency, current_balance, credit_limit, parent_account_id, account_number, owner_id, cashback_config, cashback_config_version, secured_by_account_id, is_active, image_url, receiver_name, total_in, total_out, annual_fee, annual_fee_waiver_target')
  // Remove default sorting to handle custom sort logic

  if (error) {
    console.error('Error fetching accounts:', error)
    if (error.message) console.error('Error message:', error.message)
    if (error.code) console.error('Error code:', error.code)
    return []
  }

  const rows = (data ?? []) as AccountRow[]

  // 1. Pre-process Relationships
  const childrenMap = new Map<string, AccountRow[]>()
  const accountMap = new Map<string, AccountRow>()

  // First: Build Account Map
  rows.forEach(row => {
    accountMap.set(row.id, row)
  })

  // Second: Build Children Map
  rows.forEach(row => {
    if (row.parent_account_id) {
      if (!childrenMap.has(row.parent_account_id)) {
        childrenMap.set(row.parent_account_id, [])
      }
      // Only add if parent actually exists in current dataset to avoid orphans
      if (accountMap.has(row.parent_account_id)) {
        childrenMap.get(row.parent_account_id)!.push(row)
      }
    }
  })

  // 2. Parallel fetch stats and build Account objects
  // 2. Linear fetch stats to avoid connection reset (ECONNRESET)
  const accounts: Account[] = []

  // Single-thread execution (or small batch) to be safe
  for (const item of rows) {
    const stats = await getStatsForAccount(supabase, item)

    // Relationship Logic (Shared Limit Family)
    const childRows = childrenMap.get(item.id) || []
    const parentRow = item.parent_account_id ? accountMap.get(item.parent_account_id) : null

    const relationships: AccountRelationships = {
      is_parent: childRows.length > 0,
      child_count: childRows.length,
      child_accounts: childRows.map(c => ({
        id: c.id,
        name: c.name,
        image_url: c.image_url
      })),
      parent_info: parentRow ? {
        id: parentRow.id,
        name: parentRow.name,
        type: parentRow.type,
        image_url: parentRow.image_url
      } : null
    }

    accounts.push({
      id: item.id,
      name: item.name,
      type: item.type,
      currency: item.currency ?? 'VND',
      current_balance: item.current_balance ?? 0,
      credit_limit: item.credit_limit ?? 0,
      owner_id: item.owner_id ?? '',
      account_number: item.account_number ?? null,
      receiver_name: item.receiver_name ?? null,
      parent_account_id: item.parent_account_id ?? null,
      secured_by_account_id: item.secured_by_account_id ?? null,
      cashback_config: normalizeCashbackConfig(item.cashback_config),
      is_active: typeof item.is_active === 'boolean' ? item.is_active : null,
      image_url: typeof item.image_url === 'string' ? item.image_url : null,
      total_in: item.total_in ?? 0,
      total_out: item.total_out ?? 0,
      stats,
      relationships, // Added field
      credit_card_info: (() => {
        const config = normalizeCashbackConfig(item.cashback_config) as any
        if (!config) return undefined
        return {
          statement_day: config.statementDay ?? config.statement_day,
          payment_due_day: config.paymentDueDay ?? config.payment_due_day ?? config.dueDate
        }
      })(),
    })
  }

  // 3. Sorting Logic
  // Priority: 
  // 1. Due Date (ASC) - Nearest first
  // 2. Cashback Need (DESC) - Highest missing_for_min first
  // 3. Name (ASC)

  return accounts.sort((a, b) => {
    // Helper to get sortable date timestamp
    const getDueDateTs = (acc: Account) => {
      if (!acc.stats?.due_date_display) return 9999999999999 // Far future

      const [day, month] = acc.stats.due_date_display.split('/').map(Number)
      const now = new Date()
      const currentYear = now.getFullYear()
      const date = new Date(currentYear, month - 1, day)

      // If date is in the past (e.g. today is Dec 15, due date Dec 10), assume next year?
      // Actually due date usually means upcoming due date. 
      // If getStats calculated it, it's relative to current cycle end.
      // Let's assume the year is current year, or next year if month < current month?
      // Simple heuristic: if month < now.month - 1, it's next year.
      if (date.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) {
        date.setFullYear(currentYear + 1)
      }
      return date.getTime()
    }

    const dueA = getDueDateTs(a)
    const dueB = getDueDateTs(b)
    if (dueA !== dueB) return dueA - dueB

    // Cashback Need (DESC)
    const missA = a.stats?.missing_for_min ?? 0
    const missB = b.stats?.missing_for_min ?? 0
    if (missA !== missB) return missB - missA // Highest missing first

    // Name (ASC)
    return a.name.localeCompare(b.name)
  })
}

export async function getAccountDetails(id: string): Promise<Account | null> {
  if (!id || id === 'add' || id === 'new' || id === 'undefined') {
    return null
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  if (!isUuid) {
    return null
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    // Treat "no rows found" as a simple not-found instead of a hard error
    if (error?.code && error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching account details:', {
      accountId: id,
      message: error?.message ?? 'unknown error',
      code: error?.code,
    })
    return null
  }

  const row = data as AccountRow
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    currency: row.currency ?? 'VND',
    current_balance: row.current_balance ?? 0,
    credit_limit: row.credit_limit ?? 0,
    owner_id: row.owner_id ?? '',
    account_number: row.account_number ?? null,
    receiver_name: row.receiver_name ?? null,
    secured_by_account_id: row.secured_by_account_id ?? null,
    parent_account_id: row.parent_account_id ?? null,
    cashback_config: normalizeCashbackConfig(row.cashback_config),
    cashback_config_version: row.cashback_config_version ?? 1,
    is_active: typeof row.is_active === 'boolean' ? row.is_active : null,
    image_url: typeof row.image_url === 'string' ? row.image_url : null,
    total_in: row.total_in ?? 0,
    total_out: row.total_out ?? 0,
    annual_fee: row.annual_fee ?? null,
    annual_fee_waiver_target: row.annual_fee_waiver_target ?? null,
  }
}




// GroupedTransactionLines removed as lines are deprecated







async function fetchTransactions(
  accountId: string,
  limit: number,
): Promise<TransactionWithDetails[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      note,
      tag,
      status,
      created_at,
      shop_id,
      shops ( id, name, image_url ),
      amount,
      type,
      account_id,
      target_account_id,
      category_id,
      person_id,
      metadata,
      cashback_share_percent,
      cashback_share_fixed,
      cashback_mode,
      created_by,
      currency,
      accounts (name, type, image_url),
      categories (name, image_url, icon)
    `)
    .eq('account_id', accountId)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching transactions for account:', {
      accountId,
      message: error?.message ?? 'unknown error',
      code: error?.code,
    })
    return []
  }

  return (data || []).map(txn => mapUnifiedTransaction(txn, accountId))
}

export async function getAccountTransactions(
  accountId: string,
  limit = 20
): Promise<TransactionWithDetails[]> {
  return fetchTransactions(accountId, limit)
}

export async function updateAccountConfig(
  accountId: string,
  data: {
    name?: string
    credit_limit?: number | null
    cashback_config?: Json | null
    type?: Account['type']
    secured_by_account_id?: string | null
    is_active?: boolean | null
    image_url?: string | null
    annual_fee?: number | null
    annual_fee_waiver_target?: number | null
    parent_account_id?: string | null
    account_number?: string | null
    receiver_name?: string | null
  }
): Promise<boolean> {
  // Guard clause to prevent 22P02 error (invalid input syntax for type uuid)
  if (accountId === 'new') return false

  const supabase = createClient()

  const payload: any = {}

  if (typeof data.name === 'string') {
    payload.name = data.name
  }

  if (typeof data.credit_limit !== 'undefined') {
    payload.credit_limit = data.credit_limit
  }

  // MF5.4.2: Detect changes to cashback_config to increment version and trigger recompute
  if (typeof data.cashback_config !== 'undefined') {
    const { data: oldAccount } = await supabase
      .from('accounts')
      .select('cashback_config, cashback_config_version')
      .eq('id', accountId)
      .single() as any

    const oldConfigStr = JSON.stringify(oldAccount?.cashback_config)
    const newConfigStr = JSON.stringify(data.cashback_config)

    if (oldConfigStr !== newConfigStr) {
      const nextVersion = (Number(oldAccount?.cashback_config_version) || 1) + 1
      payload.cashback_config_version = nextVersion
      payload.cashback_config = data.cashback_config

      console.log(`[updateAccountConfig] Config changed for ${accountId}. Incrementing version to ${nextVersion}`)

      // Trigger recompute if version changed (async)
      // We look back 3 months by default for safety on config change
      import('@/services/cashback.service').then(m => m.recomputeAccountCashback(accountId, 3))
    }
  }

  if (typeof data.type === 'string') {
    payload.type = data.type
  }

  if ('secured_by_account_id' in data) {
    payload.secured_by_account_id = data.secured_by_account_id ?? null
  }

  if (typeof data.is_active === 'boolean') {
    payload.is_active = data.is_active
  }

  if ('annual_fee' in data) {
    payload.annual_fee = data.annual_fee ?? null
  }

  if ('annual_fee_waiver_target' in data) {
    payload.annual_fee_waiver_target = data.annual_fee_waiver_target ?? null
  }

  if ('parent_account_id' in data) {
    payload.parent_account_id = data.parent_account_id ?? null
  }

  if (typeof data.image_url === 'string') {
    payload.image_url = data.image_url
  }

  if ('account_number' in data) {
    payload.account_number = data.account_number ?? null
  }

  if ('receiver_name' in data) {
    payload.receiver_name = data.receiver_name ?? null
  }

  if (Object.keys(payload).length === 0) {
    return true
  }

  const { error } = await supabase
    .from('accounts')
    .update(payload)
    .eq('id', accountId)

  if (error) {
    console.error('Error updating account configuration:', error)
    return false
  }

  revalidatePath('/accounts')
  revalidatePath(`/accounts/${accountId}`)
  return true
}

export async function getAccountStats(accountId: string) {
  const { getAccountSpendingStats } = await import('@/services/cashback.service')
  const stats = await getAccountSpendingStats(accountId, new Date())

  if (!stats) {
    return null
  }

  const rawPotential = stats.currentSpend * stats.rate
  const cappedPotential =
    typeof stats.maxCashback === 'number'
      ? Math.min(rawPotential, stats.maxCashback)
      : rawPotential

  const potentialProfit =
    typeof stats.potentialProfit === 'number' && Number.isFinite(stats.potentialProfit)
      ? stats.potentialProfit
      : cappedPotential - stats.sharedAmount

  return {
    ...stats,
    potentialProfit,
  }
}

// getAccountTransactionDetails removed

// New implementation of recalculateBalance using single transactions table
export async function recalculateBalance(accountId: string): Promise<boolean> {
  const supabase = createClient()

  // 1. Get current balance from transactions
  // Get account type first
  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('type')
    .eq('id', accountId)
    .single() as any


  if (accError || !account) {
    console.error('Account not found for balance calc:', accountId)
    return false
  }

  // Fetch all transactions involving this account
  const { data: txns, error: txnError } = await supabase
    .from('transactions')
    .select('amount, type, category_id, account_id, target_account_id, status')
    .eq('status', 'posted')
    .is('parent_transaction_id', null)
    .or(`account_id.eq.${accountId},target_account_id.eq.${accountId}`)

  if (txnError) {
    console.error('Error fetching transactions for balance:', txnError)
    return false
  }

  const { totalIn, totalOut, currentBalance } = computeAccountTotals({
    accountId,
    accountType: account.type,
    transactions: (txns as any[] || []),
  })

  const { error: updateError } = await (supabase
    .from('accounts')
    .update as any)({
      current_balance: currentBalance,
      total_in: totalIn,
      total_out: totalOut
    })
    .eq('id', accountId)

  if (updateError) {
    console.error('Error updating account balance:', updateError)
    return false
  }

  return true
}

export async function recalculateBalanceWithClient(
  supabase: SupabaseClient,
  accountId: string,
): Promise<boolean> {
  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('type')
    .eq('id', accountId)
    .single() as any

  if (accError || !account) {
    console.error('Account not found for balance calc:', accountId)
    return false
  }

  const { data: txns, error: txnError } = await supabase
    .from('transactions')
    .select('amount, type, category_id, account_id, target_account_id, status')
    .eq('status', 'posted')
    .is('parent_transaction_id', null)
    .or(`account_id.eq.${accountId},target_account_id.eq.${accountId}`)

  if (txnError) {
    console.error('Error fetching transactions for balance:', txnError)
    return false
  }

  const { totalIn, totalOut, currentBalance } = computeAccountTotals({
    accountId,
    accountType: account.type,
    transactions: (txns as any[] || []),
  })

  const { error: updateError } = await (supabase
    .from('accounts')
    .update as any)({
      current_balance: currentBalance,
      total_in: totalIn,
      total_out: totalOut,
    })
    .eq('id', accountId)

  if (updateError) {
    console.error('Error updating account balance:', updateError)
    return false
  }

  return true
}

export async function deleteAccount(id: string): Promise<boolean> {
  const supabase = createClient()

  // Potential restriction: don't delete if it has transactions?
  // Or just void it?
  // Schema usually allows deletion if no foreign keys block it.
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting account:', error)
    return false
  }

  revalidatePath('/accounts')
  return true
}

export async function updateAccountStatus(id: string, isActive: boolean): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('accounts')
    .update({ is_active: isActive } as any)
    .eq('id', id)

  if (error) {
    console.error('Error updating account status:', error)
    return false
  }

  revalidatePath('/accounts')
  return true
}

export async function getRecentAccountsByTransactions(limit: number = 5): Promise<Account[]> {
  const supabase = createClient()

  // Query transactions, ordered by occurred_at
  const { data: txns, error } = await supabase
    .from('transactions')
    .select('account_id')
    .not('account_id', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(50)

  if (error || !txns) return []

  // Get unique account IDs in order of last transaction
  const accountIds = Array.from(new Set((txns as any[]).map(t => t.account_id).filter((id): id is string => !!id))).slice(0, limit)
  if (accountIds.length === 0) return []

  // Fetch account details
  const { data: accounts, error: aError } = await (supabase
    .from('accounts')
    .select('id, name, type, image_url')
    .in('id', accountIds) as any)

  if (aError || !accounts) return []

  // Return matched accounts in correct order
  return accountIds
    .map(id => (accounts as any[]).find(a => a.id === id))
    .filter(Boolean) as Account[]
}
