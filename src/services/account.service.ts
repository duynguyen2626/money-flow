'use server'

import { createClient } from '@/lib/supabase/server'
import { Account, AccountRelationships, AccountStats, TransactionLine, TransactionWithDetails, TransactionWithLineRelations } from '@/types/moneyflow.types'
import {
  parseCashbackConfig,
  getCashbackCycleRange,
  calculateBankCashback
} from '@/lib/cashback'
import { Database, Json } from '@/types/database.types'

type AccountRow = {
  id: string
  name: string
  type: Account['type']
  currency: string | null
  current_balance: number | null
  credit_limit: number | null
  owner_id: string | null
  account_number: string | null
  cashback_config: Json | null
  secured_by_account_id: string | null
  is_active: boolean | null
  logo_url: string | null
  total_in: number | null
  total_out: number | null
  parent_account_id: string | null
}

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
  // Logic: Usage = ABS(Balance) / Limit
  // Remaining = Limit - Usage (or Limit + Balance if Balance is negative)
  const usage_percent = creditLimit > 0
    ? (Math.abs(currentBalance) / creditLimit) * 100
    : 0

  const remaining_limit = creditLimit + currentBalance

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

  const config = parseCashbackConfig(account.cashback_config)
  if (!config) return baseStats

  const now = new Date()
  const { start, end } = getCashbackCycleRange(config, now)

  // Fetch transactions for stats
  // We need amount, category (for tiered), and metadata (for overrides)
  // We filter by account_id and "outflow" (expense or negative amount)
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      amount,
      type,
      categories (name),
      metadata
    `)
    .eq('account_id', account.id)
    .or('amount.lt.0,type.eq.expense')
    .gte('occurred_at', start.toISOString())
    .lte('occurred_at', end.toISOString())

  if (error) {
    console.error('Error calculating account stats:', error)
    return baseStats
  }

  const txns: any[] = data || []

  // 1. Calculate Total Eligible Spend
  const spent_this_cycle = txns.reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // 2. Calculate Earned (for Remains Cap)
  let total_earned = 0
  if (config.maxAmount) {
    // Only pay cost of calculation if maxAmount is set (needed for remains_cap)
    for (const t of txns) {
      // Safe access to category name
      const catName = t.categories && !Array.isArray(t.categories) ? t.categories.name : undefined
      // Calculate
      const res = calculateBankCashback(config, Math.abs(t.amount), catName, spent_this_cycle)
      total_earned += res.amount
    }

    if (config.maxAmount) {
      total_earned = Math.min(total_earned, config.maxAmount)
    }
  }

  // 3. Stats
  // 3. Stats
  const min_spend = config.minSpend || 0
  const missing_for_min = Math.max(0, min_spend - spent_this_cycle)
  const is_qualified = spent_this_cycle >= min_spend

  let cycle_range = `${fmtDate(start)} - ${fmtDate(end)}`

  // Smart Cycle Detection
  const isFullMonth = start.getDate() === 1 &&
    (new Date(end.getTime() + 86400000).getDate() === 1) // Next day of end is 1st

  if (config.cycleType === 'calendar_month' || isFullMonth) {
    cycle_range = "Month Cycle"
  } else {
    // Format: "Dec 25 - Jan 24"
    cycle_range = `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(start)} - ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(end)}`
  }

  // 4. Due Date Display
  let due_date_display: string | null = null
  let due_date: string | null = null

  if (config.dueDate) {
    const now = new Date()
    const currentDay = now.getDate()

    // Logic: If today.day <= dueDay, use CurrentMonth. Else use NextMonth.
    // Example: Today Dec 12, Due 15. 12 <= 15 -> Dec 15.
    let targetMonth = now.getMonth()
    let targetYear = now.getFullYear()

    if (currentDay > config.dueDate) {
      targetMonth += 1
    }

    // Create date with safe overflow handling
    const targetDate = new Date(targetYear, targetMonth, config.dueDate)

    // Format: MMM dd (e.g., Dec 15)
    due_date_display = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(targetDate)

    // ISO String for sorting
    due_date = targetDate.toISOString()
  }

  return {
    ...baseStats,
    spent_this_cycle,
    min_spend: config.minSpend,
    missing_for_min,
    is_qualified,
    cycle_range,
    due_date_display,
    due_date, // Add this field
    remains_cap: config.maxAmount ? Math.max(0, config.maxAmount - total_earned) : null,
    shared_cashback: total_earned
  }
}

export async function getAccounts(): Promise<Account[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
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
  const accounts = await Promise.all(rows.map(async (item) => {
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
        avatar_url: c.logo_url
      })),
      parent_info: parentRow ? {
        id: parentRow.id,
        name: parentRow.name,
        type: parentRow.type,
        avatar_url: parentRow.logo_url
      } : null
    }

    return {
      id: item.id,
      name: item.name,
      type: item.type,
      currency: item.currency ?? 'VND',
      current_balance: item.current_balance ?? 0,
      credit_limit: item.credit_limit ?? 0,
      owner_id: item.owner_id ?? '',
      account_number: item.account_number ?? null,
      secured_by_account_id: item.secured_by_account_id ?? null,
      cashback_config: normalizeCashbackConfig(item.cashback_config),
      is_active: typeof item.is_active === 'boolean' ? item.is_active : null,
      logo_url: typeof item.logo_url === 'string' ? item.logo_url : null,
      total_in: item.total_in ?? 0,
      total_out: item.total_out ?? 0,
      stats,
      relationships, // Added field
    }
  }))

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
  if (!id || id === 'add' || id === 'undefined') {
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
    secured_by_account_id: row.secured_by_account_id ?? null,
    cashback_config: normalizeCashbackConfig(row.cashback_config),
    is_active: typeof row.is_active === 'boolean' ? row.is_active : null,
    logo_url: typeof row.logo_url === 'string' ? row.logo_url : null,
    total_in: row.total_in ?? 0,
    total_out: row.total_out ?? 0,
  }
}

type TransactionRow = {
  id: string
  occurred_at: string
  note: string | null
  tag: string | null // Thêm trường tag
  metadata?: Json | null
  status?: 'posted' | 'pending' | 'void'
  created_at?: string
  cashback_share_percent?: number | null
  cashback_share_fixed?: number | null
  cashback_share_amount?: number | null
  shop_id?: string | null
  shops?: {
    id: string
    name?: string | null
    logo_url?: string | null
  } | null
  transaction_lines?: {
    amount: number
    type: 'debit' | 'credit'
    account_id?: string
    category_id?: string
    person_id?: string | null
    original_amount?: number | null
    cashback_share_percent?: number | null
    cashback_share_fixed?: number | null
    profiles?: { name?: string | null } | null
    accounts?: {
      name: string
    }
    categories?: {
      name: string
    }
    metadata?: Json | null
  }[]
  final_price?: number | null
}


type GroupedTransactionLines = {
  transaction_lines: {
    amount: number
    type: string
    account_id: string
  }[]
}

function extractCashbackFromLines(lines: TransactionRow['transaction_lines']): {
  cashback_share_percent?: number
  cashback_share_fixed?: number
  cashback_share_amount?: number
  original_amount?: number
} {
  for (const line of lines ?? []) {
    const meta = (line?.metadata as Record<string, unknown> | null) ?? null
    const readMetaNumber = (key: string) => {
      if (!meta) return undefined
      const value = meta[key]
      return typeof value === 'number' ? value : undefined
    }
    const percent =
      typeof line?.cashback_share_percent === 'number'
        ? line.cashback_share_percent
        : readMetaNumber('cashback_share_percent')
    const fixed =
      typeof line?.cashback_share_fixed === 'number'
        ? line.cashback_share_fixed
        : readMetaNumber('cashback_share_fixed')
    const amount = readMetaNumber('cashback_share_amount')
    const original_amount = typeof line?.original_amount === 'number' ? line.original_amount : undefined
    if (percent !== undefined || fixed !== undefined || amount !== undefined || original_amount !== undefined) {
      return { cashback_share_percent: percent, cashback_share_fixed: fixed, cashback_share_amount: amount, original_amount }
    }
  }
  return {}
}

function extractMetadataFromLines(lines: TransactionRow['transaction_lines']): Json | null {
  for (const line of lines ?? []) {
    if (line?.metadata) {
      return line.metadata
    }
  }
  return null
}

function mapTransactionRow(txn: TransactionRow, accountId?: string): TransactionWithDetails {
  const lines = txn.transaction_lines ?? []
  const cashbackFromLines = extractCashbackFromLines(lines)
  const accountLine = accountId
    ? lines.find(line => line.account_id === accountId)
    : undefined
  const displayAmount =
    typeof accountLine?.amount === 'number'
      ? accountLine.amount
      : lines.reduce((sum, line) => sum + Math.abs(line.amount), 0) / 2

  let type: 'income' | 'expense' | 'transfer' = 'transfer'
  let categoryName: string | undefined
  let accountName: string | undefined

  const categoryLine = lines.find(line => Boolean(line.category_id))
  const creditAccountLine = lines.find(
    line => line.account_id && line.type === 'credit'
  )
  const debitAccountLine = lines.find(
    line => line.account_id && line.type === 'debit'
  )

  if (categoryLine) {
    categoryName = categoryLine.categories?.name
    if (categoryLine.type === 'debit') {
      type = 'expense'
      accountName = creditAccountLine?.accounts?.name
    } else {
      type = 'income'
      accountName = debitAccountLine?.accounts?.name
    }
  } else {
    accountName = debitAccountLine?.accounts?.name ?? creditAccountLine?.accounts?.name
  }

  const counterpartLine =
    accountLine &&
    lines.find(line => line.account_id && line.account_id !== accountLine.account_id)
  if (counterpartLine?.accounts?.name) {
    accountName = counterpartLine.accounts.name
  }

  if (accountLine) {
    type = accountLine.amount >= 0 ? 'income' : 'expense'
  }

  const percentRaw = txn.cashback_share_percent ?? cashbackFromLines.cashback_share_percent
  const cashbackAmount = txn.cashback_share_amount ?? cashbackFromLines.cashback_share_amount
  const personLine = lines.find(line => line.person_id)
  const categoryId = categoryLine?.category_id ?? null

  return {
    id: txn.id,
    final_price: txn.final_price ?? null,
    occurred_at: txn.occurred_at,
    note: txn.note ?? '',
    status: txn.status ?? 'posted',
    created_at: txn.created_at ?? '',
    amount: displayAmount,
    type,
    category_name: categoryName,
    account_name: accountName,
    category_id: categoryId,
    tag: txn.tag ?? null, // Thêm trường tag
    cashback_share_percent: percentRaw ?? null,
    cashback_share_fixed: txn.cashback_share_fixed ?? cashbackFromLines.cashback_share_fixed ?? null,
    cashback_share_amount: cashbackAmount ?? null,
    original_amount: typeof accountLine?.original_amount === 'number'
      ? accountLine.original_amount
      : cashbackFromLines.original_amount,
    person_id: personLine?.person_id ?? null,
    person_name: personLine?.profiles?.name ?? null,
    persisted_cycle_tag: (txn as unknown as { persisted_cycle_tag?: string | null })?.persisted_cycle_tag ?? null,
    metadata: extractMetadataFromLines(lines),
    shop_id: txn.shop_id ?? null,
    shop_name: txn.shops?.name ?? null,
    shop_logo_url: txn.shops?.logo_url ?? null,
    transaction_lines: (txn.transaction_lines ?? []).filter(Boolean) as TransactionWithLineRelations[],
    account_id: accountId ?? '',
    target_account_id: null,
    created_by: null,
    is_installment: null,
    installment_plan_id: null,
  }
}

function mapDebtTransactionRow(txn: TransactionRow, debtAccountId: string): TransactionWithDetails {
  const lines = txn.transaction_lines ?? []
  const debtLine = lines.find(line => line.account_id === debtAccountId) ?? lines[0]
  const netAmount = debtLine?.amount ?? 0
  const isLending = (debtLine?.amount ?? 0) > 0
  const originalAmount =
    typeof debtLine?.original_amount === 'number'
      ? debtLine.original_amount
      : debtLine?.amount ?? 0
  const netAmountAbs = Math.abs(netAmount)
  const originalAmountAbs = Math.abs(originalAmount)
  const cashbackAmount = isLending
    ? Math.max(0, originalAmountAbs - netAmountAbs)
    : 0
  const personLine = lines.find(line => line.person_id)
  const rawPercent =
    typeof debtLine?.cashback_share_percent === 'number'
      ? debtLine.cashback_share_percent
      : typeof txn.cashback_share_percent === 'number'
        ? txn.cashback_share_percent
        : undefined
  const fixedBack =
    typeof debtLine?.cashback_share_fixed === 'number'
      ? debtLine.cashback_share_fixed
      : typeof txn.cashback_share_fixed === 'number'
        ? txn.cashback_share_fixed
        : undefined

  const categoryLine = lines.find(line => Boolean(line.category_id))
  const creditAccountLine = lines.find(
    line => line.account_id && line.type === 'credit'
  )
  const debitAccountLine = lines.find(
    line => line.account_id && line.type === 'debit'
  )

  const type: 'income' | 'expense' | 'transfer' =
    debtLine && debtLine.amount >= 0 ? 'income' : 'expense'

  let categoryName: string | undefined
  let accountName: string | undefined
  if (categoryLine) {
    categoryName = categoryLine.categories?.name
    accountName = creditAccountLine?.accounts?.name ?? debitAccountLine?.accounts?.name
  } else {
    accountName = debitAccountLine?.accounts?.name ?? creditAccountLine?.accounts?.name
  }
  const categoryId = categoryLine?.category_id ?? null

  return {
    id: txn.id,
    final_price: txn.final_price ?? null,
    occurred_at: txn.occurred_at,
    note: txn.note ?? '',
    status: (txn as { status?: 'posted' | 'pending' | 'void' }).status ?? 'posted',
    created_at: (txn as { created_at?: string }).created_at ?? '',
    amount: netAmount,
    original_amount: originalAmount,
    type,
    category_name: categoryName,
    account_name: accountName,
    category_id: categoryId,
    tag: txn.tag ?? null,
    cashback_share_percent: rawPercent ?? null,
    cashback_share_fixed: fixedBack ?? null,
    cashback_share_amount: cashbackAmount ?? null,
    person_id: personLine?.person_id ?? null,
    person_name: personLine?.profiles?.name ?? null,
    persisted_cycle_tag: (txn as unknown as { persisted_cycle_tag?: string | null })?.persisted_cycle_tag ?? null,
    metadata: extractMetadataFromLines(lines),
    shop_id: txn.shop_id ?? null,
    shop_name: txn.shops?.name ?? null,
    shop_logo_url: txn.shops?.logo_url ?? null,
    transaction_lines: (txn.transaction_lines ?? []).filter(Boolean) as TransactionWithLineRelations[],
    account_id: debtAccountId,
    target_account_id: null,
    created_by: null,
    is_installment: null,
    installment_plan_id: null,
  }
}

async function fetchTransactions(
  accountId: string,
  limit: number,
): Promise<TransactionWithDetails[]> {
  const supabase = createClient()

  try {
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('type')
      .eq('id', accountId)
      .single()

    if (accountError) {
      console.error('Error checking account type:', {
        accountId,
        message: accountError?.message ?? 'unknown error',
        code: accountError?.code,
      })
      return []
    }

    const lineQuery = await supabase
      .from('transaction_lines')
      .select('transaction_id')
      .eq('account_id', accountId)
      .order('id', { ascending: false })
      .limit(Math.max(limit, 50))

    let transactionIds: string[] = []
    if (lineQuery.error) {
      // Expected: transaction_lines table removed in single-table migration
      // Fallback query will handle this
      if (lineQuery.error.code !== 'PGRST205' && lineQuery.error.code !== 'PGRST200') {
        console.warn('Unexpected error fetching transaction lines (fallback will be used):', {
          accountId,
          code: lineQuery.error.code,
        })
      }
    } else {
      transactionIds = Array.from(
        new Set((lineQuery.data ?? [])
          .map(line => (line as { transaction_id?: string }).transaction_id)
          .filter((id): id is string => Boolean(id)))
      )
    }

    const accountType = (accountData as { type?: Account['type'] } | null)?.type
    const isDebtAccount = accountType === 'debt'

    if (transactionIds.length > 0) {
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          occurred_at,
          note,
          tag,
          status,
          created_at,
          shop_id,
          shops ( id, name, logo_url ),
          transaction_lines (
            amount,
            type,
            account_id,
            metadata,
            category_id,
            person_id,
            original_amount,
            cashback_share_percent,
            cashback_share_fixed,
            profiles ( name ),
            accounts (name, logo_url),
            categories (name)
          )
        `)
        .in('id', transactionIds)
        .order('occurred_at', { ascending: false })

      if (!txError && transactions) {
        const rows = transactions as TransactionRow[]
        return isDebtAccount
          ? rows.map(row => mapDebtTransactionRow(row, accountId))
          : rows.map(row => mapTransactionRow(row, accountId))
      }

      if (txError) {
        console.error('Error fetching transactions for account:', {
          accountId,
          message: txError?.message ?? 'unknown error',
          code: txError?.code,
        })
      }
    }

    // Fallback: query transactions with inner filter to avoid empty results when line query fails
    const { data: fallbackRows, error: fallbackError } = await supabase
      .from('transactions')
      .select(`
        id,
        occurred_at,
        note,
        tag,
        status,
        created_at,
        shop_id,
        shops ( id, name, logo_url ),
        transaction_lines!inner (
          amount,
          type,
          account_id,
          metadata,
          category_id,
          person_id,
          original_amount,
          cashback_share_percent,
          cashback_share_fixed,
          profiles ( name ),
          accounts (name, logo_url),
          categories (name)
        )
      `)
      .eq('transaction_lines.account_id', accountId)
      .order('occurred_at', { ascending: false })
      .limit(limit)

    if (fallbackError) {
      // Only log if it's not the expected migration error
      if (fallbackError.code !== 'PGRST200') {
        console.error('Error fetching transactions via fallback:', {
          accountId,
          message: fallbackError?.message ?? 'unknown error',
          code: fallbackError?.code,
        })
      }
      return []
    }

    const rows = (fallbackRows ?? []) as TransactionRow[]
    return isDebtAccount
      ? rows.map(row => mapDebtTransactionRow(row, accountId))
      : rows.map(row => mapTransactionRow(row, accountId))
  } catch (err) {
    console.error('Unexpected error in fetchTransactions:', err)
    return []
  }
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
    logo_url?: string | null
    annual_fee?: number | null
    parent_account_id?: string | null
  }
): Promise<boolean> {
  const supabase = createClient()

  const payload: any = {}

  if (typeof data.name === 'string') {
    payload.name = data.name
  }

  if (typeof data.credit_limit !== 'undefined') {
    payload.credit_limit = data.credit_limit
  }

  if (typeof data.cashback_config !== 'undefined') {
    payload.cashback_config = data.cashback_config
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

  if ('parent_account_id' in data) {
    payload.parent_account_id = data.parent_account_id ?? null
  }

  if (typeof data.logo_url === 'string') {
    payload.logo_url = data.logo_url
  }

  if (Object.keys(payload).length === 0) {
    return true
  }

  const { error } = await (supabase
    .from('accounts')
    .update as any)(payload)
    .eq('id', accountId)

  if (error) {
    console.error('Error updating account configuration:', error)
    return false
  }

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

export async function getAccountTransactionDetails(
  accountId: string,
  limit = 20
): Promise<GroupedTransactionLines[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transaction_lines')
    .select('transaction_id, amount, type, account_id')
    .eq('account_id', accountId)
    .order('id', { ascending: false })
    .limit(Math.max(limit, 50))

  if (error) {
    console.error('Error fetching transaction details for account:', {
      accountId,
      message: error?.message ?? 'unknown error',
      code: error?.code,
    })

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('transactions')
      .select(`
        transaction_lines!inner (
          transaction_id,
          amount,
          type,
          account_id
        )
      `)
      .eq('transaction_lines.account_id', accountId)
      .order('occurred_at', { ascending: false })
      .limit(limit)

    if (fallbackError) {
      console.error('Error fetching transaction details via fallback:', {
        accountId,
        message: fallbackError?.message ?? 'unknown error',
        code: fallbackError?.code,
      })
      return []
    }

    const groupedFallback = new Map<string, GroupedTransactionLines>()
      ; (fallbackData ?? []).forEach(row => {
        const lines = (row as { transaction_lines?: { transaction_id?: string; amount?: number; type?: string; account_id?: string }[] }).transaction_lines ?? []
        lines.forEach(line => {
          if (!line.transaction_id) return
          if (!groupedFallback.has(line.transaction_id)) {
            groupedFallback.set(line.transaction_id, { transaction_lines: [] })
          }
          groupedFallback.get(line.transaction_id)!.transaction_lines.push({
            amount: line.amount ?? 0,
            type: line.type ?? '',
            account_id: line.account_id ?? '',
          })
        })
      })
    return Array.from(groupedFallback.values())
  }

  const grouped = new Map<string, GroupedTransactionLines>()
    ; (data as any ?? []).forEach((line: any) => {
      if (!line.transaction_id) return
      if (!grouped.has(line.transaction_id)) {
        grouped.set(line.transaction_id, { transaction_lines: [] })
      }
      grouped.get(line.transaction_id)!.transaction_lines.push({
        amount: line.amount ?? 0,
        type: line.type ?? '',
        account_id: line.account_id ?? '',
      })
    })

  return Array.from(grouped.values())
}

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
    .or(`account_id.eq.${accountId},target_account_id.eq.${accountId}`)

  if (txnError) {
    console.error('Error fetching transactions for balance:', txnError)
    return false
  }

  const isCredit = account.type === 'credit_card' || account.type === 'loan'

  let netFlow = 0
  let totalIn = 0
  let totalOut = 0

  for (const t of (txns as any[] || [])) {
    const amt = Number(t.amount) || 0

    // Determine direction relative to this account
    let isIncoming = false
    let isOutgoing = false

    if (t.account_id === accountId) {
      // This account is the SOURCE
      if (t.type === 'income') {
        isIncoming = true
      } else {
        // expense, transfer (source), debt (lending?), repayment (paying)
        isOutgoing = true
      }
    } else if (t.target_account_id === accountId) {
      // This account is the TARGET (mostly transfers)
      isIncoming = true
    }

    if (isIncoming) {
      netFlow += amt
      totalIn += amt
    } else if (isOutgoing) {
      netFlow -= amt
      totalOut += amt
    }
  }

  // For Credit Cards: 
  // - Spending (Outgoing) increases Debt (Visualized as Negative Balance or Positive Owed amount?)
  // In MoneyFlow generic logic:
  // Current Balance = Total In - Total Out.
  // - Credit Card starts at 0. Spend 100 -> Balance -100. Repay 100 -> Balance 0.
  // This matches standard accounting.

  const { error: updateError } = await (supabase
    .from('accounts')
    .update as any)({
      current_balance: netFlow,
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
