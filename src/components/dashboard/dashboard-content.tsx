'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { DashboardStats } from '@/services/dashboard.service'
import { Users, Clock, Wallet, TrendingDown, TrendingUp, AlertCircle, FileText, Plus, Check } from 'lucide-react'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Select } from '@/components/ui/select'
import { Person } from '@/types/moneyflow.types'
import { useState, useTransition, useEffect } from 'react'
import { confirmBatchItemAction } from '@/actions/batch-actions'
import { confirmRefundMoneyReceived } from '@/actions/refund-actions'
import { toast } from 'sonner'

const numberFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
})

const recentTxTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})

const refundDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  label: format(new Date(2024, i, 1), 'MMMM'),
}))

const YEAR_OPTIONS = [2024, 2025, 2026].map((y) => ({
  value: y.toString(),
  label: y.toString(),
}))

const CHART_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#6366f1',
]

const MONTH_KEY = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
}

const parseCycleLabel = (label?: string | null) => {
  if (!label) return null
  const cleaned = label.trim().toUpperCase()
  const monthCode = cleaned.slice(0, 3)
  const yearPart = cleaned.slice(cleaned.length - 2)
  const month = MONTH_KEY[monthCode as keyof typeof MONTH_KEY]
  const year = Number(`20${yearPart}`)
  if (!month || Number.isNaN(year)) {
    return null
  }
  return { month, year }
}

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
  const [confirmingBatchItem, setConfirmingBatchItem] = useState<string | null>(null)
  const [confirmingRefund, setConfirmingRefund] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

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

  const handleConfirmBatchItem = async (itemId: string) => {
    setConfirmingBatchItem(itemId)
    startTransition(async () => {
      try {
        const result = await confirmBatchItemAction(itemId)
        if (result.success) {
          toast.success('Batch item confirmed successfully')
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to confirm batch item')
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to confirm batch item')
      } finally {
        setConfirmingBatchItem(null)
      }
    })
  }

  const handleConfirmRefund = async (transactionId: string, accountId: string) => {
    setConfirmingRefund(transactionId)
    startTransition(async () => {
      try {
        const result = await confirmRefundMoneyReceived(transactionId, accountId)
        if (result.success) {
          toast.success('Refund confirmed successfully')
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to confirm refund')
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to confirm refund')
      } finally {
        setConfirmingRefund(null)
      }
    })
  }

  const chartData = stats.spendingByCategory.map((cat, index) => ({
    name: cat.name,
    value: cat.value,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }))

  const peopleByName = new Map(
    people
      .filter(person => person.name)
      .map(person => [person.name?.toLowerCase() ?? '', person])
  )

  const categorizeDebtors = stats.topDebtors.reduce(
    (acc, debtor) => {
      const key = debtor.name?.toLowerCase() ?? ''
      const person = peopleByName.get(key)
      const tag = person?.monthly_debts?.[0]
      const label = tag?.tagLabel ?? tag?.tag ?? null
      const cycle = parseCycleLabel(label)
      const isCurrentCycle = cycle && cycle.month === selectedMonth && cycle.year === selectedYear
      const target = isCurrentCycle ? acc.current : acc.others
      target.push({ debtor, person, cycleLabel: label })
      return acc
    },
    { current: [] as Array<{ debtor: typeof stats.topDebtors[number]; person?: Person; cycleLabel: string | null }>, others: [] as Array<{ debtor: typeof stats.topDebtors[number]; person?: Person; cycleLabel: string | null }> }
  )

  const metricCards = [
    {
      label: 'Net Worth',
      value: stats.totalAssets,
      icon: Wallet,
      iconBg: 'bg-blue-50 text-blue-600',
      subLabel: 'Total assets',
    },
    {
      label: 'Monthly Spend',
      value: stats.monthlySpend,
      icon: TrendingDown,
      iconBg: 'bg-rose-50 text-rose-600',
      subLabel: 'This month',
    },
    {
      label: 'Monthly Income',
      value: stats.monthlyIncome,
      icon: TrendingUp,
      iconBg: 'bg-emerald-50 text-emerald-600',
      subLabel: 'This month',
    },
    {
      label: 'Debt Overview',
      value: stats.debtOverview,
      icon: Users,
      iconBg: 'bg-slate-50 text-slate-600',
      subLabel: 'Top debt totals',
    },
  ]

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-screen-2xl mx-auto space-y-5 p-4">


        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metricCards.map(card => (
            <div
              key={card.label}
              className="flex min-h-[96px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.iconBg}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">{card.label}</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {numberFormatter.format(card.value)}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">{card.subLabel}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-slate-500">My Spend</p>
                  <h2 className="text-lg font-semibold text-slate-900">Personal Expenses</h2>
                </div>
                <Link href="/people" className="text-xs font-semibold text-blue-600">
                  View debts
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  items={MONTH_OPTIONS}
                  value={selectedMonth.toString()}
                  onValueChange={handleMonthChange}
                  placeholder="Month"
                  className="w-[120px] h-8 text-xs"
                />
                <Select
                  items={YEAR_OPTIONS}
                  value={selectedYear.toString()}
                  onValueChange={handleYearChange}
                  placeholder="Year"
                  className="w-[80px] h-8 text-xs"
                />
              </div>
            </div>
            <div className="mt-4 h-[300px] w-full min-w-0" style={{ height: 300, width: '100%' }}>
              {!isMounted ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  Loading chart...
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No spending data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => value !== undefined ? numberFormatter.format(value) : ''}
                      contentStyle={{
                        fontSize: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                      }}
                    />
                    <Legend
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500">Top Debtors</p>
                <h2 className="text-lg font-semibold text-slate-900">Outstanding by cycle</h2>
              </div>
              <Link href="/people" className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {stats.outstandingByCycle.length > 0 ? (
                stats.outstandingByCycle.map(item => {
                  // Find person to pass to AddTransactionDialog
                  const person = people.find(p => p.name === item.person_name)

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-600 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{item.person_name}</p>
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                          {item.tag}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-900">{numberFormatter.format(item.amount)}</p>
                        {person?.debt_account_id && (
                          <AddTransactionDialog
                            accounts={accounts}
                            categories={categories}
                            people={[person]}
                            shops={shops}
                            defaultType="repayment"
                            defaultDebtAccountId={person.debt_account_id}
                            defaultAmount={item.amount}
                            defaultTag={item.tag}
                            buttonClassName="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                            triggerContent={<Check className="h-4 w-4" />}
                          />
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-slate-400">No outstanding debts.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500">Recent Activity</p>
                <h2 className="text-lg font-semibold text-slate-900">Latest transactions</h2>
              </div>
              <Link href="/transactions" className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-4 space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {stats.recentTransactions.length === 0 ? (
                <p className="text-xs text-slate-400">No transactions yet.</p>
              ) : (
                stats.recentTransactions.map(tx => {
                  const isExpense = tx.type === 'expense' || tx.type === 'debt'
                  const iconBg =
                    tx.type === 'income'
                      ? 'bg-emerald-50 text-emerald-600'
                      : tx.type === 'expense'
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-slate-100 text-slate-600'

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-2xl text-[11px] ${iconBg}`}>
                          {tx.category_icon || <FileText className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {tx.description || tx.category_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {recentTxTimeFormatter.format(new Date(tx.occurred_at))}
                          </p>
                        </div>
                      </div>
                      <div className={`font-semibold ${isExpense ? 'text-slate-900' : 'text-emerald-600'}`}>
                        {isExpense ? '-' : '+'}
                        {numberFormatter.format(tx.amount)}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-purple-50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500">Refunds (Wait)</p>
                <h2 className="text-lg font-semibold text-purple-900">Pending refunds</h2>
              </div>
              <Link href="/refunds" className="text-xs font-semibold text-purple-600 hover:underline">
                View
              </Link>
            </div>
            <p className="mt-4 text-3xl font-semibold text-purple-700">
              {numberFormatter.format(stats.pendingRefunds.balance)}
            </p>
            <div className="mt-4 space-y-2 text-[11px] text-purple-800">
              {stats.pendingRefunds.topTransactions.length === 0 ? (
                <p className="text-purple-600">No pending refund lines.</p>
              ) : (
                <>
                  {stats.pendingRefunds.topTransactions.slice(0, 3).map(tx => {
                    // Find a suitable bank account to receive the refund (default to first bank account)
                    const defaultAccount = accounts.find(a => a.type === 'bank' || a.type === 'ewallet')

                    return (
                      <div key={tx.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white/90 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{tx.note || 'Pending refund'}</p>
                          <p className="text-[10px] text-purple-500">
                            {refundDateFormatter.format(new Date(tx.occurred_at))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-purple-700 whitespace-nowrap">
                            {numberFormatter.format(tx.amount)}
                          </span>
                          {defaultAccount && (
                            <button
                              onClick={() => handleConfirmRefund(tx.id, defaultAccount.id)}
                              disabled={confirmingRefund === tx.id || isPending}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-purple-300 bg-white text-purple-600 transition hover:border-purple-400 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Confirm money received"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {stats.pendingRefunds.topTransactions.length > 3 && (
                    <Link href="/refunds" className="block text-center text-[10px] font-semibold text-purple-600 hover:underline">
                      View {stats.pendingRefunds.topTransactions.length - 3} more...
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500">Batches (Wait)</p>
                <h2 className="text-lg font-semibold text-slate-900">Pending batches</h2>
              </div>
              <Link href="/batch" className="text-xs font-semibold text-slate-600 hover:underline">
                View
              </Link>
            </div>
            <p className="mt-4 text-3xl font-semibold text-amber-600">
              {numberFormatter.format(stats.pendingBatches.totalAmount)}
            </p>
            <p className="text-xs text-slate-500">Waiting items: {stats.pendingBatches.count}</p>

            {stats.fundedBatchItems.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-semibold text-slate-700">Funded - Awaiting Confirmation:</p>
                {stats.fundedBatchItems.slice(0, 3).map(group => (
                  <div key={group.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-amber-900">{group.account_name}</p>
                      <p className="text-xs font-semibold text-amber-700">
                        {numberFormatter.format(group.totalAmount)}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {group.items.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-2 py-1.5 text-[10px]">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {item.receiver_name || 'Unknown'}
                            </p>
                            {item.note && (
                              <p className="text-slate-500 truncate">{item.note}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 whitespace-nowrap">
                              {numberFormatter.format(Math.abs(item.amount))}
                            </span>
                            <button
                              onClick={() => handleConfirmBatchItem(item.id)}
                              disabled={confirmingBatchItem === item.id || isPending}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-300 bg-white text-amber-600 transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Confirm received"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {group.items.length > 3 && (
                        <p className="text-[9px] text-center text-amber-600 italic">...and {group.items.length - 3} more items</p>
                      )}
                    </div>
                  </div>
                ))}
                {stats.fundedBatchItems.length > 3 && (
                  <Link href="/batch" className="block text-center text-[10px] font-semibold text-slate-600 hover:underline">
                    View {stats.fundedBatchItems.length - 3} more groups...
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
