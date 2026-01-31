'use server'

import { createClient } from '@/lib/supabase/server'
import { SYSTEM_ACCOUNTS } from '@/lib/constants'
import { format } from 'date-fns'

export type DashboardStats = {
  totalAssets: number
  monthlySpend: number
  monthlyIncome: number
  debtOverview: number
  pendingBatches: {
    count: number
    totalAmount: number
  }
  fundedBatchItems: Array<{
    id: string
    account_id: string
    account_name: string
    items: Array<{
      id: string
      amount: number
      receiver_name: string | null
      note: string | null
    }>
    totalAmount: number
  }>
  pendingRefunds: {
    balance: number
    topTransactions: Array<{
      id: string
      note: string | null
      amount: number
      occurred_at: string
    }>
  }
  spendingByCategory: Array<{
    name: string
    value: number
    icon?: string | null
    image_url?: string | null
  }>
  topDebtors: Array<{
    id: string
    name: string
    balance: number
    image_url?: string | null
  }>
  outstandingByCycle: Array<{
    id: string
    person_id: string
    person_name: string
    tag: string
    amount: number
    occurred_at: string | null
  }>
  recentTransactions: Array<{
    id: string
    amount: number
    description: string | null
    occurred_at: string
    category_name: string
    category_icon: string | null
    type: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'
  }>
}

/**
 * Get Dashboard Statistics with Month/Year Filter
 * @param month - Month (1-12), defaults to current month
 * @param year - Year (e.g., 2024), defaults to current year
 */
export async function getDashboardStats(
  month?: number,
  year?: number
): Promise<DashboardStats> {
  const defaultStats: DashboardStats = {
    totalAssets: 0,
    monthlySpend: 0,
    monthlyIncome: 0,
    debtOverview: 0,
    pendingBatches: {
      count: 0,
      totalAmount: 0,
    },
    fundedBatchItems: [],
    pendingRefunds: {
      balance: 0,
      topTransactions: [],
    },
    spendingByCategory: [],
    topDebtors: [],
    outstandingByCycle: [],
    recentTransactions: [],
  }

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Dashboard Stats: User not authenticated.', userError)
      return defaultStats
    }

    // Calculate date range for selected month/year
    const now = new Date()
    const selectedMonth = month ?? now.getMonth() + 1 // 1-indexed
    const selectedYear = year ?? now.getFullYear()

    const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1)
    const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)

    // ========================================================================
    // 1. TOTAL ASSETS (Net Worth)
    // ========================================================================
    const { data: accounts, error: assetsError } = await supabase
      .from('accounts')
      .select('type, current_balance')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .in('type', ['bank', 'cash', 'savings', 'investment', 'asset'])

    if (assetsError) throw assetsError
    const totalAssets =
      (accounts as any[])?.reduce(
        (sum, acc) => sum + (acc.current_balance || 0),
        0
      ) || 0

    // ========================================================================
    // 2. MONTHLY SPEND (Query transactions directly)
    // ========================================================================
    const { data: expenseTxns, error: spendError } = await supabase
      .from('transactions')
      .select('amount, category_name:categories(name)')
      .eq('type', 'expense')
      .gte('occurred_at', startOfMonth.toISOString())
      .lte('occurred_at', endOfMonth.toISOString())
      .neq('status', 'void')

    if (spendError) throw spendError

    // Exclude system categories if tracked by name (though usually Type=Expense is enough)
    // In strict single table, Transfer is type='transfer', not expense.
    // So type='expense' is already filtered.

    const monthlySpend = (expenseTxns as any[])?.reduce(
      (sum, tx) => sum + Math.abs(tx.amount || 0),
      0
    ) || 0

    // ========================================================================
    // 3. SPENDING BY CATEGORY (For Chart)
    // ========================================================================
    // We need to fetch category details for the chart
    const { data: categoryStats, error: catError } = await supabase
      .from('transactions')
      .select(`
        amount,
        categories (
          id, name, icon, type
        )
      `)
      .eq('type', 'expense')
      .gte('occurred_at', startOfMonth.toISOString())
      .lte('occurred_at', endOfMonth.toISOString())
      .neq('status', 'void')

    if (catError) throw catError

    const categoryMap = new Map<
      string,
      {
        name: string
        value: number
        icon?: string | null
        image_url?: string | null
      }
    >()

      ; (categoryStats as any[])?.forEach((tx: any) => {
        // Supabase returns array or single object for joined relation?
        // Assuming 'categories' is an object because transactions have 1 category_id
        const cat = tx.categories
        if (!cat) return

        const categoryId = cat.id
        const categoryName = cat.name || 'Uncategorized'
        const categoryIcon = cat.icon
        const categoryLogoUrl = cat.image_url ?? null
        const amount = Math.abs(tx.amount || 0)

        if (categoryMap.has(categoryId)) {
          const existing = categoryMap.get(categoryId)!
          existing.value += amount
        } else {
          categoryMap.set(categoryId, {
            name: categoryName,
            value: amount,
            icon: categoryIcon,
            image_url: categoryLogoUrl,
          })
        }
      })

    const spendingByCategory = Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    // ========================================================================
    // 4. MONTHLY INCOME
    // ========================================================================
    const { data: incomeTxns, error: incomeError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'income')
      .gte('occurred_at', startOfMonth.toISOString())
      .lte('occurred_at', endOfMonth.toISOString())
      .neq('status', 'void')

    if (incomeError) throw incomeError
    const monthlyIncome =
      (incomeTxns as any[])?.reduce(
        (sum, tx) => sum + Math.abs(tx.amount || 0),
        0
      ) || 0

    // ========================================================================
    // 5. TOP DEBTORS (No date filter - cumulative debt)
    // ========================================================================
    const { data: debtAccounts, error: debtError } = await supabase
      .from('accounts')
      .select('id, name, owner_id, current_balance')
      .eq('type', 'debt')
      .gt('current_balance', 0)
      .order('current_balance', { ascending: false })
      .limit(5)

    if (debtError) throw debtError

    // Fetch profiles for debtors
    const debtorOwnerIds =
      (debtAccounts as any[])?.map((acc) => acc.owner_id).filter(Boolean) || []
    const { data: profiles, error: profilesError } = await supabase
      .from('people')
      .select('id, name, image_url')
      .in('id', debtorOwnerIds)

    if (profilesError) throw profilesError

    const profileMap = new Map(
      (profiles as any[])?.map((p) => [p.id, p]) || []
    )

    const topDebtors =
      (debtAccounts as any[])?.map((acc) => {
        const profile = acc.owner_id ? profileMap.get(acc.owner_id) : null
        return {
          id: acc.id,
          name: profile?.name || acc.name,
          balance: acc.current_balance || 0,
          image_url: profile?.image_url,
        }
      }) || []

    // ========================================================================
    // 5b. OUTSTANDING BY CYCLE (Flat List)
    // Query debt transactions by person_id (not target_account_id)
    // ========================================================================
    let outstandingList: DashboardStats['outstandingByCycle'] = []

    // Get all active profiles with potential debt
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('people')
      .select('id, name, image_url')
      .eq('is_archived', false)

    if (!allProfilesError && allProfiles) {
      const profileIds = (allProfiles as any[]).map(p => p.id)

      // Query debt transactions by person_id
      const { data: debtTxns, error: debtTxnsError } = await supabase
        .from('transactions')
        .select('person_id, amount, tag, occurred_at')
        .eq('type', 'debt')
        .in('person_id', profileIds)
        .neq('status', 'void')
        .order('occurred_at', { ascending: false })

      if (!debtTxnsError && debtTxns) {
        // Also get repayments to calculate net debt
        const { data: repayTxns } = await supabase
          .from('transactions')
          .select('person_id, amount')
          .eq('type', 'repayment')
          .in('person_id', profileIds)
          .neq('status', 'void')

        // Calculate net repayments per person
        const repaymentByPerson = new Map<string, number>()
        if (repayTxns) {
          (repayTxns as any[]).forEach(tx => {
            if (tx.person_id) {
              const current = repaymentByPerson.get(tx.person_id) ?? 0
              repaymentByPerson.set(tx.person_id, current + Math.abs(tx.amount || 0))
            }
          })
        }

        // Group by (PersonId + Tag)
        const mapKey = (personId: string, tag: string) => `${personId}::${tag}`
        const cycleMap = new Map<string, {
          person_id: string
          tag: string
          amount: number
          occurred_at: string | null
        }>();

        (debtTxns as any[]).forEach((tx: any) => {
          const personId = tx.person_id
          if (!personId) return

          const tagValue = tx.tag
          const occurredAt = tx.occurred_at
          const parsedDate = occurredAt ? new Date(occurredAt) : null

          // Determine label: Tag > Month/Year > "Debt"
          let label = 'Debt'
          if (tagValue) {
            label = tagValue
          } else if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
            label = format(parsedDate, 'MMM yy').toUpperCase()
          }

          const amount = Math.abs(tx.amount || 0)
          const key = mapKey(personId, label)

          if (!cycleMap.has(key)) {
            cycleMap.set(key, {
              person_id: personId,
              tag: label,
              amount: 0,
              occurred_at: occurredAt
            })
          }
          const entry = cycleMap.get(key)!
          entry.amount += amount
          if (occurredAt && entry.occurred_at && new Date(occurredAt) > new Date(entry.occurred_at)) {
            entry.occurred_at = occurredAt
          }
        })

        // Convert map to list and enrich with person info
        const profileMap = new Map((allProfiles as any[]).map(p => [p.id, p]))

        outstandingList = Array.from(cycleMap.values())
          .filter(item => item.amount > 0) // Only show actual debt
          .map((item) => {
            const profile = profileMap.get(item.person_id)
            return {
              id: `${item.person_id}-${item.tag}`,
              person_id: item.person_id,
              person_name: profile?.name || 'Unknown',
              tag: item.tag,
              amount: item.amount,
              occurred_at: item.occurred_at
            }
          })
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5)
      }
    }

    // ========================================================================
    // 6. DEBT OVERVIEW (Total positive debt balances)
    // ========================================================================
    const debtOverview = topDebtors.reduce((sum, d) => sum + d.balance, 0)

    // ========================================================================
    // 7. PENDING REFUNDS (System Account Balance)
    // ========================================================================
    // Use account current_balance directly, or fetch from transactions
    const { data: refundAccount, error: refundAccountError } = await supabase
      .from('accounts')
      .select('current_balance')
      .eq('id', SYSTEM_ACCOUNTS.PENDING_REFUNDS)
      .single()

    if (refundAccountError) {
      console.error('Error fetching refund account:', refundAccountError)
    }

    const refundBalance = (refundAccount as { current_balance: number } | null)?.current_balance || 0

    // Get top 3 pending refund transactions (Transactions targeting this account?)
    // Refund flow: Account -> Refund System Account.
    // So target_account_id = PENDING_REFUNDS.

    const { data: refundTransactions, error: refundTxError } = await supabase
      .from('transactions')
      .select('id, note, amount, occurred_at')
      .eq('target_account_id', SYSTEM_ACCOUNTS.PENDING_REFUNDS)
      .neq('status', 'void')
      .order('occurred_at', { ascending: false })
      .limit(3)

    if (refundTxError) {
      console.error('Error fetching refund transactions:', refundTxError)
    }

    const topRefundTransactions =
      (refundTransactions as any[])?.map((tx: any) => ({
        id: tx.id,
        note: tx.note,
        amount: Math.abs(tx.amount || 0),
        occurred_at: tx.occurred_at,
      })) || []

    // ========================================================================
    // 8. PENDING BATCHES (Count and Total Amount)
    // ========================================================================
    // WRAPPED IN SAFE BLOCK since batch_items might be missing
    let pendingBatchCount = 0
    let pendingBatchAmount = 0
    let fundedBatchItemsGrouped: DashboardStats['fundedBatchItems'] = []

    try {
      const { data: pendingBatchItems, error: batchError } = await supabase
        .from('batch_items')
        .select('amount')
        .eq('status', 'pending')

      if (!batchError) {
        pendingBatchCount = (pendingBatchItems as any[])?.length || 0
        pendingBatchAmount =
          (pendingBatchItems as any[])?.reduce(
            (sum, item) => sum + Math.abs(item.amount || 0),
            0
          ) || 0
      }

      // ========================================================================
      // 8b. FUNDED BATCH ITEMS (Pending confirmation, grouped by bank)
      // ========================================================================
      const { data: fundedBatches, error: fundedBatchError } = await supabase
        .from('batches')
        .select('id')
        .eq('status', 'funded')

      if (!fundedBatchError) {
        const fundedBatchIds = (fundedBatches as any[])?.map(b => b.id) || []
        if (fundedBatchIds.length > 0) {
          const { data: fundedItems, error: fundedItemsError } = await supabase
            .from('batch_items')
            .select('id, amount, receiver_name, note, target_account_id, accounts!batch_items_target_account_id_fkey(name)')
            .in('batch_id', fundedBatchIds)
            .eq('status', 'pending')
            .order('target_account_id')

          if (!fundedItemsError && fundedItems) {
            // Group by target_account_id
            const groupedMap = new Map<string, any>()

            for (const item of fundedItems as any[]) {
              const accountId = item.target_account_id
              const accountName = item.accounts?.name || 'Unknown Account'

              if (!groupedMap.has(accountId)) {
                groupedMap.set(accountId, {
                  id: accountId,
                  account_id: accountId,
                  account_name: accountName,
                  items: [],
                  totalAmount: 0
                })
              }

              const group = groupedMap.get(accountId)!
              group.items.push({
                id: item.id,
                amount: item.amount,
                receiver_name: item.receiver_name,
                note: item.note
              })
              group.totalAmount += Math.abs(item.amount || 0)
            }

            fundedBatchItemsGrouped = Array.from(groupedMap.values())
          }
        }
      }
    } catch (batchErr) {
      console.warn('Dashboard: Batch items fetch failed (likely table missing), skipping batch stats.', batchErr)
    }

    // ========================================================================
    // 9. RECENT TRANSACTIONS (Last 5)
    // ========================================================================
    const { data: recentTx, error: recentTxError } = await supabase
      .from('transactions')
      .select(
        `
        id,
        note,
        occurred_at,
        status,
        amount,
        type,
        categories (name, icon, type)
        `
      )
      .neq('status', 'void')
      .order('occurred_at', { ascending: false })
      .limit(5)

    if (recentTxError) throw recentTxError

    const recentTransactions = (recentTx as any[])?.map((tx) => {
      let categoryName = 'Uncategorized'
      let categoryIcon = null
      const type = tx.type

      if (tx.categories) {
        categoryName = tx.categories.name
        categoryIcon = tx.categories.icon
      }

      // Improve display logic
      if (type === 'debt') categoryName = 'Lend'
      if (type === 'repayment') categoryName = 'Repayment'
      if (type === 'transfer') categoryName = 'Transfer'

      return {
        id: tx.id,
        amount: Math.abs(tx.amount || 0),
        description: tx.note,
        occurred_at: tx.occurred_at,
        type: type as 'income' | 'expense' | 'transfer' | 'debt' | 'repayment',
        category_name: categoryName,
        category_icon: categoryIcon,
      }
    }) || []

    // ========================================================================
    // RETURN COMPLETE STATS
    // ========================================================================
    return {
      totalAssets,
      monthlySpend,
      monthlyIncome,
      debtOverview,
      pendingBatches: {
        count: pendingBatchCount,
        totalAmount: pendingBatchAmount,
      },
      fundedBatchItems: fundedBatchItemsGrouped,
      pendingRefunds: {
        balance: refundBalance,
        topTransactions: topRefundTransactions,
      },
      spendingByCategory,
      topDebtors,
      outstandingByCycle: outstandingList,
      recentTransactions,
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return defaultStats
  }
}
