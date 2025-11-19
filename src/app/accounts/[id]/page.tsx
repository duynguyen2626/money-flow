import { notFound } from 'next/navigation'
import { CreditCard, Banknotes, Wallet, Users } from 'lucide-react'

import { getAccountDetails, getAccountTransactions } from '@/services/account.service'
import { parseCashbackConfig, getCashbackCycleRange } from '@/lib/cashback'
import { RecentTransactions } from '@/components/moneyflow/recent-transactions'
import { Account } from '@/types/moneyflow.types'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const cycleDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
})

function formatCycleRange(range: { start: Date; end: Date }) {
  const fmt = (date: Date) => cycleDateFormatter.format(date)
  return `${fmt(range.start)} - ${fmt(range.end)}`
}

function getAccountIcon(type: Account['type']) {
  switch (type) {
    case 'credit_card':
      return <CreditCard className="h-5 w-5 text-slate-700" />
    case 'bank':
      return <Banknotes className="h-5 w-5 text-slate-700" />
    case 'cash':
    case 'ewallet':
      return <Wallet className="h-5 w-5 text-slate-700" />
    case 'debt':
      return <Users className="h-5 w-5 text-slate-700" />
    default:
      return <Wallet className="h-5 w-5 text-slate-700" />
  }
}

export const dynamic = 'force-dynamic'

type AccountPageProps = {
  params: {
    id: string
  }
}

export default async function AccountDetailsPage({ params }: AccountPageProps) {
  const account = await getAccountDetails(params.id)

  if (!account) {
    notFound()
  }

  const transactions = await getAccountTransactions(params.id, 25)
  const cashbackConfig = parseCashbackConfig(account.cashback_config)
  const cycleRange = getCashbackCycleRange(cashbackConfig, new Date())
  const cycleLabel = formatCycleRange(cycleRange)
  const cycleTypeLabel =
    cashbackConfig.cycleType === 'statement_cycle'
      ? 'Statement cycle'
      : 'Calendar month'

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              {getAccountIcon(account.type)}
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">{account.name}</p>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {account.type.replace('_', ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <p
              className={`text-3xl font-bold ${
                account.current_balance < 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {currencyFormatter.format(account.current_balance)}
            </p>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Edit Account
            </button>
          </div>
        </div>
      </section>

      {account.type === 'credit_card' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Cashback Configuration</p>
              <p className="text-xs text-slate-500">Thông tin chu kỳ và hạn mức</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              Cycle type: {cycleTypeLabel}
              {cashbackConfig.statementDay && ` • Day ${cashbackConfig.statementDay}`}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Rate</p>
              <p className="text-xl font-semibold text-slate-900">
                {(cashbackConfig.rate * 100).toFixed(2)}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Max cap</p>
              <p className="text-lg font-semibold text-slate-900">
                {cashbackConfig.maxAmount === null
                  ? 'Khong gioi han'
                  : currencyFormatter.format(cashbackConfig.maxAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Min spend</p>
              <p className="text-lg font-semibold text-slate-900">
                {cashbackConfig.minSpend === null
                  ? 'Khong yeu cau'
                  : currencyFormatter.format(cashbackConfig.minSpend)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Cycle window</p>
              <p className="text-sm font-semibold text-slate-900">{cycleLabel}</p>
              <p className="text-xs text-slate-500">As of today</p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">Transaction history</p>
            <p className="text-xs text-slate-500">Giao dịch có liên quan đến tài khoản này</p>
          </div>
        </div>
        <RecentTransactions transactions={transactions} />
      </section>
    </div>
  )
}
