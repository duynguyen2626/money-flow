import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, CreditCard, TrendingUp, Wallet, Link2, Archive, RotateCcw, Clock4, CheckCircle2 } from 'lucide-react'

import { formatCurrency, getAccountTypeLabel } from '@/lib/account-utils'
import { Account } from '@/types/moneyflow.types'
import { AccountSpendingStats } from '@/types/cashback.types'
import { Progress } from '@/components/ui/progress'
import { updateAccountConfigAction } from '@/actions/account-actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type AssetConfig = {
  interestRate: number | null
  termMonths: number | null
  maturityDate: string | null
} | null

type AccountStatsHeaderProps = {
  account: Account
  collateralAccount: Account | null
  totals: { inflow: number; outflow: number; net: number }
  cashbackStats: AccountSpendingStats | null
  isAssetAccount: boolean
  assetConfig: AssetConfig
  batchStats?: { waiting: number; confirmed: number }
}

export function AccountStatsHeader({
  account,
  collateralAccount,
  totals,
  cashbackStats,
  isAssetAccount,
  assetConfig,
  batchStats,
}: AccountStatsHeaderProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  const balanceTone = account.current_balance < 0 ? 'text-red-600' : 'text-slate-900'

  const statItems = [
    {
      label: 'Incoming',
      value: totals.inflow,
      icon: <ArrowUpRight className="h-4 w-4 text-emerald-600" />,
      tone: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Outgoing',
      value: totals.outflow,
      icon: <ArrowDownRight className="h-4 w-4 text-rose-600" />,
      tone: 'text-rose-700',
      bg: 'bg-rose-50',
    },
  ]

  if (batchStats) {
    if (batchStats.waiting > 0) {
      statItems.push({
        label: 'Waiting',
        value: batchStats.waiting,
        icon: <Clock4 className="h-4 w-4 text-amber-600" />,
        tone: 'text-amber-700',
        bg: 'bg-amber-50',
      })
    }
    if (batchStats.confirmed > 0) {
      statItems.push({
        label: 'Confirmed',
        value: batchStats.confirmed,
        icon: <CheckCircle2 className="h-4 w-4 text-blue-600" />,
        tone: 'text-blue-700',
        bg: 'bg-blue-50',
      })
    }
  }

  const cycleLabel = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date())
  const earned = cashbackStats?.earnedSoFar ?? 0
  const cap = cashbackStats?.maxCashback
  const progressMax = cap ?? Math.max(earned, 1)
  const remaining = cap ? Math.max(0, cap - earned) : null
  const minSpend = cashbackStats?.minSpend

  // Hàm xử lý đóng/mở lại tài khoản
  const handleToggleAccountStatus = async () => {
    setIsUpdating(true)
    try {
      const newStatus = !account.is_active
      const success = await updateAccountConfigAction({
        id: account.id,
        isActive: newStatus
      })

      if (success) {
        // Làm mới trang để cập nhật trạng thái
        router.refresh()
      }
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          {account.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.logo_url} alt="" className="h-12 w-12 object-contain" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center bg-slate-200 text-base font-semibold text-slate-700">
              {account.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900">{account.name}</h1>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                {getAccountTypeLabel(account.type)}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${account.is_active !== false
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
                }`}>
                {account.is_active !== false ? 'Active' : 'Closed'}
              </span>
            </div>
            {account.type === 'credit_card' && typeof account.credit_limit === 'number' && (
              <p className="text-xs text-slate-600">Credit limit: {formatCurrency(account.credit_limit)}</p>
            )}
            {account.secured_by_account_id && collateralAccount && (
              <p className="text-xs text-blue-700">
                Secured by{' '}
                <Link href={`/accounts/${collateralAccount.id}`} className="inline-flex items-center gap-1 underline">
                  <Link2 className="h-3 w-3" />
                  {collateralAccount.name}
                </Link>
              </p>
            )}
            {account.secured_by_account_id && !collateralAccount && (
              <p className="text-xs text-slate-500">
                Secured by an account (not found)
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">Current balance</span>
            <div className="mt-1 inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1">
              <Wallet className="h-4 w-4 text-slate-500" />
              <span className={`text-2xl font-bold tabular-nums ${balanceTone}`}>
                {formatCurrency(account.current_balance)}
              </span>
            </div>
          </div>

          {/* Thêm nút Đóng/Mở lại tài khoản */}
          <div className="flex gap-2">
            {account.is_active !== false ? (
              <button
                onClick={handleToggleAccountStatus}
                disabled={isUpdating}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                <Archive className="h-3 w-3" />
                Close Account
              </button>
            ) : (
              <button
                onClick={handleToggleAccountStatus}
                disabled={isUpdating}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                <RotateCcw className="h-3 w-3" />
                Reopen Account
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {statItems.map(item => (
          <div key={item.label} className={`flex flex-col gap-1 rounded-lg ${item.bg} px-3 py-2 shadow-sm`}>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{item.label}</span>
              {item.icon}
            </div>
            <span className={`text-lg font-bold tabular-nums ${item.tone}`}>
              {formatCurrency(item.label === 'Net Flow' ? item.value : Math.abs(item.value))}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
        {account.type === 'credit_card' && cashbackStats ? (
          <>
            <div className="flex flex-wrap items-center justify-between text-xs uppercase tracking-wide text-slate-500">
              <span>Cashback cycle</span>
              <span>Cycle: {cycleLabel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-900">
              <span>{formatCurrency(cashbackStats.currentSpend)}</span>
              <span className="text-xs font-medium text-slate-600">
                Rate: {Math.round((cashbackStats.rate ?? 0) * 100)}%
                {minSpend ? ` · Min spend ${formatCurrency(minSpend)}` : ''}
              </span>
              <span className="text-xs font-medium text-slate-600">
                {cap ? `Cap ${formatCurrency(cap)}` : 'Unlimited'}
              </span>
              {remaining !== null && (
                <span className="text-xs font-medium text-slate-600">Remaining: {formatCurrency(remaining)}</span>
              )}
            </div>
            <Progress value={earned} max={progressMax} className="h-2" />
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <span className="font-semibold text-emerald-700">Earned: {formatCurrency(earned)}</span>
              {cap && <span className="text-xs text-slate-500">/ {formatCurrency(cap)}</span>}
            </div>
          </>
        ) : isAssetAccount ? (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CreditCard className="h-4 w-4 text-slate-500" />
              <span>Interest details</span>
            </div>
            <p className="text-sm text-slate-700">
              Rate: {assetConfig?.interestRate ? `${assetConfig.interestRate}%` : 'Not set'}
            </p>
            <p className="text-xs text-slate-500">
              {assetConfig?.termMonths ? `${assetConfig.termMonths} months` : 'No term'}{' '}
              {assetConfig?.maturityDate ? `· Matures ${assetConfig.maturityDate}` : ''}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CreditCard className="h-4 w-4 text-slate-500" />
              <span>Cashback</span>
            </div>
            <p className="text-sm text-slate-600">Not applicable for this account.</p>
          </>
        )}
      </div>
    </div>
  )
}