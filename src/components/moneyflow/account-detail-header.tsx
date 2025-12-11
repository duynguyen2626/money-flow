"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Archive,
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Clock4,
  CreditCard,
  Link2,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  ChevronDown,
  ChevronUp,
  User,
  Wallet,
  Loader2,
  AlertTriangle,
  BookOpen,
  Hourglass,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import { recalculateAccountBalanceAction, updateAccountConfigAction } from '@/actions/account-actions'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { getAccountTypeLabel, getSharedLimitParentId } from '@/lib/account-utils'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { AccountSpendingStats } from '@/types/cashback.types'
import { toast } from 'sonner'

import { AddTransactionDialog } from './add-transaction-dialog'
import { EditAccountDialog } from './edit-account-dialog'

type PendingBatchItem = {
  id: string
  amount: number
  batch_id: string
}

type AccountDetailHeaderProps = {
  account: Account
  categories: Category[]
  people: Person[]
  allAccounts: Account[]
  savingsAccounts: Account[]
  collateralAccount: Account | null
  statTotals: { inflow: number; outflow: number; net: number }
  cashbackStats: AccountSpendingStats | null
  isAssetAccount: boolean
  assetConfig: { interestRate: number | null; termMonths: number | null; maturityDate: string | null } | null
  shops: Shop[]
  batchStats?: { waiting: number; confirmed: number }
  backHref?: string
}

const computeDisplayBalance = (account: Account, allAccounts: Account[]) => {
  if (account.type === 'credit_card') {
    return Math.abs(account.current_balance ?? 0)
  }
  return account.current_balance ?? 0
}

export function AccountDetailHeader({
  account,
  categories,
  people,
  allAccounts,
  savingsAccounts,
  collateralAccount,
  cashbackStats,
  shops,
  batchStats,
  backHref = '/accounts',
}: AccountDetailHeaderProps) {
  const router = useRouter()
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [liveBatchStats, setLiveBatchStats] = useState(batchStats)
  const [collapsed, setCollapsed] = useState(true)
  const [pendingItems, setPendingItems] = useState<PendingBatchItem[]>([])
  const [isConfirmingPending, setIsConfirmingPending] = useState(false)
  const [pendingRefundAmount, setPendingRefundAmount] = useState(0)
  const [isPendingLoading, setIsPendingLoading] = useState(false)
  const numberFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

  const fetchBatchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/batch/stats?accountId=${account.id}`)
      if (res.ok) {
        const data = await res.json() as { waiting: number; confirmed: number }
        setLiveBatchStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch batch stats', error)
    }
  }, [account.id])

  const fetchPendingBatchItems = useCallback(async () => {
    setIsPendingLoading(true)
    try {
      const res = await fetch(`/api/batch/pending-items?accountId=${account.id}`)
      if (res.ok) {
        const data = await res.json() as PendingBatchItem[]
        setPendingItems(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to fetch pending items', error)
    } finally {
      setIsPendingLoading(false)
    }
  }, [account.id])

  const fetchPendingRefunds = useCallback(async () => {
    try {
      const res = await fetch(`/api/refunds/pending?accountId=${account.id}`)
      if (!res.ok) {
        setPendingRefundAmount(0)
        return
      }
      const data = await res.json() as { total?: number }
      setPendingRefundAmount(Math.max(0, data?.total ?? 0))
    } catch (error) {
      console.error('Failed to fetch pending refunds', error)
      setPendingRefundAmount(0)
    }
  }, [account.id])

  useEffect(() => {
    setLiveBatchStats(batchStats)
  }, [batchStats])

  useEffect(() => {
    fetchBatchStats()
    fetchPendingBatchItems()
    fetchPendingRefunds()

    const supabase = createClient()
    const channel = supabase
      .channel(`batch_items_stats_${account.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'batch_items',
        filter: `target_account_id=eq.${account.id}`,
      }, () => {
        fetchBatchStats()
        fetchPendingBatchItems()
        fetchPendingRefunds()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [account.id, fetchBatchStats, fetchPendingBatchItems, fetchPendingRefunds])

  const isCurrentlyActive = account.is_active !== false
  const resolvedStats = liveBatchStats ?? batchStats
  const pendingBatchAmount = pendingItems.reduce((sum, item) => sum + Math.abs(item.amount ?? 0), 0)
  const waitingAmount = Math.max(0, pendingBatchAmount || resolvedStats?.waiting || 0)
  const confirmedAmount = Math.max(0, resolvedStats?.confirmed ?? 0)
  const pendingTotal = waitingAmount + pendingRefundAmount
  const formatPlain = (value: number) => numberFormatter.format(Math.max(0, Math.round(value || 0)))
  const hasPending = pendingTotal > 0

  const hasCashbackConfig = Boolean(cashbackStats)
  const minSpend = cashbackStats?.minSpend ?? null
  const currentSpend = cashbackStats?.currentSpend ?? 0
  const hasMinRequirement = typeof minSpend === 'number'
  const showQualifyingCard = hasCashbackConfig && hasMinRequirement
  const isQualified = hasCashbackConfig ? (!hasMinRequirement || currentSpend >= (minSpend ?? 0)) : false
  const needAmount = hasMinRequirement ? Math.max(0, (minSpend ?? 0) - currentSpend) : 0
  const progressValue = hasMinRequirement
    ? (minSpend && minSpend > 0
      ? Math.min(100, Math.max(0, (currentSpend / minSpend) * 100))
      : 100)
    : 0

  const potentialProfit = hasCashbackConfig ? Math.max(0, cashbackStats?.potentialProfit ?? 0) : 0
  const netProfit = cashbackStats?.netProfit ?? 0
  const sharedDisplay = Math.max(0, cashbackStats?.sharedAmount ?? 0)
  const rewardValue = !isQualified
    ? potentialProfit
    : netProfit >= 0
      ? netProfit
      : Math.abs(netProfit)

  let rewardLabel = isQualified ? 'Net Profit' : 'Potential Profit'
  let rewardTone = isQualified ? 'text-emerald-700' : 'text-slate-600'
  let rewardBg = isQualified ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
  let rewardBadge: string | null = isQualified ? null : 'Locked'
  const earnedSoFar = cashbackStats?.earnedSoFar ?? 0

  if (isQualified && netProfit < 0) {
    rewardLabel = 'Contribution \u2764\uFE0F'
    rewardTone = 'text-rose-600'
    rewardBg = 'bg-rose-50 border-rose-200'
  }

  const avatar = account.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={account.logo_url} alt="" className="h-16 w-20 object-contain rounded-none" />
  ) : (
    <div className="flex h-16 w-20 items-center justify-center bg-slate-200 text-base font-semibold text-slate-700 rounded-none">
      {account.name.charAt(0).toUpperCase()}
    </div>
  )

  const handleToggleAccountStatus = async () => {
    if (isUpdatingStatus) return
    setIsUpdatingStatus(true)
    try {
      const success = await updateAccountConfigAction({
        id: account.id,
        isActive: !isCurrentlyActive,
      })
      if (success) {
        router.refresh()
      }
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleRecalculateBalance = async () => {
    if (isRecalculating) return
    setIsRecalculating(true)
    try {
      const result = await recalculateAccountBalanceAction(account.id)
      if (result.success) {
        alert('Balance recalculated successfully!')
        router.refresh()
      } else {
        alert('Failed to recalculate balance: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      alert('An error occurred while recalculating balance')
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleConfirmPending = async () => {
    if (isConfirmingPending) return
    if (pendingItems.length === 0) {
      router.push('/batch')
      return
    }

    setIsConfirmingPending(true)
    try {
      let successCount = 0
      for (const item of pendingItems) {
        const response = await fetch('/api/batch/confirm-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: item.id, batchId: item.batch_id }),
        })
        if (response.ok) {
          successCount += 1
        }
      }

      if (successCount > 0) {
        toast.success(`Confirmed ${successCount} pending transfer${successCount > 1 ? 's' : ''}`)
        setPendingItems([])
        setPendingRefundAmount(0)
        fetchBatchStats()
        router.refresh()
      } else {
        toast.error('No pending items to confirm')
      }
    } catch (error) {
      toast.error('Failed to confirm pending transfers')
    } finally {
      setIsConfirmingPending(false)
    }
  }

  const dialogBaseProps = {
    accounts: allAccounts,
    categories,
    people,
    shops,
  }

  const displayBalance = computeDisplayBalance(account, allAccounts)
  const balanceTone = displayBalance < 0 ? 'text-red-600' : 'text-slate-900'
  const statusBadge = isCurrentlyActive
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-slate-100 text-slate-600'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      {/* Layer 1: Account Info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {avatar}
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900">{account.name}</h1>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                {getAccountTypeLabel(account.type)}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusBadge}`}>
                {isCurrentlyActive ? 'Active' : 'Closed'}
              </span>
              {collapsed && showQualifyingCard && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200 animate-pulse">
                  {isQualified ? 'Qualified' : `Need ${formatPlain(needAmount)}`}
                </span>
              )}
              <button
                type="button"
                onClick={handleConfirmPending}
                className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 shadow-sm hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 animate-pulse"
                disabled={isConfirmingPending || isPendingLoading}
              >
                {isConfirmingPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Clock4 className="h-3.5 w-3.5" />
                )}
                Pending {formatPlain(waitingAmount)}
              </button>
              <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Confirm {formatPlain(confirmedAmount)}
              </span>
              {/* Quick actions inline */}
              {account.type === 'credit_card' ? (
                <AddTransactionDialog
                  {...dialogBaseProps}
                  defaultType="transfer"
                  defaultDebtAccountId={account.id}
                  triggerContent={
                    <span className="inline-flex items-center gap-1 rounded-md border border-orange-100 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 shadow-sm hover:border-orange-200 hover:bg-orange-50 cursor-pointer">
                      <CreditCard className="h-3.5 w-3.5" />
                      Pay
                    </span>
                  }
                />
              ) : (
                <AddTransactionDialog
                  {...dialogBaseProps}
                  defaultType="transfer"
                  defaultSourceAccountId={account.id}
                  triggerContent={
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 cursor-pointer">
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      Transfer
                    </span>
                  }
                />
              )}
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="income"
                defaultSourceAccountId={account.id}
                triggerContent={
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                    Income
                  </span>
                }
              />
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="expense"
                defaultSourceAccountId={account.id}
                triggerContent={
                  <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:border-rose-300 hover:bg-rose-50 cursor-pointer">
                    <Minus className="h-3.5 w-3.5" />
                    Expense
                  </span>
                }
              />
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="debt"
                defaultDebtAccountId={account.id}
                defaultSourceAccountId={account.id}
                triggerContent={
                  <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-white px-3 py-1.5 text-xs font-semibold text-purple-700 shadow-sm hover:border-purple-300 hover:bg-purple-50 cursor-pointer">
                    <User className="h-3.5 w-3.5" />
                    Lend
                  </span>
                }
              />
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="repayment"
                defaultDebtAccountId={account.id}
                triggerContent={
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 cursor-pointer">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Repay
                  </span>
                }
              />
              <div className="h-4 w-px bg-slate-200 mx-1" />
              <button
                type="button"
                onClick={handleRecalculateBalance}
                disabled={isRecalculating}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
                Sync
              </button>
              <EditAccountDialog
                account={account}
                collateralAccounts={savingsAccounts}
                accounts={allAccounts}
                triggerContent={
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 cursor-pointer">
                    <Settings className="h-3.5 w-3.5" />
                    Config
                  </span>
                }
              />
            </div>
            {account.type === 'credit_card' && typeof account.credit_limit === 'number' && (
              <p className="text-xs text-slate-600">
                Credit limit: {formatPlain(account.credit_limit ?? 0)}
              </p>
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
          <div className="text-right flex items-center gap-3">
            <div className="mt-1 inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1">
              <Wallet className="h-4 w-4 text-slate-500" />
              <span className={`text-2xl font-bold tabular-nums ${balanceTone}`}>
                {formatPlain(displayBalance)}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-semibold"
              onClick={() => setCollapsed(prev => !prev)}
            >
              {collapsed ? (
                <>
                  <ChevronDown className="h-4 w-4" />
                </>
              ) : (
                <>
                  <ChevronUp className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs font-semibold"
            onClick={handleToggleAccountStatus}
            disabled={isUpdatingStatus}
          >
            {isCurrentlyActive ? (
              <Archive className="h-4 w-4 mr-1.5" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-1.5" />
            )}
            {isCurrentlyActive ? 'Close account' : 'Reopen account'}
          </Button>
        </div>
      </div>

      {collapsed ? null : (
        <>

          {/* Layer 2: Cashback Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {showQualifyingCard && (
              <div className="flex flex-col gap-2 rounded-lg px-3 py-3 shadow-sm border bg-white">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="uppercase tracking-wide text-[10px] text-slate-500">Qualifying Status</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isQualified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {isQualified ? 'Qualified' : 'In progress'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-700">
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">Min: <span className="font-bold">{formatPlain(minSpend ?? 0)}</span></span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">Current: <span className="font-bold">{formatPlain(currentSpend)}</span></span>
                  {!isQualified && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-amber-700 border border-amber-200">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Need {formatPlain(needAmount)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Progress value={progressValue} className="h-2" />
                </div>
              </div>
            )}

            {hasCashbackConfig && (
              <div className={`flex flex-col gap-2 rounded-lg px-3 py-3 shadow-sm border ${rewardBg}`}>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="uppercase tracking-wide text-[10px] text-slate-500">{rewardLabel}</span>
                  {rewardBadge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {rewardBadge}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`text-3xl font-extrabold tabular-nums ${rewardTone}`}>
                    {formatPlain(rewardValue)}
                  </div>
                  {!isQualified && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
                      Need {formatPlain(needAmount)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 text-[11px] text-slate-600 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-700">Generated: <span className="font-bold">{formatPlain(earnedSoFar)}</span></div>
                    <div className="font-semibold text-slate-700">{isQualified ? 'Shared' : 'Temp share'}: <span className="font-bold">{formatPlain(sharedDisplay)}</span></div>
                  </div>
                  <div className="space-y-1">
                    {hasMinRequirement && (
                      <div className="text-slate-600">
                        Target: <span className="font-bold">{formatPlain(minSpend ?? 0)}</span> | Current: <span className="font-bold">{formatPlain(currentSpend)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Combined legacy info card */}
            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Batch Status</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-[11px] font-semibold"
                    onClick={handleConfirmPending}
                    disabled={isConfirmingPending || isPendingLoading || !hasPending}
                  >
                    {isConfirmingPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <BookOpen className="mr-1.5 h-4 w-4" />}
                    Confirm batch pending
                  </Button>
                  {pendingRefundAmount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-[11px] font-semibold"
                      onClick={() => router.push('/refunds')}
                    >
                      <Hourglass className="mr-1.5 h-4 w-4" />
                      Confirm pending refund
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="flex flex-col gap-1 rounded-md bg-amber-50 border border-amber-100 px-2.5 py-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-amber-700">
                    <span>Pending</span>
                    <Clock4 className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-2xl font-extrabold text-amber-700 tabular-nums">{formatPlain(pendingTotal)}</div>
                  <div className="text-[11px] text-amber-700/90 space-y-0.5">
                    <div className="inline-flex items-center gap-1 rounded-md bg-white/60 px-2 py-1 font-semibold text-amber-700 border border-amber-100">
                      Pending Paid: {formatPlain(waitingAmount)}
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-md bg-white/60 px-2 py-1 font-semibold text-amber-700 border border-amber-100">
                      Pending Refund: {formatPlain(pendingRefundAmount)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 rounded-md bg-blue-50 border border-blue-100 px-2.5 py-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-blue-700">
                    <span>Confirmed</span>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-lg font-bold text-blue-700 tabular-nums">{formatPlain(confirmedAmount)}</div>
                  <span className="text-[11px] text-blue-700/80">Funded from batch</span>
                </div>
              </div>
            </div>
          </div>


        </>
      )}
    </div>
  )
}




