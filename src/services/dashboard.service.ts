'use server'

import { createClient } from '@/lib/supabase/server'

export type DashboardStats = {
  totalAssets: number
  monthlySpend: number
  monthlyIncome: number
  debtOverview: number
  pendingBatches: number
  pendingRefunds: number
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

export async function getDashboardStats(): Promise<DashboardStats> {
  const defaultStats: DashboardStats = {
    totalAssets: 0,
    monthlySpend: 0,
    monthlyIncome: 0,
    debtOverview: 0,
    pendingBatches: 0,
    pendingRefunds: 0,
    spendingByCategory: [],
    topDebtors: [],
    recentTransactions: [],
  }

  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // If there's an error fetching the user or the user is null, return defaults
    if (userError || !user) {
      console.error('Dashboard Stats: User not authenticated or error fetching user.', userError)
      return defaultStats
    }

    // Get current month range
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // 1. Total Assets (Bank + Cash + Savings, excluding Credit Cards and Debt)
    const { data: accounts, error: assetsError } = await supabase
      .from('accounts')
      .select('type, current_balance')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .in('type', ['bank', 'cash', 'savings', 'investment', 'asset'])

    if (assetsError) throw assetsError
    const totalAssets = (accounts as any[])?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0

    // 2. Monthly Spend (Expense transactions, excluding transfers and credit payments)
    const { data: expenseLines, error: spendError } = await supabase
      .from('transaction_lines')
      .select(`
        amount,
        type,
        categories!inner(type),
        transactions!inner(occurred_at, status)
      `)
      .eq('type', 'debit')
      .gte('transactions.occurred_at', startOfMonth.toISOString())
      .lte('transactions.occurred_at', endOfMonth.toISOString())
      .neq('transactions.status', 'void')
      .eq('categories.type', 'expense')

    if (spendError) throw spendError
    const monthlySpend = (expenseLines as any[])?.reduce((sum, line) => sum + Math.abs(line.amount || 0), 0) || 0

    // 3. Monthly Income
    const { data: incomeLines, error: incomeError } = await supabase
      .from('transaction_lines')
      .select(`
        amount,
        type,
        categories!inner(type),
        transactions!inner(occurred_at, status)
      `)
      .eq('type', 'debit')
      .gte('transactions.occurred_at', startOfMonth.toISOString())
      .lte('transactions.occurred_at', endOfMonth.toISOString())
      .neq('transactions.status', 'void')
      .eq('categories.type', 'income')

    if (incomeError) throw incomeError
    const monthlyIncome = (incomeLines as any[])?.reduce((sum, line) => sum + Math.abs(line.amount || 0), 0) || 0

    // 4. Debt Overview (Positive balances in debt accounts = people owe me)
    const { data: debtAccounts, error: debtError } = await supabase
      .from('accounts')
      .select('current_balance')
      .eq('owner_id', user.id)
      .eq('type', 'debt')
      .gt('current_balance', 0)

    if (debtError) throw debtError
    const debtOverview = (debtAccounts as any[])?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0

    // 5. Spending by Category (for chart)
    const { data: categorySpending, error: categoryError } = await supabase
      .from('transaction_lines')
      .select(`
        amount,
        categories!inner(id, name, icon, image_url, type),
        transactions!inner(occurred_at, status)
      `)
      .eq('type', 'debit')
      .gte('transactions.occurred_at', startOfMonth.toISOString())
      .lte('transactions.occurred_at', endOfMonth.toISOString())
      .neq('transactions.status', 'void')
      .eq('categories.type', 'expense')

    if (categoryError) throw categoryError
    const categoryMap = new Map<string, { name: string; value: number; icon?: string | null; image_url?: string | null }>()
    categorySpending?.forEach((line: any) => {
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
    const spendingByCategory = Array.from(categoryMap.values()).sort((a, b) => b.value - a.value).slice(0, 10)

    // 6. Top Debtors (People who owe me money)
    // 6. Top Debtors (People who owe me money)
    // Fetch all debt accounts first to calculate real-time balance
    const { data: allDebtAccounts, error: allDebtError } = await supabase
      .from('accounts')
      .select('id, name, owner_id')
      .eq('type', 'debt')

    if (allDebtError) throw allDebtError

    const debtAccountIds = (allDebtAccounts as any[])?.map(a => a.id) ?? []
    const debtBalanceMap = new Map<string, number>()

    if (debtAccountIds.length > 0) {
      const { data: lines, error: linesError } = await supabase
        .from('transaction_lines')
        .select('account_id, amount, type')
        .in('account_id', debtAccountIds)

      if (linesError) {
        console.error('Error fetching lines for top debtors:', linesError)
      } else {
        (lines as any[])?.forEach((line: any) => {
          const current = debtBalanceMap.get(line.account_id) ?? 0
          const change = line.type === 'debit' ? Math.abs(line.amount) : -Math.abs(line.amount)
          debtBalanceMap.set(line.account_id, current + change)
        })
      }
    }

    // Filter and Sort
    const topDebtorAccounts = (allDebtAccounts as any[])
      .map(acc => ({
        ...acc,
        current_balance: debtBalanceMap.get(acc.id) ?? 0
      }))
      .filter(d => d.current_balance > 0)
      .sort((a, b) => b.current_balance - a.current_balance)
      .slice(0, 5)

    const debtorIds = topDebtorAccounts.map(acc => acc.owner_id).filter(Boolean)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', debtorIds)

    if (profilesError) throw profilesError
    const profileMap = new Map((profiles as any[])?.map(p => [p.id, p]) || [])
    const topDebtors = topDebtorAccounts.map(acc => {
      const profile = acc.owner_id ? profileMap.get(acc.owner_id) : null
      return {
        id: acc.id,
        name: profile?.name || acc.name,
        balance: acc.current_balance || 0,
        avatar_url: profile?.avatar_url,
      }
    })

    // 7. System Status (Pending Batches and Refunds)
    const { count: pendingBatchesCount, error: batchesError } = await supabase
      .from('batches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (batchesError) throw batchesError

    const { count: pendingRefundsCount, error: refundsError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['waiting_refund', 'pending'])

    if (refundsError) throw refundsError

    // 8. Recent Transactions
    const { data: recentTx, error: recentTxError } = await supabase
      .from('transactions')
      .select(`
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
      `)
      .neq('status', 'void')
      .order('occurred_at', { ascending: false })
      .limit(5)

    if (recentTxError) throw recentTxError

    const recentTransactions = (recentTx as any[])?.map(tx => {
      const lines = tx.transaction_lines || []

      // 1. Try to find category lines (Expense/Income)
      const categoryLines = lines.filter((l: any) => l.categories)

      let amount = 0
      let type = 'transfer' // Default
      let categoryName = 'Uncategorized'
      let categoryIcon = null

      if (categoryLines.length > 0) {
        // It's an Expense or Income
        amount = categoryLines.reduce((sum: number, l: any) => sum + Math.abs(l.amount || 0), 0)
        const firstCat = categoryLines[0].categories
        type = firstCat.type // 'expense' or 'income'
        categoryName = firstCat.name
        categoryIcon = firstCat.icon
      } else {
        // No category -> Transfer, Debt, or Repayment
        // Calculate amount from debit lines (money leaving/moving)
        const debitLines = lines.filter((l: any) => l.type === 'debit')
        amount = debitLines.reduce((sum: number, l: any) => sum + Math.abs(l.amount || 0), 0)

        // Check for Debt accounts
        const debtLine = lines.find((l: any) => l.accounts?.type === 'debt')
        if (debtLine) {
          // If Debt Account is Debited (Asset Increases) -> Lend (Debt)
          // If Debt Account is Credited (Asset Decreases) -> Repay (Repayment)
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
        category_icon: categoryIcon
      }
    }) || []

    return {
      totalAssets,
      monthlySpend,
      monthlyIncome,
      debtOverview,
      pendingBatches: pendingBatchesCount || 0,
      pendingRefunds: pendingRefundsCount || 0,
      spendingByCategory,
      topDebtors,
      recentTransactions,
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return defaultStats
  }
}
