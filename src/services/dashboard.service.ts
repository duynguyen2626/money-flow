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
    avatar_url?: string | null
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
    // 2. MONTHLY SPEND (Query transaction_lines, NOT transactions)
    // ========================================================================
    const { data: expenseLines, error: spendError } = await supabase
      .from('transaction_lines')
      .select(
        `
        amount,
        type,
        categories!inner(id, name, icon, image_url, type),
        transactions!inner(occurred_at, status)
      `
      )
      .eq('type', 'debit')
      .gte('transactions.occurred_at', startOfMonth.toISOString())
      .lte('transactions.occurred_at', endOfMonth.toISOString())
      .neq('transactions.status', 'void')
      .eq('categories.type', 'expense')

    if (spendError) throw spendError

    // Exclude system categories (Transfer, Credit Payment, etc.)
    const excludedCategories = ['Transfer', 'Credit Payment', 'Loan', 'Repayment']
    const filteredExpenseLines = (expenseLines as any[])?.filter(
      (line: any) =>
        !excludedCategories.includes(line.categories?.name)
    ) || []

    const monthlySpend = filteredExpenseLines.reduce(
      (sum, line) => sum + Math.abs(line.amount || 0),
      0
    )

    // ========================================================================
    // 3. SPENDING BY CATEGORY (For Chart)
    // ========================================================================
    const categoryMap = new Map<
      string,
      {
        name: string
        value: number
        icon?: string | null
        image_url?: string | null
      }
    >()

    filteredExpenseLines.forEach((line: any) => {
      const categoryId = line.categories?.id
      const categoryName = line.categories?.name || 'Uncategorized'
      const categoryIcon = line.categories?.icon
      const categoryImageUrl = line.categories?.image_url
      const amount = Math.abs(line.amount || 0)

      if (categoryMap.has(categoryId)) {
        const existing = categoryMap.get(categoryId)!
        existing.value += amount
      } else {
        categoryMap.set(categoryId, {
          name: categoryName,
          value: amount,
          icon: categoryIcon,
          image_url: categoryImageUrl,
        })
      }
    })

    const spendingByCategory = Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    // ========================================================================
    // 4. MONTHLY INCOME
    // ========================================================================
    const { data: incomeLines, error: incomeError } = await supabase
      .from('transaction_lines')
      .select(
        `
        amount,
        type,
        categories!inner(type),
        transactions!inner(occurred_at, status)
      `
      )
      .eq('type', 'debit')
      .gte('transactions.occurred_at', startOfMonth.toISOString())
      .lte('transactions.occurred_at', endOfMonth.toISOString())
      .neq('transactions.status', 'void')
      .eq('categories.type', 'income')

    if (incomeError) throw incomeError
    const monthlyIncome =
      (incomeLines as any[])?.reduce(
        (sum, line) => sum + Math.abs(line.amount || 0),
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
      .from('profiles')
      .select('id, name, avatar_url')
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
          avatar_url: profile?.avatar_url,
        }
      }) || []

    // ========================================================================
    // 5b. OUTSTANDING BY CYCLE (Flat List)
    // ========================================================================
    const debtorAccountIds = topDebtors.map(d => d.id)
    let outstandingList: DashboardStats['outstandingByCycle'] = []

    if (debtorAccountIds.length > 0) {
      const { data: debtLines, error: debtLinesError } = await supabase
        .from('transaction_lines')
        .select('account_id, amount, type, transactions!inner(tag, occurred_at, status)')
        .in('account_id', debtorAccountIds)
        .eq('type', 'debit')
        .neq('transactions.status', 'void')
        .order('occurred_at', { ascending: false, foreignTable: 'transactions' })

      if (!debtLinesError && debtLines) {
        // Group by (AccountId + Tag)
        const mapKey = (accId: string, tag: string) => `${accId}::${tag}`
        const cycleMap = new Map<string, {
          account_id: string
          tag: string
          amount: number
          occurred_at: string | null
        }>()

        debtLines.forEach((line: any) => {
          const accountId = line.account_id
          const tagValue = line.transactions?.tag
          const occurredAt = line.transactions?.occurred_at
          const parsedDate = occurredAt ? new Date(occurredAt) : null

          // Determine label: Tag > Month/Year > "Debt"
          let label = 'Debt'
          if (tagValue) {
            label = tagValue
          } else if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
            label = format(parsedDate, 'MMM yy').toUpperCase()
          }

          const amount = Math.abs(line.amount || 0)
          const key = mapKey(accountId, label)

          if (!cycleMap.has(key)) {
            cycleMap.set(key, {
              account_id: accountId,
              tag: label,
              amount: 0,
              occurred_at: occurredAt
            })
          }
          const entry = cycleMap.get(key)!
          entry.amount += amount
          // Keep the most recent date
          if (occurredAt && entry.occurred_at && new Date(occurredAt) > new Date(entry.occurred_at)) {
            entry.occurred_at = occurredAt
          }
        })

        // Convert map to list and enrich with person info
        outstandingList = Array.from(cycleMap.values())
          .map(item => {
            const debtor = topDebtors.find(d => d.id === item.account_id)
            return {
              id: `${item.account_id}-${item.tag}`,
              person_id: debtor?.id || item.account_id,
              person_name: debtor?.name || 'Unknown',
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
    const { data: refundAccount, error: refundAccountError } = await supabase
      .from('accounts')
      .select('current_balance')
      .eq('id', SYSTEM_ACCOUNTS.PENDING_REFUNDS)
      .single()

    if (refundAccountError) {
      console.error('Error fetching refund account:', refundAccountError)
    }

    const refundBalance = (refundAccount as { current_balance: number } | null)?.current_balance || 0

    // Get top 3 pending refund transactions
    const { data: refundTransactions, error: refundTxError } = await supabase
      .from('transaction_lines')
      .select(
        `
        amount,
        transactions!inner(id, note, occurred_at, status)
      `
      )
      .eq('account_id', SYSTEM_ACCOUNTS.PENDING_REFUNDS)
      .eq('type', 'debit')
      .neq('transactions.status', 'void')
      .limit(3)

    if (refundTxError) {
      console.error('Error fetching refund transactions:', refundTxError)
    }

    const topRefundTransactions =
      (refundTransactions as any[])
        ?.sort((a: any, b: any) =>
          new Date(b.transactions.occurred_at).getTime() - new Date(a.transactions.occurred_at).getTime()
        )
        .map((line: any) => ({
          id: line.transactions.id,
          note: line.transactions.note,
          amount: Math.abs(line.amount || 0),
          occurred_at: line.transactions.occurred_at,
        })) || []

    // ========================================================================
    // 8. PENDING BATCHES (Count and Total Amount)
    // ========================================================================
    const { data: pendingBatchItems, error: batchError } = await supabase
      .from('batch_items')
      .select('amount')
      .eq('status', 'pending')

    if (batchError) throw batchError

    const pendingBatchCount = (pendingBatchItems as any[])?.length || 0
    const pendingBatchAmount =
      (pendingBatchItems as any[])?.reduce(
        (sum, item) => sum + Math.abs(item.amount || 0),
        0
      ) || 0

    // ========================================================================
    // 8b. FUNDED BATCH ITEMS (Pending confirmation, grouped by bank)
    // ========================================================================
    const { data: fundedBatches, error: fundedBatchError } = await supabase
      .from('batches')
      .select('id')
      .eq('status', 'funded')

    if (fundedBatchError) throw fundedBatchError

    const fundedBatchIds = (fundedBatches as any[])?.map(b => b.id) || []
    let fundedBatchItemsGrouped: DashboardStats['fundedBatchItems'] = []

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
        transaction_lines (
            amount,
            type,
            account_id,
            categories (name, icon, type),
            accounts (type)
        )
      `
      )
      .neq('status', 'void')
      .order('occurred_at', { ascending: false })
      .limit(5)

    if (recentTxError) throw recentTxError

    const recentTransactions =
      (recentTx as any[])?.map((tx) => {
        const lines = tx.transaction_lines || []

        // Try to find category lines (Expense/Income)
        const categoryLines = lines.filter((l: any) => l.categories)

        let amount = 0
        let type = 'transfer' // Default
        let categoryName = 'Uncategorized'
        let categoryIcon = null

        if (categoryLines.length > 0) {
          // It's an Expense or Income
          amount = categoryLines.reduce(
            (sum: number, l: any) => sum + Math.abs(l.amount || 0),
            0
          )
          const firstCat = categoryLines[0].categories
          type = firstCat.type // 'expense' or 'income'
          categoryName = firstCat.name
          categoryIcon = firstCat.icon
        } else {
          // No category -> Transfer, Debt, or Repayment
          const debitLines = lines.filter((l: any) => l.type === 'debit')
          amount = debitLines.reduce(
            (sum: number, l: any) => sum + Math.abs(l.amount || 0),
            0
          )

          // Check for Debt accounts
          const debtLine = lines.find((l: any) => l.accounts?.type === 'debt')
          if (debtLine) {
            if (debtLine.type === 'debit') {
              type = 'debt' // Lend
              categoryName = 'Lend'
            } else {
              type = 'repayment' // Repay
              categoryName = 'Repayment'
            }
          } else {
            type = 'transfer'
            categoryName = 'Transfer'
          }
        }

        return {
          id: tx.id,
          amount,
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
