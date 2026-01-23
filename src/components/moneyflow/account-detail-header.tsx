"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Clock4,
  CreditCard,
  Minus,
  Plus,
  Settings,
  ChevronDown,
  ChevronUp,
  User,
  Wallet,
  Loader2,
  AlertTriangle,
  BookOpen,
  PiggyBank,
  Lock,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { getAccountTypeLabel } from '@/lib/account-utils'
import { getCreditCardAvailableBalance } from '@/lib/account-balance'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { AccountSpendingStats } from '@/types/cashback.types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { AccountSlideV2 } from '@/components/accounts/v2/AccountSlideV2'
import { TransactionTrigger } from '@/components/transaction/slide-v2/transaction-trigger'
import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'

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
  const [liveBatchStats, setLiveBatchStats] = useState(batchStats)
  const [collapsed, setCollapsed] = useState(true)
  const [pendingItems, setPendingItems] = useState<PendingBatchItem[]>([])
  const [isConfirmingPending, setIsConfirmingPending] = useState(false)
  const [pendingRefundAmount, setPendingRefundAmount] = useState(0)
  const [isPendingLoading, setIsPendingLoading] = useState(false)
  const [isSlideOpen, setIsSlideOpen] = useState(false)
  const [transactionSlideOpen, setTransactionSlideOpen] = useState(false)
  const [transactionSlideInitialData, setTransactionSlideInitialData] = useState({})
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
  const earnedSoFar = cashbackStats?.earnedSoFar ?? 0

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

  const displayBalance = computeDisplayBalance(account, allAccounts)
  const statusBadge = isCurrentlyActive
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-slate-100 text-slate-600'

  const availableBalance = getCreditCardAvailableBalance(account)
  const primaryBalance = account.type === 'credit_card'
    ? Math.max(0, account.current_balance ?? 0)
    : displayBalance
  const typeLabel = getAccountTypeLabel(account.type)

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 md:gap-3 lg:gap-4">
          <Link
            href={backHref}
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>

          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center bg-slate-50">
              {account.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.image_url} alt="" className="w-full h-full object-contain p-1" />
              ) : (
                <div className="text-lg font-bold text-slate-400">{account.name.charAt(0)}</div>
              )}
            </div>
            {account.secured_by_account_id && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-50 text-emerald-700 p-0.5 rounded-full border border-emerald-200">
                <Lock className="w-2 h-2" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">{account.name}</h1>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
              <Wallet className="w-3 h-3 text-slate-500" />
              Balance: <span className="text-slate-900">{formatPlain(primaryBalance)}</span>
            </span>
            {typeof account.credit_limit === 'number' && (
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
                <CreditCard className="w-3 h-3 text-slate-500" />
                Limit: <span className="text-slate-900">{formatPlain(account.credit_limit || 0)}</span>
              </span>
            )}
            {account.type === 'credit_card' && typeof account.current_balance === 'number' && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                Outstanding: <span className="text-amber-800">{formatPlain(Math.abs(account.current_balance))}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <TransactionTrigger
              initialData={{ source_account_id: account.id }}
              accounts={allAccounts}
              categories={categories}
              people={people}
              shops={shops}
            >
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[10px] font-semibold uppercase cursor-pointer transition-colors">
                <Zap className="w-3 h-3" />Quick
              </div>
            </TransactionTrigger>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[10px] font-semibold uppercase cursor-pointer transition-colors"
              onClick={() => {
                setTransactionSlideInitialData({ source_account_id: account.id, type: 'income' })
                setTransactionSlideOpen(true)
              }}
            >
              <Plus className="w-3 h-3" />Income
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10px] font-semibold uppercase cursor-pointer transition-colors"
              onClick={() => {
                setTransactionSlideInitialData({ source_account_id: account.id, type: 'expense' })
                setTransactionSlideOpen(true)
              }}
            >
              <Minus className="w-3 h-3" />Expense
            </button>
            {account.type === 'credit_card' ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 text-[10px] font-semibold uppercase cursor-pointer transition-colors"
                onClick={() => {
                  setTransactionSlideInitialData({ debt_account_id: account.id, type: 'transfer' })
                  setTransactionSlideOpen(true)
                }}
              >
                <CreditCard className="w-3 h-3" />Pay
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-semibold uppercase cursor-pointer transition-colors"
                onClick={() => {
                  setTransactionSlideInitialData({ source_account_id: account.id, type: 'transfer' })
                  setTransactionSlideOpen(true)
                }}
              >
                <ArrowLeftRight className="w-3 h-3" />Transfer
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 text-[10px] font-semibold uppercase cursor-pointer transition-colors"
              onClick={() => {
                setTransactionSlideInitialData({ source_account_id: account.id, debt_account_id: account.id, type: 'debt' })
                setTransactionSlideOpen(true)
              }}
            >
              <User className="w-3 h-3" />Lend
            </button>
          </div>

          {hasCashbackConfig && showQualifyingCard && (
            <div className="flex-1 min-w-[260px] flex items-center gap-3">
              <div className="flex-1 min-w-[200px] space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-600">
                  <span className="font-semibold text-slate-700">Spending Target</span>
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] whitespace-nowrap',
                    isQualified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  )}>
                    {isQualified ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {isQualified ? 'Qualified' : `Need ${formatPlain(needAmount)}`}
                  </span>
                </div>
                <Progress
                  value={progressValue}
                  className={cn(
                    'h-2',
                    isQualified ? '[&>div]:bg-emerald-500' : '[&>div]:bg-amber-500'
                  )}
                />
                <div className="flex items-center justify-between text-[10px] text-slate-600">
                  <span className="font-semibold">{formatPlain(currentSpend)}/{formatPlain(minSpend ?? 0)}</span>
                  <span>{Math.round(progressValue)}%</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-slate-500 uppercase">Reward</div>
                <div className={cn(
                  'text-sm font-bold tabular-nums',
                  isQualified ? 'text-emerald-600' : 'text-amber-600'
                )}>
                  {formatPlain(rewardValue)}
                </div>
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {hasPending && waitingAmount > 0 && (
              <button
                onClick={handleConfirmPending}
                disabled={isConfirmingPending}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold uppercase border border-amber-300 hover:bg-amber-200 transition-colors animate-pulse"
              >
                {isConfirmingPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock4 className="w-3 h-3" />}
                {formatPlain(waitingAmount)}
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-[10px] font-semibold uppercase transition-colors"
              onClick={() => setIsSlideOpen(true)}
              title="Account settings"
            >
              <Settings className="w-3 h-3" />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              title={collapsed ? 'Show details' : 'Hide details'}
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Additional Stats</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Batch Status</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs font-semibold"
                    onClick={handleConfirmPending}
                    disabled={isConfirmingPending || isPendingLoading || !hasPending}
                  >
                    {isConfirmingPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <BookOpen className="mr-1.5 h-4 w-4" />}
                    Confirm
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-amber-700">
                    <span>Pending</span>
                    <Clock4 className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-lg font-bold text-amber-700 tabular-nums">{formatPlain(pendingTotal)}</div>
                </div>

                <div className="flex flex-col gap-1 rounded-md bg-blue-50 border border-blue-200 px-3 py-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-blue-700">
                    <span>Confirmed</span>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-lg font-bold text-blue-700 tabular-nums">{formatPlain(confirmedAmount)}</div>
                </div>
              </div>
            </div>

            {hasCashbackConfig && (
              <div className="flex flex-col gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                <span className="text-xs font-semibold text-emerald-800">Cashback Details</span>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-emerald-700">Generated:</span>
                    <span className="font-bold text-emerald-800">{formatPlain(earnedSoFar)}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-emerald-700">Shared:</span>
                    <span className="font-bold text-emerald-800">{formatPlain(sharedDisplay)}</span>
                  </div>
                </div>
              </div>
            )}

            {account.secured_by_account_id && collateralAccount && (
              <div className="flex flex-col gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                <span className="text-xs font-semibold text-emerald-800">Secured By</span>
                <Link
                  href={`/accounts/${collateralAccount.id}`}
                  className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  <PiggyBank className="w-4 h-4" />
                  <span className="font-semibold text-sm">{collateralAccount.name}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <AccountSlideV2
        open={isSlideOpen}
        onOpenChange={setIsSlideOpen}
        account={account}
      />
      <TransactionSlideV2
        open={transactionSlideOpen}
        onOpenChange={setTransactionSlideOpen}
        initialData={transactionSlideInitialData}
        accounts={allAccounts}
        categories={categories}
        people={people}
        shops={shops}
      />
    </div>
  )
}
