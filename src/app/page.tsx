import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getDashboardStats } from '@/services/dashboard.service'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { Wallet, TrendingDown, TrendingUp, Users, AlertCircle, FileText, Clock, Plus, ArrowRightLeft, CreditCard, Banknote } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'

export const dynamic = 'force-dynamic'

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [stats, accounts, categories, people, shops] = await Promise.all([
    getDashboardStats(),
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-500">Overview</p>
        </div>
      </div>

      {/* Row 1: KPI Cards (Compact) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Net Worth */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-4 text-white">
          <div className="flex items-center gap-2 mb-1 opacity-90">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-medium">Net Worth</span>
          </div>
          <div className="text-2xl font-bold">
            {numberFormatter.format(stats.totalAssets)}
          </div>
        </div>

        {/* Monthly Spend */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-sm p-4 text-white">
          <div className="flex items-center gap-2 mb-1 opacity-90">
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs font-medium">Monthly Spend</span>
          </div>
          <div className="text-2xl font-bold">
            {numberFormatter.format(stats.monthlySpend)}
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-4 text-white">
          <div className="flex items-center gap-2 mb-1 opacity-90">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Monthly Income</span>
          </div>
          <div className="text-2xl font-bold">
            {numberFormatter.format(stats.monthlyIncome)}
          </div>
        </div>
      </div>

      {/* Row 2: Quick Actions & Spending Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Quick Actions (40%) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Spending Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick Add</h2>
            <div className="grid grid-cols-2 gap-3">
              <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                defaultType="expense"
                triggerContent={
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer w-full h-full">
                    <TrendingDown className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">Expense</span>
                  </div>
                }
              />
              <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                defaultType="income"
                triggerContent={
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors cursor-pointer w-full h-full">
                    <TrendingUp className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">Income</span>
                  </div>
                }
              />
              <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                defaultType="transfer"
                triggerContent={
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer w-full h-full">
                    <ArrowRightLeft className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">Transfer</span>
                  </div>
                }
              />
            </div>
          </div>

          {/* Debt Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Debt Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                defaultType="debt"
                triggerContent={
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors cursor-pointer w-full h-full">
                    <Banknote className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">Lend</span>
                  </div>
                }
              />
              <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                defaultType="repayment"
                triggerContent={
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer w-full h-full">
                    <CreditCard className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">Repay</span>
                  </div>
                }
              />
            </div>
          </div>
        </div>

        {/* Right: Spending Chart (60%) */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-slate-900">Spending Breakdown</h2>
          </div>
          <div className="h-[300px]">
            <DashboardCharts spendingByCategory={stats.spendingByCategory} />
          </div>
        </div>
      </div>

      {/* Row 3: Recent Activity & Debt/System */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Recent Activity (60%) - Moved down and wider */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
            </div>
            <Link href="/transactions" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>

          <div className="flex-1 space-y-3">
            {stats.recentTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No recent transactions</p>
            ) : (
              stats.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${tx.type === 'expense' ? 'bg-red-50 text-red-600' :
                      tx.type === 'income' ? 'bg-green-50 text-green-600' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                      {tx.category_icon ? (
                        <span className="text-xs">{tx.category_icon}</span>
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {tx.description || tx.category_name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {format(new Date(tx.occurred_at), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold whitespace-nowrap ${tx.type === 'expense' ? 'text-slate-900' :
                    tx.type === 'income' ? 'text-green-600' :
                      'text-slate-600'
                    }`}>
                    {tx.type === 'expense' ? '-' : '+'}{numberFormatter.format(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Debt & System (40%) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Debtors */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">Top Debtors</h2>
              </div>
              <Link href="/people" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>

            {stats.topDebtors.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No outstanding debts</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {stats.topDebtors.map((debtor) => (
                  <Link
                    key={debtor.id}
                    href={`/accounts/${debtor.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                  >
                    {debtor.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={debtor.avatar_url} alt={debtor.name} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {debtor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-900 truncate">{debtor.name}</p>
                    </div>
                    <p className="text-xs font-bold text-green-600">{numberFormatter.format(debtor.balance)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pending Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/batch"
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <FileText className="h-5 w-5" />
                </div>
                {stats.pendingBatches > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {stats.pendingBatches}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-sm font-bold text-slate-900">Batch Imports</p>
              </div>
            </Link>

            <Link
              href="/transactions"
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                {stats.pendingRefunds > 0 && (
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {stats.pendingRefunds}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-sm font-bold text-slate-900">Refunds</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
