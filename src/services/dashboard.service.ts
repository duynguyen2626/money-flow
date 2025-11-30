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
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('Not authenticated')
    }

    // Get current month range
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // 1. Total Assets (Bank + Cash + Savings, excluding Credit Cards and Debt)
    const { data: accounts } = await supabase
        .from('accounts')
        .select('type, current_balance')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .in('type', ['bank', 'cash', 'savings', 'investment', 'asset'])

    const totalAssets = (accounts as any[])?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0

    // 2. Monthly Spend (Expense transactions, excluding transfers and credit payments)
    const { data: expenseLines } = await supabase
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

    const monthlySpend = (expenseLines as any[])?.reduce((sum, line) => sum + Math.abs(line.amount || 0), 0) || 0

    // 3. Monthly Income
    const { data: incomeLines } = await supabase
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

    const monthlyIncome = (incomeLines as any[])?.reduce((sum, line) => sum + Math.abs(line.amount || 0), 0) || 0

    // 4. Debt Overview (Positive balances in debt accounts = people owe me)
    const { data: debtAccounts } = await supabase
        .from('accounts')
        .select('current_balance')
        .eq('owner_id', user.id)
        .eq('type', 'debt')
        .gt('current_balance', 0)

    const debtOverview = (debtAccounts as any[])?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0

    // 5. Spending by Category (for chart)
    const { data: categorySpending } = await supabase
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

    const spendingByCategory = Array.from(categoryMap.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 10) // Top 10 categories

    // 6. Top Debtors (People who owe me money)
    const { data: debtorAccounts } = await supabase
        .from('accounts')
        .select(`
      id,
      name,
      current_balance,
      owner_id
    `)
        .eq('type', 'debt')
        .gt('current_balance', 0)
        .order('current_balance', { ascending: false })
        .limit(5)

    // Get profile info for debtors
    const debtorIds = (debtorAccounts as any[])?.map(acc => acc.owner_id).filter(Boolean) || []
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', debtorIds)

    const profileMap = new Map((profiles as any[])?.map(p => [p.id, p]) || [])

    const topDebtors = (debtorAccounts as any[])?.map(acc => {
        const profile = acc.owner_id ? profileMap.get(acc.owner_id) : null
        return {
            id: acc.id,
            name: profile?.name || acc.name,
            balance: acc.current_balance || 0,
            avatar_url: profile?.avatar_url,
        }
    }) || []

    // 7. System Status (Pending Batches and Refunds)
    const { count: pendingBatchesCount } = await supabase
        .from('batches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

    const { count: pendingRefundsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['waiting_refund', 'pending'])

    return {
        totalAssets,
        monthlySpend,
        monthlyIncome,
        debtOverview,
        pendingBatches: pendingBatchesCount || 0,
        pendingRefunds: pendingRefundsCount || 0,
        spendingByCategory,
        topDebtors,
    }
}
