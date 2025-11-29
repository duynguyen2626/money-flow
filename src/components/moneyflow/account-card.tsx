'use client'

import Link from 'next/link'
import {
  CreditCard,
  MoreVertical,
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
  ChevronRight
} from 'lucide-react'
import { MouseEvent, ReactNode, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  computeNextDueDate,
  getAccountTypeLabel,
  getSharedLimitParentId,
} from '@/lib/account-utils'
import { Account, AccountCashbackSnapshot, Category, Person, Shop } from '@/types/moneyflow.types'
import { AddTransactionDialog } from './add-transaction-dialog'
import { EditAccountDialog } from './edit-account-dialog'
import { ConfirmMoneyReceived } from './confirm-money-received'
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
}

// Formatter without currency symbol
const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

function getAccountIcon(type: Account['type']) {
  switch (type) {
    case 'credit_card':
      return <CreditCard className="h-6 w-6" />
    case 'bank':
    case 'ewallet':
      return <Landmark className="h-6 w-6" />
    case 'cash':
      return <Wallet className="h-6 w-6" />
    case 'savings':
    case 'investment':
    case 'asset':
      return <PiggyBank className="h-6 w-6" />
    case 'debt':
      return <User className="h-6 w-6" />
    default:
      return <Wallet className="h-6 w-6" />
  }
}

function getAccountTypeBadgeColor(type: Account['type']) {
  switch (type) {
    case 'credit_card':
      return 'text-amber-700 border-amber-200 bg-amber-50'
    case 'bank':
    case 'ewallet':
    case 'cash':
      return 'text-blue-700 border-blue-200 bg-blue-50'
    case 'savings':
    case 'investment':
    case 'asset':
      return 'text-emerald-700 border-emerald-200 bg-emerald-50'
    case 'debt':
      return 'text-orange-700 border-orange-200 bg-orange-50'
    default:
      return 'text-slate-700 border-slate-200 bg-slate-50'
  }
}

function getDueStatus(dueDate: Date | null) {
  if (!dueDate) return null

  const now = new Date()
  const diffMs = dueDate.getTime() - now.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (daysLeft <= 3) {
    return { label: `Due in ${daysLeft} days`, tone: 'text-red-700 bg-red-100 border-red-200' }
  }

  if (daysLeft <= 7) {
    return { label: `Due in ${daysLeft} days`, tone: 'text-amber-700 bg-amber-100 border-amber-200' }
  }

  return { label: `Due in ${daysLeft} days`, tone: 'text-emerald-700 bg-emerald-100 border-emerald-200' }
}

function ActionButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <CustomTooltip content={label}>
      {/* Wrap in div to ensure Tooltip works with Fragment children */}
      <div className="inline-flex">
        {children}
      </div>
    </CustomTooltip>
  )
}

export function AccountCard({
  account,
  cashback,
  categories,
  people,
  collateralAccounts = [],
  allAccounts = [],
  shops,
}: AccountCardProps) {
  const router = useRouter()
  const [isRecalculating, setIsRecalculating] = useState(false)

  // Logic for credit card stats
  const isCreditCard = account.type === 'credit_card'
  const dueDate = computeNextDueDate(account.cashback_config ?? null)
  const dueStatus = getDueStatus(dueDate)

  // Parent/Child Logic
  const sharedLimitParentId = getSharedLimitParentId(account.cashback_config)
  const parentAccount = sharedLimitParentId ? allAccounts.find(a => a.id === sharedLimitParentId) : null
  const isChildCard = !!parentAccount
  const isParentCard = !isChildCard && allAccounts.some(a => getSharedLimitParentId(a.cashback_config) === account.id)

  // Unified Balance Logic: Limit + In - Out
  // For non-credit accounts, limit is 0, so it's just In - Out (Current Balance)
  // For credit cards, it's Available Balance
  const creditLimit = account.credit_limit ?? 0
  const netBalance = (account.total_in ?? 0) - (account.total_out ?? 0)

  let displayBalance = creditLimit + netBalance
  let displayLimit = creditLimit
  let displayLabel = isCreditCard ? 'Available' : 'Current Balance'
  let isSharedAvailable = false

  // Child Card Logic (Override displayBalance)
  if (isCreditCard && isChildCard && parentAccount) {
    const parentNetBalance = (parentAccount.total_in ?? 0) - (parentAccount.total_out ?? 0)

    // Find all children of this parent
    const siblings = allAccounts.filter(a => getSharedLimitParentId(a.cashback_config) === parentAccount.id)

    const totalChildDebt = siblings.reduce((sum, child) => {
      const childNet = (child.total_in ?? 0) - (child.total_out ?? 0)
      return sum + Math.abs(childNet < 0 ? childNet : 0)
    }, 0)

    const parentDebt = Math.abs(parentNetBalance < 0 ? parentNetBalance : 0)
    const totalDebt = parentDebt + totalChildDebt

    displayLimit = parentAccount.credit_limit ?? 0
    displayBalance = displayLimit - totalDebt
    displayLabel = 'Shared Available'
    isSharedAvailable = true
  }

  // Parent Card Logic (Override displayBalance)
  if (isCreditCard && isParentCard) {
    const childCards = allAccounts.filter(a => getSharedLimitParentId(a.cashback_config) === account.id)
    const totalChildDebt = childCards.reduce((sum, child) => {
      const childNetBalance = (child.total_in ?? 0) - (child.total_out ?? 0)
      return sum + Math.abs(childNetBalance < 0 ? childNetBalance : 0)
    }, 0)

    const currentDebt = Math.abs(netBalance < 0 ? netBalance : 0)
    const totalDebt = currentDebt + totalChildDebt
    displayBalance = creditLimit - totalDebt
  }

  const openDetails = () => {
    router.push(`/accounts/${account.id}`)
  }

  const stopCardNavigation = (event?: MouseEvent) => {
    event?.stopPropagation?.()
  }

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

  const dialogBaseProps = {
    accounts: allAccounts,
    categories,
    people,
    shops,
  }

  // Cashback Logic
  // Cashback Logic
  const earned = cashback?.earnedSoFar ?? 0
  const cap = cashback?.maxCashback

  let cashbackBadge = null
  if (isCreditCard) {
    if (!account.cashback_config) {
      cashbackBadge = (
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 whitespace-nowrap">
          None
        </span>
      )
    } else if (cap && cap > 0) {
      const remaining = Math.max(0, cap - earned)
      cashbackBadge = (
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 whitespace-nowrap">
          <TrendingUp className="h-3 w-3" />
          <span>{numberFormatter.format(remaining)}</span>
        </span>
      )
    } else {
      // Unlimited
      cashbackBadge = (
        <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 whitespace-nowrap">
          <InfinityIcon className="h-3 w-3" />
          <span>Unlimited</span>
        </span>
      )
    }
  }

  return (
    <div
      className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md h-full"
      onClick={openDetails}
    >
      {/* Top Section */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-lg leading-tight truncate" title={account.name}>
              {account.name}
            </h3>
            <div onClick={stopCardNavigation}>
              <EditAccountDialog
                account={account}
                collateralAccounts={collateralAccounts}
                triggerContent={
                  <div className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer rounded-full hover:bg-slate-100 transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </div>
                }
                onOpen={stopCardNavigation}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {dueStatus && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${dueStatus.tone}`}>
                <Clock4 className="h-3 w-3" />
                {dueStatus.label}
              </span>
            )}
            {cashbackBadge}
          </div>
        </div>

        {/* Card Image */}
        <div className="flex-shrink-0" onClick={stopCardNavigation}>
          <EditAccountDialog
            account={account}
            collateralAccounts={collateralAccounts}
            triggerContent={
              <div className={cn(
                "relative overflow-hidden shadow-sm cursor-pointer hover:opacity-90 transition-opacity",
                isCreditCard ? "h-14 w-24 rounded-lg" : "h-14 w-14 rounded-full"
              )}>
                {account.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.logo_url as string}
                    alt={account.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                    {getAccountIcon(account.type)}
                  </div>
                )}
              </div>
            }
            onOpen={stopCardNavigation}
          />
        </div>
      </div>

      {/* Middle Section: Balance */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Current Balance
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className={cn(
              "p-1.5 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors",
              isRecalculating && "animate-spin text-blue-600"
            )}
            title="Re-sync Balance"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <p className={cn(
            "text-3xl font-bold tracking-tight",
            isCreditCard
              ? (displayBalance < displayLimit * 0.3 ? 'text-amber-600' : 'text-slate-900')
              : (displayBalance < 0 ? 'text-red-600' : 'text-slate-900')
          )}>
            {numberFormatter.format(displayBalance)}
          </p>
          <div onClick={stopCardNavigation}>
            <ConfirmMoneyReceived accountId={account.id} minimal />
          </div>
        </div>

        {isCreditCard && (
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <span>Limit: <span className="font-medium text-slate-600">{numberFormatter.format(displayLimit)}</span></span>
          </div>
        )}
      </div>

      {/* Bottom Section: Actions & Details */}
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100" onClick={stopCardNavigation}>
        <div className="flex items-center gap-3">
          {isCreditCard ? (
            <>
              <CustomTooltip content="Pay Card">
                <div>
                  <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="transfer"
                    defaultDebtAccountId={account.id}
                    buttonClassName="p-1.5 rounded-md text-orange-600 hover:bg-orange-50 transition-colors"
                    triggerContent={<CreditCard className="h-5 w-5" />}
                    onOpen={stopCardNavigation}
                  />
                </div>
              </CustomTooltip>
              <CustomTooltip content="Income">
                <div>
                  <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="income"
                    defaultSourceAccountId={account.id}
                    buttonClassName="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                    triggerContent={<Plus className="h-5 w-5" />}
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
                    buttonClassName="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 transition-colors"
                    triggerContent={<Minus className="h-5 w-5" />}
                    onOpen={stopCardNavigation}
                  />
                </div>
              </CustomTooltip>
              <CustomTooltip content="Lend / Debt">
                <div>
                  <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="debt"
                    defaultSourceAccountId={account.id}
                    buttonClassName="p-1.5 rounded-md text-purple-600 hover:bg-purple-50 transition-colors"
                    triggerContent={<User className="h-5 w-5" />}
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
                    buttonClassName="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                    triggerContent={<Plus className="h-5 w-5" />}
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
                    buttonClassName="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 transition-colors"
                    triggerContent={<Minus className="h-5 w-5" />}
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
                    buttonClassName="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                    triggerContent={<ArrowLeftRight className="h-5 w-5" />}
                    onOpen={stopCardNavigation}
                  />
                </div>
              </CustomTooltip>
              <CustomTooltip content="Lend / Debt">
                <div>
                  <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="debt"
                    defaultSourceAccountId={account.id}
                    buttonClassName="p-1.5 rounded-md text-purple-600 hover:bg-purple-50 transition-colors"
                    triggerContent={<User className="h-5 w-5" />}
                    onOpen={stopCardNavigation}
                  />
                </div>
              </CustomTooltip>
            </>
          )}
        </div>

        {cashback?.maxCashback ? (
          <div
            className="text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 transition-colors"
            onClick={openDetails}
          >
            Cashback Remains: <span className="text-slate-900 font-bold">{numberFormatter.format(Math.max(0, cashback.maxCashback - (cashback.earnedSoFar ?? 0)))}</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
            onClick={openDetails}
          >
            Details
            <ChevronRight className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  )
}
