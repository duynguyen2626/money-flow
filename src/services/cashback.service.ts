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

type TransactionRow = {
  id: string
  occurred_at: string
  note: string | null
  amount: number
  metadata: Record<string, unknown> | null
  category_id: string | null
  categories: {
    name: string
    icon: string | null
    logo_url: string | null
  } | null
  shops: {
    name: string
    logo_url: string | null
  } | null
  profiles: {
    name: string
  } | null
  // For target account name (e.g. debt account)
  target_account: {
    name: string
    type: string
  } | null
  // Optional columns if they exist or from metadata
  cashback_share_percent?: number | null
  cashback_share_fixed?: number | null
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
): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      note,
      amount,
      metadata,
      category_id,
      categories(name, icon, logo_url),
      shops(name, logo_url),
      profiles(name),
      target_account:accounts!target_account_id(name, type)
    `)
    .eq('account_id', accountId)
    .or('amount.lt.0,type.eq.expense') // Spending is negative OR explicit expense type
    .gte('occurred_at', rangeStart.toISOString())
    .lte('occurred_at', rangeEnd.toISOString())

  if (error) {
    console.error(`Failed to load cashback lines for account ${accountId}:`, error)
    return []
  }

  return (data ?? []) as unknown as TransactionRow[]
}

/**
 * Calculate cashback for a transaction line with tiered support
 * @param txn - Transaction row
 * @param config - Cashback configuration
 * @param totalSpendInCycle - Total spend in the cycle (for tier determination)
 * @returns CashbackTransaction with profit tracking
 */
function toTransaction(
  txn: TransactionRow,
  config: ParsedCashbackConfig,
  totalSpendInCycle: number
): CashbackTransaction | null {
  const rawAmount = Number(txn.amount)
  if (!Number.isFinite(rawAmount)) {
    return null
  }

  const amount = Math.abs(rawAmount)
  let earnedRate = config.rate // Default rate

  const categoryName = txn.categories?.name
  const categoryIcon = txn.categories?.icon
  const categoryLogoUrl = txn.categories?.logo_url

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

  const shareInfo = extractShareInfo(txn.metadata)

  // Fallback check for columns if they exist (though legacy)
  if (shareInfo.amount === 0 && shareInfo.percent === undefined && shareInfo.fixed === undefined) {
    if (txn.cashback_share_percent !== undefined || txn.cashback_share_fixed !== undefined) {
      shareInfo.percent = txn.cashback_share_percent ?? undefined
      shareInfo.fixed = txn.cashback_share_fixed ?? undefined
    }
  }

  let peopleBack = shareInfo.amount
  if (peopleBack === 0 && (shareInfo.percent !== undefined || shareInfo.fixed !== undefined)) {
    peopleBack = (amount * (shareInfo.percent ?? 0)) + (shareInfo.fixed ?? 0)
  }
  const profit = bankBack - peopleBack

  // Determine person name:
  // Use profile name if available (linked person)
  // Else if target account is Debt, use account name
  const personName = txn.profiles?.name ?? (txn.target_account?.type === 'debt' ? txn.target_account?.name : undefined)

  return {
    id: txn.id,
    occurred_at: txn.occurred_at,
    note: txn.note,
    amount,
    earned: bankBack, // Keep for backward compatibility
    bankBack,
    peopleBack,
    profit,
    effectiveRate: earnedRate,
    sharePercent: shareInfo.percent,
    shareFixed: shareInfo.fixed,
    shopName: txn.shops?.name,
    shopLogoUrl: txn.shops?.logo_url,
    categoryName,
    categoryIcon,
    categoryLogoUrl,
    personName,
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
    const currentSpend = lines.reduce((sum, txn) => {
      if (typeof txn.amount !== 'number') return sum
      return sum + Math.abs(txn.amount)
    }, 0)

    // Now map transactions with the total spend context for tiered cashback
    const transactions = lines
      .map(txn => toTransaction(txn, config, currentSpend))
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
      accountLogoUrl: account.logo_url,
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
      // Additional fields for frontend transparency
      min_spend_required: minSpend,
      total_spend_eligible: safeCurrentSpend,
      is_min_spend_met: meetsMinSpend,
      missing_min_spend: safeMinSpendRemaining,
      potential_earned: safeNumber(cappedEarned),
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

  const currentSpend = lines.reduce((sum, txn) => {
    if (typeof txn.amount !== 'number') {
      return sum
    }
    return sum + Math.abs(txn.amount)
  }, 0)

  // Calculate transactions with tiered logic to get peopleBack
  const transactions = lines
    .map(txn => toTransaction(txn, config, currentSpend))
    .filter(Boolean) as CashbackTransaction[]

  const totalPeopleBack = transactions.reduce((sum, txn) => sum + txn.peopleBack, 0)

  const rawEarned = currentSpend * config.rate
  const maxCashback = config.maxAmount
  const cappedEarned =
    typeof maxCashback === 'number' ? Math.min(rawEarned, maxCashback) : rawEarned
  const minSpend = config.minSpend
  const meetsMinSpend = minSpend === null || currentSpend >= minSpend
  const earnedSoFar = meetsMinSpend ? cappedEarned : 0

  // Calculate shared amount and net profit
  const sharedAmount = safeNumber(totalPeopleBack)
  const potentialProfit = safeNumber(cappedEarned - sharedAmount)
  const netProfit = meetsMinSpend ? safeNumber(earnedSoFar - sharedAmount) : 0

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
    sharedAmount,
    potentialProfit,
    netProfit,
    potentialRate,
    matchReason,
    maxReward,
  }
}


export async function recomputeCashbackCycle(cycleId: string) {
  const supabase = createClient()
  const { error } = await supabase.rpc('recompute_cashback_cycle', {
    p_cycle_id: cycleId,
  })

  if (error) {
    console.error('Failed to recompute cashback cycle:', error)
    throw error
  }
}
