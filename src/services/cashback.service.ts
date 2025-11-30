'use server'

import { createClient } from '@/lib/supabase/server'
import {
  parseCashbackConfig,
  getCashbackCycleRange,
  ParsedCashbackConfig,
  CashbackTier,
} from '@/lib/cashback'
import {
  CashbackCard,
  CashbackTransaction,
  AccountSpendingStats,
} from '@/types/cashback.types'

type AccountRow = {
  id: string
  name: string
  logo_url: string | null
  cashback_config: unknown
}

type StatsAccountRow = {
  id: string
  cashback_config: unknown
}

type TransactionLineRow = {
  amount: number | null
  metadata: Record<string, unknown> | null
  transactions: {
    id: string
    occurred_at: string
    note: string | null
    shops: {
      name: string
      logo_url: string | null
    } | null
    transaction_lines: Array<{
      id: string
      type: 'debit' | 'credit'
      category_id: string | null
      categories: {
        name: string
        icon: string | null
        image_url: string | null
      } | null
      metadata: Record<string, unknown> | null
      cashback_share_percent?: number | null
      cashback_share_fixed?: number | null
      accounts?: {
        name: string
        type: string
      } | null
      profiles?: {
        name: string
      } | null
    }>
  } | null
  // For tiered cashback - we need to know the category
  category_id?: string | null
  categories?: {
    name: string
    icon: string | null
    image_url: string | null
  } | null
  cashback_share_percent?: number | null
  cashback_share_fixed?: number | null
  accounts?: {
    name: string
    type: string
  } | null
}

type CashbackMetadata = {
  cashback_share?: {
    percent?: number
    fixed?: number
    amount?: number
  }
  cashback_share_percent?: number
  cashback_share_fixed?: number
  cashback_share_amount?: number
}

async function fetchAccountLines(
  supabase: ReturnType<typeof createClient>,
  accountId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<TransactionLineRow[]> {
  const { data, error } = await supabase
    .from('transaction_lines')
    .select(`
      amount,
      metadata,
      category_id,
      categories(name, icon, image_url),
      transactions!inner(
        id,
        occurred_at,
        note,
        shops(name, logo_url),
        transaction_lines(
          id,
          type,
          category_id,
          categories(name, icon, image_url),
          metadata,
          cashback_share_percent,
          cashback_share_fixed,
          cashback_share_fixed,
          accounts(name, type),
          profiles(name)
        )
      )
    `)
    .eq('account_id', accountId)
    .eq('type', 'credit')
    .gte('transactions.occurred_at', rangeStart.toISOString())
    .lte('transactions.occurred_at', rangeEnd.toISOString())

  if (error) {
    console.error(`Failed to load cashback lines for account ${accountId}:`, error)
    return []
  }

  return (data ?? []) as unknown as TransactionLineRow[]
}

/**
 * Calculate cashback for a transaction line with tiered support
 * @param line - Transaction line with category info
 * @param config - Cashback configuration
 * @param totalSpendInCycle - Total spend in the cycle (for tier determination)
 * @returns CashbackTransaction with profit tracking
 */
function toTransaction(
  line: TransactionLineRow,
  config: ParsedCashbackConfig,
  totalSpendInCycle: number
): CashbackTransaction | null {
  if (typeof line.amount !== 'number' || !line.transactions) {
    return null
  }

  const amount = Math.abs(line.amount)
  let earnedRate = config.rate // Default rate

  // Find the "other" line (Debit) to get the true category
  // In a credit card purchase, the Credit Card line is Credit, the Expense line is Debit.
  const relatedLines = line.transactions.transaction_lines || []
  const debitLine = relatedLines.find(l => l.type === 'debit')

  // Use category from debit line if available, otherwise fallback to current line
  const categoryInfo = debitLine?.categories || line.categories
  const categoryName = categoryInfo?.name
  const categoryIcon = categoryInfo?.icon
  const categoryImageUrl = categoryInfo?.image_url

  // Tiered cashback logic
  if (config.hasTiers && config.tiers && config.tiers.length > 0) {
    // Find the applicable tier based on total spend
    const applicableTier = config.tiers
      .filter(tier => totalSpendInCycle >= tier.minSpend)
      .sort((a, b) => b.minSpend - a.minSpend)[0] // Get highest tier that qualifies

    if (applicableTier) {
      // Check if transaction has a category that matches tier categories
      const catName = categoryName?.toLowerCase() ?? ''

      // Map category names to config keys (e.g., "Insurance" -> "insurance")
      let categoryKey: string | null = null
      for (const key of Object.keys(applicableTier.categories)) {
        if (catName.includes(key.toLowerCase())) {
          categoryKey = key
          break
        }
      }

      if (categoryKey && applicableTier.categories[categoryKey]) {
        const categoryConfig = applicableTier.categories[categoryKey]
        earnedRate = categoryConfig.rate
        // Note: category-specific maxAmount can be handled if needed
      } else if (applicableTier.defaultRate !== undefined) {
        earnedRate = applicableTier.defaultRate
      }
    }
  }

  const bankBack = amount * earnedRate

  // Check for share info in BOTH the credit line and the debit line
  // Sometimes the share info is on the expense line (debit)
  const creditShareInfo = extractShareInfo(line.metadata)
  const debitShareInfo = extractShareInfo(debitLine?.metadata)

  // Prioritize explicit amount > percent > fixed
  // Merge logic: if credit line has info, use it. If not, check debit line.
  // Also check columns on the debit line (where share info is usually stored for Debt/Lending)
  const debitShareFromColumns = {
    amount: 0,
    percent: debitLine?.cashback_share_percent ?? undefined,
    fixed: debitLine?.cashback_share_fixed ?? undefined
  }

  const shareInfo = creditShareInfo.amount > 0 || creditShareInfo.percent !== undefined
    ? creditShareInfo
    : (debitShareInfo.amount > 0 || debitShareInfo.percent !== undefined ? debitShareInfo : debitShareFromColumns)

  let peopleBack = shareInfo.amount
  if (peopleBack === 0 && (shareInfo.percent !== undefined || shareInfo.fixed !== undefined)) {
    peopleBack = (amount * (shareInfo.percent ?? 0)) + (shareInfo.fixed ?? 0)
  }
  const profit = bankBack - peopleBack

  return {
    id: line.transactions.id,
    occurred_at: line.transactions.occurred_at,
    note: line.transactions.note,
    amount,
    earned: bankBack, // Keep for backward compatibility
    bankBack,
    peopleBack,
    profit,
    effectiveRate: earnedRate,
    sharePercent: shareInfo.percent,
    shareFixed: shareInfo.fixed,
    shopName: line.transactions.shops?.name,
    shopLogoUrl: line.transactions.shops?.logo_url,
    categoryName: categoryName,
    categoryIcon: categoryIcon,
    categoryImageUrl: categoryImageUrl,
    personName: debitLine?.profiles?.name ?? (debitLine?.accounts?.type === 'debt' ? debitLine.accounts.name : undefined),
  }
}

function parseMetadata(metadata: unknown): CashbackMetadata | null {
  if (!metadata) {
    return null
  }

  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata) as CashbackMetadata
    } catch {
      return null
    }
  }

  if (typeof metadata === 'object') {
    return metadata as CashbackMetadata
  }

  return null
}

function safeNumber(value: number | null | undefined, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function extractShareInfo(metadata: unknown): { amount: number; percent?: number; fixed?: number } {
  const parsed = parseMetadata(metadata)
  if (!parsed) {
    return { amount: 0 }
  }

  // 1. Check for explicit amount override
  const fromExplicit = parsed.cashback_share_amount
  if (typeof fromExplicit === 'number' && Number.isFinite(fromExplicit)) {
    return { amount: Math.max(0, fromExplicit) }
  }

  // 2. Check for nested share object
  if (parsed.cashback_share) {
    const { amount, percent, fixed } = parsed.cashback_share

    if (typeof amount === 'number' && Number.isFinite(amount)) {
      return { amount: Math.max(0, amount), percent, fixed }
    }
  }

  // 3. Check for top-level percent/fixed (legacy or flat structure)
  const percent = parsed.cashback_share_percent
  const fixed = parsed.cashback_share_fixed

  // If we have these but no calculated amount in metadata, we can't really know the amount unless we passed the transaction amount here.
  // However, usually the amount is calculated and stored in `cashback_share_amount` or `cashback_share.amount` by the trigger/service that created it.
  // If it's missing, we return 0 for amount but still return the config.

  return {
    amount: 0,
    percent: typeof percent === 'number' ? percent : undefined,
    fixed: typeof fixed === 'number' ? fixed : undefined
  }
}

function shiftReferenceDate(monthOffset: number) {
  const reference = new Date()
  reference.setMonth(reference.getMonth() + monthOffset)
  return reference
}

const cycleLabelFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
})

function formatCycleLabel(start: Date, end: Date) {
  const startLabel = cycleLabelFormatter.format(start)
  const endLabel = cycleLabelFormatter.format(end)
  return `${startLabel} - ${endLabel}`
}

export async function getCashbackProgress(
  monthOffset = 0,
  filterAccountIds?: string[]
): Promise<CashbackCard[]> {
  const supabase = createClient()

  let query = supabase
    .from('accounts')
    .select('id, name, logo_url, cashback_config')
    .eq('type', 'credit_card')
    .not('cashback_config', 'is', null)

  if (filterAccountIds && filterAccountIds.length > 0) {
    const validIds = filterAccountIds.filter(id =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    )

    if (validIds.length === 0) {
      return []
    }

    query = query.in('id', validIds)
  }

  const { data: accounts, error } = await query

  if (error) {
    console.error('Failed to fetch cashback-enabled accounts:', error)
    return []
  }

  const referenceDate = shiftReferenceDate(monthOffset)

  const rows = (accounts ?? []) as AccountRow[]

  const cards: CashbackCard[] = []

  for (const account of rows) {
    const config = parseCashbackConfig(account.cashback_config)
    const cycleRange = getCashbackCycleRange(config, new Date(referenceDate))
    const lines = await fetchAccountLines(
      supabase,
      account.id,
      cycleRange.start,
      cycleRange.end
    )

    // Calculate total spend first (needed for tier determination)
    const currentSpend = lines.reduce((sum, line) => {
      if (typeof line.amount !== 'number') return sum
      return sum + Math.abs(line.amount)
    }, 0)

    // Now map transactions with the total spend context for tiered cashback
    const transactions = lines
      .map(line => toTransaction(line, config, currentSpend))
      .filter(Boolean) as CashbackTransaction[]

    // Calculate totals from transactions
    const totalBankBack = transactions.reduce((sum, txn) => sum + txn.bankBack, 0)
    const totalPeopleBack = transactions.reduce((sum, txn) => sum + txn.peopleBack, 0)
    const totalProfit = totalBankBack - totalPeopleBack

    const maxCashback = config.maxAmount
    const cappedEarned =
      typeof maxCashback === 'number' ? Math.min(totalBankBack, maxCashback) : totalBankBack

    const minSpend = config.minSpend
    const meetsMinSpend =
      minSpend === null || currentSpend >= minSpend

    const totalEarned = meetsMinSpend ? cappedEarned : 0
    const netProfit = meetsMinSpend ? (totalEarned - totalPeopleBack) : 0

    const remainingBudget =
      typeof maxCashback === 'number'
        ? Math.max(0, maxCashback - totalEarned)
        : null

    const progress =
      typeof maxCashback === 'number' && maxCashback > 0
        ? Math.min(100, (totalEarned / maxCashback) * 100)
        : 0

    const spendTarget =
      typeof maxCashback === 'number' && config.rate > 0
        ? maxCashback / config.rate
        : null

    const minSpendRemaining =
      minSpend === null ? null : Math.max(0, minSpend - currentSpend)
    const safeCurrentSpend = safeNumber(currentSpend)
    const safeTotalEarned = safeNumber(totalEarned)
    const safeSharedAmount = safeNumber(totalPeopleBack)
    const safeNetProfit = safeNumber(netProfit)
    const safeProgress = Number.isFinite(progress) ? progress : 0
    const safeRemainingBudget =
      typeof remainingBudget === 'number' && Number.isFinite(remainingBudget)
        ? remainingBudget
        : null
    const safeSpendTarget =
      typeof spendTarget === 'number' && Number.isFinite(spendTarget)
        ? spendTarget
        : null
    const safeMinSpendRemaining =
      minSpend === null ? null : Math.max(0, (minSpend ?? 0) - safeCurrentSpend)

    transactions.sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    )

    cards.push({
      accountId: account.id,
      accountName: account.name,
      accountImageUrl: account.logo_url,
      currentSpend: safeCurrentSpend,
      totalEarned: safeTotalEarned,
      sharedAmount: safeSharedAmount,
      netProfit: safeNetProfit,
      maxCashback,
      progress: safeProgress,
      rate: config.rate,
      spendTarget: safeSpendTarget,
      cycleStart: cycleRange.start.toISOString(),
      cycleEnd: cycleRange.end.toISOString(),
      cycleLabel: formatCycleLabel(cycleRange.start, cycleRange.end),
      cycleType: config.cycleType,
      transactions,
      minSpend,
      minSpendMet: meetsMinSpend,
      minSpendRemaining: safeMinSpendRemaining,
      remainingBudget: safeRemainingBudget,
      cycleOffset: monthOffset,
    })
  }

  return cards
}

export async function getAccountSpendingStats(
  accountId: string,
  referenceDate: Date,
  categoryId?: string
): Promise<AccountSpendingStats | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('id, cashback_config')
    .eq('id', accountId)
    .single()

  if (error || !data) {
    console.error(`Failed to load cashback stats for account ${accountId}:`, error)
    return null
  }

  const statsRow = data as StatsAccountRow
  const config = parseCashbackConfig(statsRow.cashback_config)
  const cycleRange = getCashbackCycleRange(config, referenceDate ?? new Date())
  const lines = await fetchAccountLines(
    supabase,
    accountId,
    cycleRange.start,
    cycleRange.end
  )

  const currentSpend = lines.reduce((sum, line) => {
    if (typeof line.amount !== 'number') {
      return sum
    }
    return sum + Math.abs(line.amount)
  }, 0)

  const rawEarned = currentSpend * config.rate
  const maxCashback = config.maxAmount
  const cappedEarned =
    typeof maxCashback === 'number' ? Math.min(rawEarned, maxCashback) : rawEarned
  const minSpend = config.minSpend
  const meetsMinSpend = minSpend === null || currentSpend >= minSpend
  const earnedSoFar = meetsMinSpend ? cappedEarned : 0

  // --- Smart Hint Logic ---
  let potentialRate = config.rate
  let matchReason = ''
  let maxReward: number | null = null

  if (categoryId) {
    // Fetch category name to check against rules
    const { data: catData } = await supabase
      .from('categories')
      .select('name')
      .eq('id', categoryId)
      .single()

    const categoryName = (catData as { name: string } | null)?.name

    if (config.hasTiers && config.tiers && config.tiers.length > 0) {
      // Step 2: Determine Active Tier
      // Sort tiers by min_spend desc. Find first where CurrentTotalSpend >= tier.min_spend
      const applicableTier = config.tiers
        .filter(tier => currentSpend >= tier.minSpend)
        .sort((a, b) => b.minSpend - a.minSpend)[0]

      if (applicableTier) {
        matchReason = `Tier > ${(applicableTier.minSpend / 1000000).toLocaleString('vi-VN')}tr`

        // Step 3: Check Category Rule
        let foundCatRule = false
        if (categoryName) {
          const lowerCat = categoryName.toLowerCase()
          for (const key of Object.keys(applicableTier.categories)) {
            const rule = applicableTier.categories[key]

            // Check Category Name Match
            const catMatch = lowerCat.includes(key.toLowerCase())

            // Check MCC Match (if we had MCC on category, but we only have name here. 
            // Assuming categoryName might contain MCC or we need to fetch it.
            // For now, let's assume rule key matches part of category name as before)

            if (catMatch) {
              potentialRate = rule.rate
              maxReward = rule.max_reward ?? null
              matchReason = `Category "${key}" (Tier > ${(applicableTier.minSpend / 1000000).toLocaleString('vi-VN')}tr)`
              if (rule.max_reward) {
                matchReason += ` [Max: ${rule.max_reward.toLocaleString('vi-VN')}đ]`
              }
              foundCatRule = true
              break
            }
          }
        }

        if (!foundCatRule) {
          if (applicableTier.defaultRate !== undefined) {
            potentialRate = applicableTier.defaultRate
            matchReason = `Default Tier Rate (Tier > ${(applicableTier.minSpend / 1000000).toLocaleString('vi-VN')}tr)`
          }
        }
      } else {
        // No tier met yet
        matchReason = 'Base Rate (No Tier Met)'
      }
    } else {
      // No tiers configured
      matchReason = 'Base Rate'
    }
  }

  return {
    currentSpend,
    minSpend,
    maxCashback,
    rate: config.rate,
    earnedSoFar,
    potentialRate,
    matchReason,
    maxReward,
  }
}
