import Link from 'next/link'
import { getDashboardStats } from '@/services/dashboard.service'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { Wallet, TrendingDown, TrendingUp, Users, AlertCircle, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

export default async function Home() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Your financial overview at a glance</p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Net Worth Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90">Net Worth</span>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">
            {numberFormatter.format(stats.totalAssets)}
          </div>
          <p className="text-xs opacity-75">Total liquid assets</p>
        </div>

        {/* Monthly Spend Card */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90">Monthly Spend</span>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">
            {numberFormatter.format(stats.monthlySpend)}
          </div>
          <p className="text-xs opacity-75">This month's expenses</p>
        </div>

        {/* Monthly Income Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90">Monthly Income</span>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">
            {numberFormatter.format(stats.monthlyIncome)}
          </div>
          <p className="text-xs opacity-75">This month's income</p>
        </div>
      </div>

      {/* Main Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Spending Chart (60%) */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Spending Breakdown</h2>
            <p className="text-sm text-slate-500">Top categories this month</p>
          </div>
          <DashboardCharts spendingByCategory={stats.spendingByCategory} />
        </div>

        {/* Right: Top Debtors (40%) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">My Debtors</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">Top 5 people who owe me</p>

          {stats.topDebtors.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No outstanding debts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.topDebtors.map((debtor) => (
                <Link
                  key={debtor.id}
                  href={`/accounts/${debtor.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {debtor.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={debtor.avatar_url}
                        alt={debtor.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                        {debtor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{debtor.name}</p>
                      <p className="text-xs text-slate-500">Debt Account</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {numberFormatter.format(debtor.balance)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Total Debt Overview */}
          {stats.debtOverview > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Total Owed to Me</span>
                <span className="text-lg font-bold text-green-600">
                  {numberFormatter.format(stats.debtOverview)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pending Batches */}
        <Link
          href="/batch"
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-l-4 border-amber-500"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Pending Batches</p>
                <p className="text-2xl font-bold text-slate-900">{stats.pendingBatches}</p>
              </div>
            </div>
            <div className="text-amber-600">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>
        </Link>

        {/* Pending Refunds */}
        <Link
          href="/transactions"
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-l-4 border-purple-500"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Pending Refunds</p>
                <p className="text-2xl font-bold text-slate-900">{stats.pendingRefunds}</p>
              </div>
            </div>
            <div className="text-purple-600">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
