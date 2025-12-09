'use client'


import { memo, MouseEvent, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  Plus,
  Minus,
  ArrowLeftRight,
  User,
  Pencil,
  TrendingUp,
  Clock4,
  RefreshCw,
  Infinity as InfinityIcon,
  Wallet,
  Landmark,
  PiggyBank,
  AlertCircle,
  ChevronRight,
  CheckCircle,
} from 'lucide-react'
import { parseCashbackConfig } from '@/lib/cashback'
import { useRouter } from 'next/navigation'

import {
  computeNextDueDate,
  getSharedLimitParentId,
} from '@/lib/account-utils'
import { Account, AccountCashbackSnapshot, Category, Person, Shop } from '@/types/moneyflow.types'
import { AddTransactionDialog } from './add-transaction-dialog'
import { EditAccountDialog } from './edit-account-dialog'
import { CustomTooltip } from '@/components/ui/custom-tooltip'
import { cn } from '@/lib/utils'
import { recalculateAccountBalanceAction } from '@/actions/account-actions'

type AccountCardProps = {
  account: Account
  cashback?: AccountCashbackSnapshot
  categories: Category[]
  people: Person[]
  collateralAccounts?: Account[]
  allAccounts?: Account[]
  shops: Shop[]
  hasPendingItems?: boolean
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

function getAccountIcon(type: Account['type']) {
  switch (type) {
    case 'credit_card':
      return <CreditCard className="h-10 w-10" />
    case 'bank':
    case 'ewallet':
      return <Landmark className="h-10 w-10" />
    case 'cash':
      return <Wallet className="h-10 w-10" />
    case 'savings':
    case 'investment':
    case 'asset':
      return <PiggyBank className="h-10 w-10" />
    case 'debt':
      return <User className="h-10 w-10" />
    default:
      return <Wallet className="h-10 w-10" />
  }
}

function getDueStatus(dueDate: Date | null) {
  if (!dueDate) return null

  const now = new Date()
  const diffMs = dueDate.getTime() - now.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (daysLeft <= 0) {
    return { label: `Overdue!`, tone: 'bg-red-100 text-red-700 border border-red-200', daysLeft }
  }
  if (daysLeft <= 3) {
    return { label: `Due ${daysLeft}d`, tone: 'bg-orange-100 text-orange-700 border border-orange-200', daysLeft }
  }
  if (daysLeft <= 7) {
    return { label: `Due ${daysLeft}d`, tone: 'bg-amber-100 text-amber-700 border border-amber-200', daysLeft }
  }
  return { label: `Due ${daysLeft}d`, tone: 'bg-teal-100 text-teal-700 border border-teal-200', daysLeft }
}

function AccountCardComponent({
  account,
  cashback,
  categories,
  people,
  collateralAccounts = [],
  allAccounts = [],
  shops,
  hasPendingItems = false,
}: AccountCardProps) {
  const router = useRouter()
  const [isRecalculating, setIsRecalculating] = useState(false)

  const isCreditCard = account.type === 'credit_card'
  const dueDate = computeNextDueDate(account.cashback_config ?? null)
  const dueStatus = getDueStatus(dueDate)

  // Parent/Child Logic
  const sharedLimitParentId = getSharedLimitParentId(account.cashback_config)
  const parentAccount = sharedLimitParentId ? allAccounts.find(a => a.id === sharedLimitParentId) : null
  const isChildCard = !!parentAccount
  const isParentCard = !isChildCard && allAccounts.some(a => getSharedLimitParentId(a.cashback_config) === account.id)

  // Balance Logic
  const creditLimit = account.credit_limit ?? 0
  const netBalance = (account.total_in ?? 0) - (account.total_out ?? 0)
  let displayBalance = creditLimit + netBalance
  let displayLimit = creditLimit

  if (isCreditCard && isChildCard && parentAccount) {
    const parentNetBalance = (parentAccount.total_in ?? 0) - (parentAccount.total_out ?? 0)
    const siblings = allAccounts.filter(a => getSharedLimitParentId(a.cashback_config) === parentAccount.id)
    const totalChildDebt = siblings.reduce((sum, child) => {
      const childNet = (child.total_in ?? 0) - (child.total_out ?? 0)
      return sum + Math.abs(childNet < 0 ? childNet : 0)
    }, 0)
    const parentDebt = Math.abs(parentNetBalance < 0 ? parentNetBalance : 0)
    displayLimit = parentAccount.credit_limit ?? 0
    displayBalance = displayLimit - (parentDebt + totalChildDebt)
  }

  if (isCreditCard && isParentCard) {
    const childCards = allAccounts.filter(a => getSharedLimitParentId(a.cashback_config) === account.id)
    const totalChildDebt = childCards.reduce((sum, child) => {
      const childNetBalance = (child.total_in ?? 0) - (child.total_out ?? 0)
      return sum + Math.abs(childNetBalance < 0 ? childNetBalance : 0)
    }, 0)
    const currentDebt = Math.abs(netBalance < 0 ? netBalance : 0)
    displayBalance = creditLimit - (currentDebt + totalChildDebt)
  }

  const openDetails = () => router.push(`/accounts/${account.id}`)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stopCardNavigation = (event?: MouseEvent) => event?.stopPropagation?.()

  const handleRecalculate = async (e: MouseEvent) => {
    e.stopPropagation()
    setIsRecalculating(true)
    try {
      await recalculateAccountBalanceAction(account.id)
      router.refresh()
    } catch (err) {
      console.error('Failed to recalculate', err)
    } finally {
      setIsRecalculating(false)
    }
  }

  const dialogBaseProps = { accounts: allAccounts, categories, people, shops }

  // Cashback Logic
  const earned = cashback?.earnedSoFar ?? 0
  const cap = cashback?.maxCashback
  const currentSpend = cashback?.currentSpend ?? 0
  const remaining = cap ? Math.max(0, cap - earned) : null

  const cashbackConfig = parseCashbackConfig(account.cashback_config)
  const minSpend = cashbackConfig?.minSpend ?? 0
  const needToSpend = minSpend > 0 ? Math.max(0, minSpend - currentSpend) : 0
  const cycleLabel = cashback?.cycleLabel ?? ''

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      onClick={openDetails}
    >
      {/* Image Section */}
      <div className="relative h-40 w-full bg-slate-100">
        {account.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.logo_url as string}
            alt={account.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className={cn(
            "flex h-full w-full items-center justify-center",
            isCreditCard ? "bg-gradient-to-br from-amber-100 to-orange-50 text-amber-600" : "bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600"
          )}>
            {getAccountIcon(account.type)}
          </div>
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />

        {/* TOP-LEFT: Card Name */}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center rounded-lg bg-white/80 px-3 py-1.5 text-sm font-bold text-slate-900 shadow-md backdrop-blur-sm truncate max-w-[140px]" title={account.name}>
            {account.name}
          </span>
        </div>

        {/* TOP-RIGHT: Limit */}
        <div className="absolute top-2 right-2">
          {isCreditCard && displayLimit > 0 && (
            <span className="inline-flex items-center rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
              Limit: {numberFormatter.format(displayLimit)}
            </span>
          )}
        </div>

        {/* BOTTOM-LEFT STACK: Due Date + Spent Progress */}
        {isCreditCard && (
          <div className="absolute bottom-2 left-2 flex flex-col gap-1 items-start">
            {/* Due Date */}
            {dueStatus && (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold shadow-md backdrop-blur-sm",
                dueStatus.tone
              )}>
                <Clock4 className="h-3 w-3" />
                {dueStatus.label}
              </span>
            )}

            {/* Spent Progress */}
            {cashback?.min_spend_required ? (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold shadow-md backdrop-blur-sm border",
                (cashback.total_spend_eligible || 0) >= cashback.min_spend_required
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-white/90 text-amber-700 border-amber-200"
              )}>
                <TrendingUp className="h-3 w-3" />
                Spent: {numberFormatter.format(cashback.total_spend_eligible || 0)}
              </span>
            ) : null}
          </div>
        )}

        {/* BOTTOM-RIGHT STACK: Cycle + Max/Need/Unlimited */}
        {isCreditCard && (
          <div className="absolute bottom-2 right-2 flex flex-col gap-1 items-end">
            {/* Cycle Badge (Always show, 'None' if missing) */}
            <span className="inline-flex items-center rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm">
              {cycleLabel ? cycleLabel.replace(/-/g, '/').replace(/ \/ /g, ' - ') : 'None'}
            </span>

            {/* Need More / Max / Unlimited */}
            {needToSpend > 0 ? (
              // Need More (Leading requirement)
              <span className="inline-flex items-center gap-1 rounded-md bg-red-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm animate-pulse">
                <AlertCircle className="h-3 w-3" />
                Need {numberFormatter.format(needToSpend)}
              </span>
            ) : cap ? (
              // Max Cashback (If min spend met or no min spend)
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-1 text-[10px] font-bold shadow-md backdrop-blur-sm">
                Max: {numberFormatter.format(cap)}
              </span>
            ) : account.cashback_config ? (
              // Unlimited
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-1 text-[10px] font-bold shadow-md backdrop-blur-sm">
                <InfinityIcon className="h-3 w-3" />
                Unlimited
              </span>
            ) : null}
          </div>
        )}

        {/* CENTER: Quick Actions + Edit on Hover - No border on Edit */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
          onClick={stopCardNavigation}
        >
          <div className="flex items-center gap-2">
            {/* Edit Button - No border, pure icon */}
            <EditAccountDialog
              account={account}
              collateralAccounts={collateralAccounts}
              buttonClassName="p-2.5 rounded-full text-slate-600 bg-white hover:bg-slate-50 shadow-md transition-all hover:scale-110 cursor-pointer"
              triggerContent={<Pencil className="h-4 w-4" />}
              onOpen={stopCardNavigation}
            />

            {isCreditCard ? (
              <>
                <CustomTooltip content="Pay Card">
                  <div>
                    <AddTransactionDialog
                      {...dialogBaseProps}
                      defaultType="transfer"
                      defaultDebtAccountId={account.id}
                      buttonClassName="p-2.5 rounded-full text-orange-600 bg-white hover:bg-orange-50 shadow-md transition-all hover:scale-110"
                      triggerContent={<CreditCard className="h-4 w-4" />}
                      onOpen={stopCardNavigation}
                    />
                  </div>
                </CustomTooltip>
                <CustomTooltip content="Expense">
                  <div>
                    <AddTransactionDialog
                      {...dialogBaseProps}
                      defaultType="expense"
                      defaultSourceAccountId={account.id}
                      buttonClassName="p-2.5 rounded-full text-rose-600 bg-white hover:bg-rose-50 shadow-md transition-all hover:scale-110"
                      triggerContent={<Minus className="h-4 w-4" />}
                      onOpen={stopCardNavigation}
                    />
                  </div>
                </CustomTooltip>
                <CustomTooltip content="Lend">
                  <div>
                    <AddTransactionDialog
                      {...dialogBaseProps}
                      defaultType="debt"
                      defaultSourceAccountId={account.id}
                      buttonClassName="p-2.5 rounded-full text-purple-600 bg-white hover:bg-purple-50 shadow-md transition-all hover:scale-110"
                      triggerContent={<User className="h-4 w-4" />}
                      onOpen={stopCardNavigation}
                    />
                  </div>
                </CustomTooltip>
              </>
            ) : (
              <>
                <CustomTooltip content="Income">
                  <div>
                    <AddTransactionDialog
                      {...dialogBaseProps}
                      defaultType="income"
                      defaultSourceAccountId={account.id}
                      buttonClassName="p-2.5 rounded-full text-emerald-600 bg-white hover:bg-emerald-50 shadow-md transition-all hover:scale-110"
                      triggerContent={<Plus className="h-4 w-4" />}
                      onOpen={stopCardNavigation}
                    />
                  </div>
                </CustomTooltip>
                <CustomTooltip content="Expense">
                  <div>
                    <AddTransactionDialog
                      {...dialogBaseProps}
                      defaultType="expense"
                      defaultSourceAccountId={account.id}
                      buttonClassName="p-2.5 rounded-full text-rose-600 bg-white hover:bg-rose-50 shadow-md transition-all hover:scale-110"
                      triggerContent={<Minus className="h-4 w-4" />}
                      onOpen={stopCardNavigation}
                    />
                  </div>
                </CustomTooltip>
                <CustomTooltip content="Transfer">
                  <div>
                    <AddTransactionDialog
                      {...dialogBaseProps}
                      defaultType="transfer"
                      defaultSourceAccountId={account.id}
                      buttonClassName="p-2.5 rounded-full text-blue-600 bg-white hover:bg-blue-50 shadow-md transition-all hover:scale-110"
                      triggerContent={<ArrowLeftRight className="h-4 w-4" />}
                      onOpen={stopCardNavigation}
                    />
                  </div>
                </CustomTooltip>
                <CustomTooltip content="Lend">
                  <div>
                    <AddTransactionDialog
                      {...dialogBaseProps}
                      defaultType="debt"
                      defaultSourceAccountId={account.id}
                      buttonClassName="p-2.5 rounded-full text-purple-600 bg-white hover:bg-purple-50 shadow-md transition-all hover:scale-110"
                      triggerContent={<User className="h-4 w-4" />}
                      onOpen={stopCardNavigation}
                    />
                  </div>
                </CustomTooltip>
              </>
            )}
            <CustomTooltip content="Re-sync">
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className={cn(
                  "p-2.5 rounded-full text-slate-600 bg-white hover:bg-slate-50 shadow-md transition-all hover:scale-110",
                  isRecalculating && "animate-spin text-blue-600"
                )}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </CustomTooltip>
          </div>
        </div>
      </div>

      {/* Footer: Thumbnail + Remains / Confirm Icon + Balance + Details */}
      <div className="flex items-stretch bg-slate-50 border-t border-slate-100">
        {isCreditCard ? (
          <>
            {/* Left: Thumbnail + Remains + Need */}
            <div className="flex items-center">
              {account.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={account.logo_url as string}
                  alt=""
                  className="h-14 w-16 object-contain p-1"
                  loading="lazy"
                />
              )}
              <div className="flex flex-col px-2 py-1.5 items-start">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Remains</span>
                  {needToSpend > 0 && (
                    <CustomTooltip content="Need to spend more to reach cashback target">
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                    </CustomTooltip>
                  )}
                  <span className="text-sm font-bold text-emerald-600">
                    {remaining !== null ? numberFormatter.format(remaining) : '∞'}
                  </span>
                </div>
                {/* Line 2: ALWAYS show - Target Met / Need More / None */}
                {minSpend > 0 ? (
                  needToSpend > 0 ? (
                    <span className="text-[10px] font-bold text-red-500 animate-pulse">
                      Need {numberFormatter.format(needToSpend)} more
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      Target Met ✅
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">
                    None
                  </span>
                )}
              </div>
            </div>

            {/* Right: Confirm Icon + Balance + Details */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 ml-auto">
              {hasPendingItems && (
                <CustomTooltip content="Pending Confirm">
                  <div className="p-1 rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                </CustomTooltip>
              )}
              <div className={cn(
                "text-right flex flex-col px-2 py-1 rounded-md transition-colors",
                needToSpend > 0 ? "bg-red-50" : ""
              )}>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Balance</span>
                <span className={cn(
                  "text-xl font-bold", // Reduced from text-2xl
                  displayBalance < displayLimit * 0.3 ? 'text-amber-600' : 'text-slate-900',
                  needToSpend > 0 && "text-red-700"
                )}>
                  {numberFormatter.format(displayBalance)}
                </span>
              </div>
              <Link
                href={`/accounts/${account.id}`}
                className="p-1 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); }}
                title="View Details"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {account.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element  
                <img
                  src={account.logo_url as string}
                  alt=""
                  className="h-10 w-12 object-contain p-1"
                  loading="lazy"
                />
              )}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Balance</span>
                <span className={cn("text-sm font-bold", displayBalance < 0 ? 'text-red-600' : 'text-slate-900')}>
                  {numberFormatter.format(displayBalance)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {hasPendingItems && (
                <CustomTooltip content="Pending Confirm">
                  <div className="p-1 rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                </CustomTooltip>
              )}
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className={cn(
                  "p-1.5 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors",
                  isRecalculating && "animate-spin text-blue-600"
                )}
                title="Re-sync Balance"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <Link
                href={`/accounts/${account.id}`}
                className="p-1 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); }}
                title="View Details"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div >
  )
}

// Memoize for performance
export const AccountCard = memo(AccountCardComponent)
