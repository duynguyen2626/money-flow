'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardStats } from '@/services/dashboard.service'
import { Users, AlertCircle, FileText, Clock, Plus, Wallet, TrendingDown, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Select } from '@/components/ui/select'

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

const COLORS = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
    '#6366f1', // indigo
]

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2024, i, 1), 'MMMM'),
}))

const YEAR_OPTIONS = [2024, 2025, 2026].map((y) => ({
    value: y.toString(),
    label: y.toString(),
}))

interface DashboardContentProps {
    stats: DashboardStats
    accounts: any[]
    categories: any[]
    people: any[]
    shops: any[]
    selectedMonth: number
    selectedYear: number
}

export function DashboardContent({
    stats,
    accounts,
    categories,
    people,
    shops,
    selectedMonth,
    selectedYear,
}: DashboardContentProps) {
    const router = useRouter()

    const handleMonthChange = (month: string | undefined) => {
        if (month) {
            router.push(`/?month=${month}&year=${selectedYear}`)
        }
    }

    const handleYearChange = (year: string | undefined) => {
        if (year) {
            router.push(`/?month=${selectedMonth}&year=${year}`)
        }
    }

    const chartData = stats.spendingByCategory.map((cat, index) => ({
        name: cat.name,
        value: cat.value,
        fill: COLORS[index % COLORS.length],
    }))

    return (
        <div className="max-w-screen-2xl mx-auto space-y-4 p-4">
            {/* Header with Filter */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-xs text-slate-500">Financial Overview</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        items={MONTH_OPTIONS}
                        value={selectedMonth.toString()}
                        onValueChange={handleMonthChange}
                        placeholder="Month"
                        className="w-[120px] h-9"
                    />
                    <Select
                        items={YEAR_OPTIONS}
                        value={selectedYear.toString()}
                        onValueChange={handleYearChange}
                        placeholder="Year"
                        className="w-[100px] h-9"
                    />
                </div>
            </div>

            {/* Row 1: Debt & Analytics (Grid 12 cols) */}
            <div className="grid grid-cols-12 gap-4">
                {/* Left: Debt Book (col-span-4) */}
                <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-500" />
                            <h2 className="text-sm font-semibold text-slate-900">Sổ Nợ (Debt Book)</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <AddTransactionDialog
                                accounts={accounts}
                                categories={categories}
                                people={people}
                                shops={shops}
                                defaultType="debt"
                                buttonClassName="flex items-center gap-1 text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                                triggerContent={
                                    <>
                                        <Plus className="h-3 w-3" />
                                        Lend
                                    </>
                                }
                            />
                            <Link href="/people" className="text-xs text-slate-500 hover:text-slate-900">
                                View all
                            </Link>
                        </div>
                    </div>

                    {stats.topDebtors.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8">No outstanding debts</p>
                    ) : (
                        <div className="space-y-2">
                            {stats.topDebtors.map((debtor) => (
                                <Link
                                    key={debtor.id}
                                    href="/people"
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        {debtor.avatar_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={debtor.avatar_url}
                                                alt={debtor.name}
                                                className="h-8 w-8 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {debtor.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <p className="text-sm font-medium text-slate-900">{debtor.name}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded">
                                        Wait: {numberFormatter.format(debtor.balance)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Monthly Spending (col-span-8) */}
                <div className="col-span-12 lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-slate-900">
                            Chi tiêu tháng {selectedMonth}/{selectedYear}
                        </h2>
                        <div className="flex items-center gap-1">
                            <AddTransactionDialog
                                accounts={accounts}
                                categories={categories}
                                people={people}
                                shops={shops}
                                defaultType="expense"
                                buttonClassName="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-medium"
                                triggerContent={
                                    <>
                                        <Plus className="h-3 w-3" />
                                        Exp
                                    </>
                                }
                            />
                            <AddTransactionDialog
                                accounts={accounts}
                                categories={categories}
                                people={people}
                                shops={shops}
                                defaultType="income"
                                buttonClassName="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors text-xs font-medium"
                                triggerContent={
                                    <>
                                        <Plus className="h-3 w-3" />
                                        Inc
                                    </>
                                }
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Sub-Col 1: Donut Chart */}
                        <div className="flex flex-col">
                            <div className="h-[250px]">
                                {chartData.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-xs text-slate-400">
                                        No spending data
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number) => numberFormatter.format(value)}
                                                contentStyle={{
                                                    fontSize: '12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e2e8f0',
                                                }}
                                            />
                                            <Legend
                                                layout="vertical"
                                                align="right"
                                                verticalAlign="middle"
                                                iconSize={8}
                                                wrapperStyle={{ fontSize: '11px', paddingLeft: '10px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Sub-Col 2: Recent Transactions */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-3 w-3 text-slate-500" />
                                <h3 className="text-xs font-semibold text-slate-700">Recent Activity</h3>
                            </div>
                            <div className="space-y-2 overflow-y-auto max-h-[220px] custom-scrollbar pr-1">
                                {stats.recentTransactions.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-4">No recent transactions</p>
                                ) : (
                                    stats.recentTransactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div
                                                    className={`flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0 ${tx.type === 'expense'
                                                            ? 'bg-red-50 text-red-600'
                                                            : tx.type === 'income'
                                                                ? 'bg-green-50 text-green-600'
                                                                : 'bg-slate-50 text-slate-600'
                                                        }`}
                                                >
                                                    {tx.category_icon ? (
                                                        <span className="text-[10px]">{tx.category_icon}</span>
                                                    ) : (
                                                        <FileText className="h-3 w-3" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-slate-900 truncate">
                                                        {tx.description || tx.category_name}
                                                    </p>
                                                    <p className="text-[9px] text-slate-500">
                                                        {format(new Date(tx.occurred_at), 'MMM d, HH:mm')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div
                                                className={`text-xs font-semibold whitespace-nowrap ${tx.type === 'expense'
                                                        ? 'text-slate-900'
                                                        : tx.type === 'income'
                                                            ? 'text-green-600'
                                                            : 'text-slate-600'
                                                    }`}
                                            >
                                                {tx.type === 'expense' ? '-' : '+'}
                                                {numberFormatter.format(tx.amount)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: System Health (Grid 2 cols) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Pending Refunds */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-purple-500" />
                            <h2 className="text-sm font-semibold text-slate-900">Chờ hoàn tiền (Refunds)</h2>
                        </div>
                        <Link href="/transactions" className="text-xs text-slate-500 hover:text-slate-900">
                            View all
                        </Link>
                    </div>

                    <div className="mb-3">
                        <p className="text-2xl font-bold text-purple-600">
                            {numberFormatter.format(stats.pendingRefunds.balance)}
                        </p>
                        <p className="text-xs text-slate-500">Current Balance</p>
                    </div>

                    {stats.pendingRefunds.topTransactions.length > 0 && (
                        <div className="space-y-2">
                            {stats.pendingRefunds.topTransactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-purple-50"
                                >
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-slate-900 truncate">
                                            {tx.note || 'Pending Refund'}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            {format(new Date(tx.occurred_at), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold text-purple-700 whitespace-nowrap ml-2">
                                        {numberFormatter.format(tx.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Card 2: Pending Batches */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-amber-500" />
                            <h2 className="text-sm font-semibold text-slate-900">Chờ duyệt (Batches)</h2>
                        </div>
                        <Link href="/batch" className="text-xs text-slate-500 hover:text-slate-900">
                            View all
                        </Link>
                    </div>

                    <div className="mb-3">
                        <p className="text-2xl font-bold text-amber-600">
                            {numberFormatter.format(stats.pendingBatches.totalAmount)}
                        </p>
                        <p className="text-xs text-slate-500">
                            {stats.pendingBatches.count} lệnh đang chờ xác nhận
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-blue-50 rounded-lg p-2">
                            <div className="flex items-center gap-1 mb-1">
                                <Wallet className="h-3 w-3 text-blue-600" />
                                <p className="text-[10px] text-blue-700 font-medium">Net Worth</p>
                            </div>
                            <p className="text-sm font-bold text-blue-900">
                                {numberFormatter.format(stats.totalAssets)}
                            </p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2">
                            <div className="flex items-center gap-1 mb-1">
                                <TrendingDown className="h-3 w-3 text-red-600" />
                                <p className="text-[10px] text-red-700 font-medium">Spend</p>
                            </div>
                            <p className="text-sm font-bold text-red-900">
                                {numberFormatter.format(stats.monthlySpend)}
                            </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                            <div className="flex items-center gap-1 mb-1">
                                <TrendingUp className="h-3 w-3 text-green-600" />
                                <p className="text-[10px] text-green-700 font-medium">Income</p>
                            </div>
                            <p className="text-sm font-bold text-green-900">
                                {numberFormatter.format(stats.monthlyIncome)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
