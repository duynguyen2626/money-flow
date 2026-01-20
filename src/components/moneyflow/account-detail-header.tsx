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
  PiggyBank,
  Lock,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import { recalculateAccountBalanceAction, updateAccountConfigAction } from '@/actions/account-actions'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { getAccountTypeLabel, getSharedLimitParentId } from '@/lib/account-utils'
import { getCreditCardAvailableBalance } from '@/lib/account-balance'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { AccountSpendingStats } from '@/types/cashback.types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { AddTransactionDialog } from './add-transaction-dialog'
import { AccountSlideV2 } from '@/components/accounts/v2/AccountSlideV2'
import { TransactionTrigger } from '@/components/transaction/slide-v2/transaction-trigger'

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
    return getCreditCardAvailableBalance(account)
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
  const [isSlideOpen, setIsSlideOpen] = useState(false)
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
  const balanceTone = account.type === 'credit_card'
    ? account.current_balance > 0
      ? 'text-red-600' // Owing money
      : 'text-slate-900' // Unpaid but within term or positive
    : displayBalance > 0
      ? 'text-emerald-600'
      : 'text-slate-900' // Zero or negative
  // Logic fix: Credit card positive balance = Debt? Usually positive balance means credit available OR debt? 
  // In this system: Credit Card Current Balance is usually POSITIVE if you SPENT money (Debt).
  // So > 0 is Red.  < 0 is Surplus (Credit). 
  // Check lines 297 in original: 
  // account.current_balance > 0 ? 'text-red-600' : 'text-slate-900' (if < 0 ?)
  // My previous logic was:
  // displayBalance > 0 ? (account.type === 'credit_card' ? 'text-slate-900' : 'text-emerald-700')
  // Let's stick to simple logic:

  const statusBadge = isCurrentlyActive
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-slate-100 text-slate-600'

  return (
    <div className="space-y-3">
      {/* MAIN HEADER ROW - Borderless, Clean */}
      <div className="flex items-center justify-between gap-4 py-2">
        {/* LEFT: Back + Image + Identity */}
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="relative">
            {/* Image - Clean, No Background */}
            <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center">
              {account.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.image_url} alt="" className="w-full h-full object-contain p-1" />
              ) : (
                <div className="text-lg font-bold text-slate-400">{account.name.charAt(0)}</div>
              )}
            </div>
            {/* Secured Badge */}
            {account.secured_by_account_id && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-50 text-emerald-700 p-0.5 rounded-full border border-emerald-100 shadow-sm">
                <Lock className="w-2.5 h-2.5" />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 leading-none">{account.name}</h1>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${statusBadge}`}>
                {isCurrentlyActive ? 'Active' : 'Closed'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-none">
              {getAccountTypeLabel(account.type)}
              {account.type === 'credit_card' && (
                <span className="text-[11px] text-slate-400 ml-1">• Limit: {formatPlain(account.credit_limit || 0)}</span>
              )}
            </p>
          </div>
        </div>

        {/* MIDDLE: Quick Action Buttons - Inline with name */}
        <div className="flex flex-wrap items-center gap-2">
          <TransactionTrigger
            initialData={{ source_account_id: account.id }}
            accounts={allAccounts}
            categories={categories}
            people={people}
            shops={shops}
          >
            <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer">
              <Zap className="w-3 h-3" />Quick Add
            </div>
          </TransactionTrigger>
          <AddTransactionDialog
            {...dialogBaseProps}
            defaultType="income"
            defaultSourceAccountId={account.id}
            triggerContent={
              <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                <Plus className="w-3 h-3" />Income
              </div>
            }
          />
          <AddTransactionDialog
            {...dialogBaseProps}
            defaultType="expense"
            defaultSourceAccountId={account.id}
            triggerContent={
              <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                <Minus className="w-3 h-3" />Expense
              </div>
            }
          />
          {account.type === 'credit_card' ? (
            <AddTransactionDialog
              {...dialogBaseProps}
              defaultType="transfer"
              defaultDebtAccountId={account.id}
              triggerContent={
                <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-amber-200 hover:bg-amber-50 text-amber-600 hover:text-amber-700 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  <CreditCard className="w-3 h-3" />Pay Bill
                </div>
              }
            />
          ) : (
            <AddTransactionDialog
              {...dialogBaseProps}
              defaultType="transfer"
              defaultSourceAccountId={account.id}
              triggerContent={
                <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-blue-600 hover:text-blue-700 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  <ArrowLeftRight className="w-3 h-3" />Transfer
                </div>
              }
            />
          )}
          <AddTransactionDialog
            {...dialogBaseProps}
            defaultType="debt"
            defaultDebtAccountId={account.id}
            defaultSourceAccountId={account.id}
            triggerContent={
              <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-purple-200 hover:bg-purple-50 text-purple-600 hover:text-purple-700 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                <User className="w-3 h-3" />Lend
              </div>
            }
          />
          <div
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600 hover:text-slate-700 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            onClick={() => setIsSlideOpen(true)}
          >
            <Settings className="w-3 h-3" />Settings
          </div>
          {hasPending && waitingAmount > 0 && (
            <button
              onClick={handleConfirmPending}
              disabled={isConfirmingPending}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200 hover:bg-amber-100 transition-colors animate-pulse"
            >
              {isConfirmingPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock4 className="w-3.5 h-3.5" />}
              Verify {formatPlain(waitingAmount)}
            </button>
          )}
        </div>

        {/* RIGHT: Balance + Collapse Toggle */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "text-xl font-black tracking-tight tabular-nums",
            displayBalance >= 0 ? "text-emerald-600" : "text-rose-600"
          )}>
            {formatPlain(displayBalance)}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* EXPANDABLE SECTION - Only Badges */}
      {!collapsed && (
        <div className="py-2 border-b border-slate-100">
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            {confirmedAmount > 0 && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
                <CheckCircle2 className="w-3 h-3" />
                Ready {formatPlain(confirmedAmount)}
              </div>
            )}

            {/* Secured By Link */}
            {account.secured_by_account_id && collateralAccount && (
              <Link href={`/accounts/${collateralAccount.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200 hover:bg-emerald-100">
                <PiggyBank className="w-3 h-3" />
                By {collateralAccount.name}
              </Link>
            )}
          </div>
        </div>
      )}



      {/* Mobile Utility Actions Row */}
      <div className="flex md:hidden items-center justify-end gap-2 border-t border-slate-50 pt-2">
        <button
          type="button"
          onClick={handleRecalculateBalance}
          disabled={isRecalculating}
          className="p-2 text-slate-400 hover:text-slate-600"
          title="Sync Balance"
        >
          <RefreshCw className={cn("w-4 h-4", isRecalculating && "animate-spin")} />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-slate-400"
          onClick={handleToggleAccountStatus}
        >
          {isCurrentlyActive ? 'Close' : 'Reopen'}
        </Button>
      </div>


      {/* EXPANDED CONTENT */}
      {
        collapsed ? null : (
          <div className="pt-4 border-t border-slate-100 transition-all">
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
                      Confirm
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
                        Refunds
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
                        Pending: {formatPlain(waitingAmount)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 rounded-md bg-blue-50 border border-blue-100 px-2.5 py-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-blue-700">
                      <span>Confirmed</span>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-lg font-bold text-blue-700 tabular-nums">{formatPlain(confirmedAmount)}</div>
                    <span className="text-[11px] text-blue-700/80">Batch</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
      <AccountSlideV2
        open={isSlideOpen}
        onOpenChange={setIsSlideOpen}
        account={account}
      />
    </div >
  )
}
