'use server'

import { createClient } from '@/lib/supabase/server'
import { SYSTEM_ACCOUNTS } from '@/lib/constants'

export type DashboardStats = {
  totalAssets: number
  monthlySpend: number
  monthlyIncome: number
  debtOverview: number
  pendingBatches: {
    count: number
    totalAmount: number
  }
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
    pendingRefunds: {
      balance: 0,
      topTransactions: [],
    },
    spendingByCategory: [],
    topDebtors: [],
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
      (line: any) => !excludedCategories.includes(line.categories?.name)
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
      .order('transactions.occurred_at', { ascending: false })
      .limit(3)

    if (refundTxError) {
      console.error('Error fetching refund transactions:', refundTxError)
    }

    const topRefundTransactions =
      (refundTransactions as any[])?.map((line: any) => ({
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
      pendingRefunds: {
        balance: refundBalance,
        topTransactions: topRefundTransactions,
      },
      spendingByCategory,
      topDebtors,
      recentTransactions,
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return defaultStats
  }
}
