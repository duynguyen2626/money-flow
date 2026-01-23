'use client'

import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, CreditCard, TrendingUp, Wallet, Link2, Archive, RotateCcw, Clock4, CheckCircle2, RefreshCw, Settings } from 'lucide-react'

import { formatCurrency, getAccountTypeLabel } from '@/lib/account-utils'
import { getCreditCardAvailableBalance } from '@/lib/account-balance'
import { Account } from '@/types/moneyflow.types'
import { AccountSpendingStats } from '@/types/cashback.types'
import { Progress } from '@/components/ui/progress'
import { updateAccountConfigAction } from '@/actions/account-actions'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ConfirmMoneyReceived } from './confirm-money-received'
import { createClient } from '@/lib/supabase/client'
import { CashbackStatusDisplay } from './cashback-status-display'

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
  variant?: 'default' | 'compact'
}

export function AccountStatsHeader({
  account,
  collateralAccount,
  totals,
  cashbackStats,
  isAssetAccount,
  assetConfig,
  batchStats,
  variant = 'default'
}: AccountStatsHeaderProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [liveBatchStats, setLiveBatchStats] = useState(batchStats)
  const [isExpanded, setIsExpanded] = useState(false) // For compact mode expansion

  useEffect(() => {
    setLiveBatchStats(batchStats)
  }, [batchStats])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/batch/stats?accountId=${account.id}`)
        if (res.ok) {
          const data = await res.json()
          setLiveBatchStats(data)
        }
      } catch (e) {
        console.error('Failed to fetch batch stats', e)
      }
    }

    fetchStats()

    const supabase = createClient()
    const channel = supabase
      .channel(`batch_items_stats_${account.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'batch_items',
        filter: `target_account_id=eq.${account.id}`
      }, () => {
        fetchStats()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [account.id])

  const balanceTone = account.type === 'credit_card'
    ? account.current_balance > 0
      ? 'text-red-600'
      : account.current_balance < 0
        ? 'text-emerald-600'
        : 'text-slate-900'
    : account.current_balance < 0
      ? 'text-red-600'
      : 'text-slate-900'

  const displayBalance = account.type === 'credit_card'
    ? getCreditCardAvailableBalance(account)
    : account.current_balance

  // Removed In/Out stats as requested
  const statItems: {
    label: string
    value: number
    icon: React.ReactNode
    tone: string
    bg: string
    subtext?: string
  }[] = []

  const resolvedStats = liveBatchStats || batchStats

  if (resolvedStats) {
    const waitingAmount = Math.max(0, resolvedStats.waiting)

    statItems.push({
      label: 'Pending',
      value: waitingAmount,
      icon: <Clock4 className="h-4 w-4 text-amber-600" />,
      tone: 'text-amber-700',
      bg: 'bg-amber-50',
      subtext: 'Waiting for refund'
    })

    statItems.push({
      label: 'Confirmed',
      value: resolvedStats.confirmed,
      icon: <CheckCircle2 className="h-4 w-4 text-blue-600" />,
      tone: 'text-blue-700',
      bg: 'bg-blue-50',
      subtext: 'Funded from Batch'
    })
  } else {
    // Fallback if no batch stats (e.g. not loaded yet or error)
    statItems.push({
      label: 'Pending',
      value: 0,
      icon: <Clock4 className="h-4 w-4 text-amber-600" />,
      tone: 'text-amber-700',
      bg: 'bg-amber-50',
    })
    statItems.push({
      label: 'Confirmed',
      value: 0,
      icon: <CheckCircle2 className="h-4 w-4 text-blue-600" />,
      tone: 'text-blue-700',
      bg: 'bg-blue-50',
    })
  }

  const cycleLabel = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date())
  const earned = cashbackStats?.earnedSoFar ?? 0
  const cap = cashbackStats?.maxCashback
  const progressMax = cap ?? Math.max(earned, 1)
  const remaining = cashbackStats?.remainingBudget ?? null
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

  if (variant === 'compact') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {account.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.image_url} alt="" className="h-10 w-10 object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center bg-slate-200 text-sm font-semibold text-slate-700">
                {account.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h1 className="text-base font-semibold text-slate-900">{account.name}</h1>
              <div className="flex gap-2">
                <span className="text-[10px] text-slate-500 uppercase font-medium">{getAccountTypeLabel(account.type)}</span>
                <span className={`text-[10px] uppercase font-bold ${account.is_active !== false ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {account.is_active !== false ? 'Active' : 'Closed'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className={`text-xl font-bold tabular-nums ${balanceTone}`}>
              {formatCurrency(displayBalance ?? 0)}
            </span>
          </div>
        </div>

        {/* Expand Toggle */}
        <div className="flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
            {isExpanded ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          </button>
        </div>

        {isExpanded && (
          <div className="pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Layer 2: Cashback (Reuse logic if needed, or simplified) */}
            {/* Only showing Action Toolbar for compact expanded for now, or minimal stats */}
            <div className="flex flex-wrap gap-2 items-center justify-center pt-2">
              {/* Sync Button */}
              <button
                onClick={() => router.refresh()}
                className="inline-flex items-center gap-1.5 h-7 px-2 text-xs font-medium rounded border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              >
                <RefreshCw className="h-3 w-3" />
                Sync
              </button>

              {account.is_active !== false ? (
                <button
                  onClick={handleToggleAccountStatus}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Archive className="h-3 w-3" />
                  Close
                </button>
              ) : (
                <button
                  onClick={handleToggleAccountStatus}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reopen
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          {account.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.image_url} alt="" className="h-12 w-12 object-contain" />
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
                {formatCurrency(displayBalance ?? 0)}
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

      {/* Layer 2: Cashback Stats - 2 Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
        {/* Card 1: Qualifying Status - Only show if cashback config exists with minSpend */}
        {account.type === 'credit_card' && cashbackStats && minSpend !== null && minSpend !== undefined && (() => {
          const safeMinSpend = minSpend // Type narrowed here
          return (
            <div className={`flex flex-col gap-2 rounded-lg px-3 py-3 shadow-sm border ${cashbackStats.currentSpend < safeMinSpend
              ? 'bg-amber-50 border-amber-100'
              : 'bg-emerald-50 border-emerald-100'
              }`}>
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Qualifying Status</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {/* Row 1: Min vs Current */}
                <div className="flex items-center justify-between text-[10px] text-slate-600">
                  <span>Min: {formatCurrency(safeMinSpend)}</span>
                  <span>Current: {formatCurrency(cashbackStats.currentSpend)}</span>
                </div>

                {/* Row 2: Progress Bar */}
                <Progress
                  value={Math.min(100, (cashbackStats.currentSpend / safeMinSpend) * 100)}
                  className="h-1.5"
                />

                {/* Row 3: Status Message */}
                {cashbackStats.currentSpend < safeMinSpend ? (
                  <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                    ⚠️ Need {formatCurrency(safeMinSpend - cashbackStats.currentSpend)} more
                  </span>
                ) : (
                  <span className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                    ✅ Qualified
                  </span>
                )}
              </div>
            </div>
          )
        })()}

        {/* Card 2: Reward Economics - Smart Logic */}
        {account.type === 'credit_card' && cashbackStats && (() => {
          const isQualified = minSpend === null || minSpend === undefined || cashbackStats.currentSpend >= minSpend
          const netProfit = cashbackStats.netProfit

          // Determine display mode
          let displayMode: 'potential' | 'profit' | 'contribution'
          let displayValue: number
          let displayLabel: string
          let displayColor: string
          let displayBg: string
          let displayBorder: string

          if (!isQualified) {
            // Not qualified - show potential (locked)
            displayMode = 'potential'
            displayValue = cashbackStats.earnedSoFar
            displayLabel = 'Potential Profit'
            displayColor = 'text-slate-500'
            displayBg = 'bg-slate-50'
            displayBorder = 'border-slate-200'
          } else if (netProfit >= 0) {
            // Qualified with positive profit
            displayMode = 'profit'
            displayValue = netProfit
            displayLabel = 'Net Profit'
            displayColor = 'text-emerald-700 font-bold'
            displayBg = 'bg-emerald-50'
            displayBorder = 'border-emerald-100'
          } else {
            // Qualified with negative profit (Volunteer Mode)
            displayMode = 'contribution'
            displayValue = Math.abs(netProfit)
            displayLabel = 'Contribution 💖'
            displayColor = 'text-pink-600 font-bold'
            displayBg = 'bg-pink-50'
            displayBorder = 'border-pink-100'
          }

          return (
            <div className={`flex flex-col gap-2 rounded-lg px-3 py-3 shadow-sm border ${displayBg} ${displayBorder}`}>
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>{displayLabel}</span>
                {displayMode === 'potential' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">🔒 Locked</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                {/* Main Value */}
                <span className={`text-2xl font-bold tabular-nums ${displayColor}`}>
                  {remaining !== null ? formatCurrency(remaining) : '--'}
                </span>

                {/* Additional Info */}
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <div>Generated: {formatCurrency(cashbackStats.earnedSoFar)}</div>
                  <div>Shared: {formatCurrency(cashbackStats.sharedAmount)}</div>
                </div>

                {/* Subtext for contribution mode */}
                {displayMode === 'contribution' && (
                  <span className="text-[10px] text-pink-500 italic">Supporting the group</span>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Layer 3: Action Toolbar */}
      <div className="flex flex-wrap gap-2 items-center mt-3 pt-3 border-t border-slate-200">
        {/* Pending Button - Only show if count > 0 */}
        {resolvedStats && resolvedStats.waiting > 0 && (
          <div className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md border border-amber-200 bg-amber-50 text-amber-700">
            <Clock4 className="h-3.5 w-3.5" />
            Pending ({resolvedStats.waiting})
            <ConfirmMoneyReceived accountId={account.id} minimal />
          </div>
        )}

        {/* Confirmed Info - Only show if count > 0 */}
        {resolvedStats && resolvedStats.confirmed > 0 && (
          <div className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md border border-blue-200 bg-blue-50 text-blue-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Confirmed ({resolvedStats.confirmed})
          </div>
        )}

        {/* Sync Button - Always show */}
        <button
          onClick={() => router.refresh()}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Sync
        </button>

        {/* Settings Button - Always show */}
        <button className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
          <Settings className="h-3.5 w-3.5" />
          Config
        </button>
      </div>
    </div>
  )
}
