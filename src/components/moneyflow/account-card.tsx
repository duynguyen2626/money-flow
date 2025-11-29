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
  PiggyBank
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
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      onClick={openDetails}
    >
      {/* Top Section: Header (Name & Limit) */}
      <div className="flex items-start justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <h3 className="font-bold text-slate-900 text-base leading-tight truncate" title={account.name}>
            {account.name}
          </h3>
          <div onClick={stopCardNavigation}>
            <EditAccountDialog
              account={account}
              collateralAccounts={collateralAccounts}
              triggerContent={
                <div className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer rounded-full hover:bg-slate-100 transition-colors">
                  <Pencil className="h-3 w-3" />
                </div>
              }
              onOpen={stopCardNavigation}
            />
          </div>
        </div>

        {isCreditCard && (
          <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 whitespace-nowrap">
            <span className="text-slate-400">Limit:</span>
            <span className="font-mono font-semibold">{numberFormatter.format(displayLimit)}</span>
          </span>
        )}
      </div>

      {/* Middle Section: Image & Info */}
      <div className="flex items-start gap-3 px-3 pb-3">
        {/* Left: Avatar */}
        <div className="flex-shrink-0" onClick={stopCardNavigation}>
          <EditAccountDialog
            account={account}
            collateralAccounts={collateralAccounts}
            triggerContent={
              <div className={cn(
                "flex items-center justify-center bg-slate-50 shadow-sm ring-1 ring-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity",
                isCreditCard ? "h-12 w-20 rounded-md" : "h-12 w-12 rounded-md"
              )}>
                {account.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.logo_url as string}
                    alt={account.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-slate-400 scale-75">
                    {getAccountIcon(account.type)}
                  </div>
                )}
              </div>
            }
            onOpen={stopCardNavigation}
          />
        </div>

        {/* Right: Badges & Balance */}
        <div className="flex-1 min-w-0 flex flex-col items-end gap-1">
          {/* Due Date */}
          {dueStatus && (
            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${dueStatus.tone}`}>
              <Clock4 className="h-3 w-3" />
              {dueStatus.label}
            </span>
          )}

          {/* Parent Badge */}
          {isCreditCard && isChildCard && parentAccount && (
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 whitespace-nowrap">
              <span className="text-slate-400">Parent:</span>
              <span>{parentAccount.name}</span>
            </span>
          )}

          {/* Cashback Badge */}
          {cashbackBadge}

          {/* Balance */}
          <p className={cn(
            "text-lg font-bold tracking-tight leading-tight mt-0.5",
            isCreditCard
              ? (displayBalance < displayLimit * 0.3 ? 'text-amber-600' : 'text-emerald-600')
              : (displayBalance < 0 ? 'text-red-600' : 'text-slate-900')
          )}>
            {numberFormatter.format(displayBalance)}
          </p>
        </div>
      </div>

      {/* Bottom Section: Quick Actions (Icon Only) */}
      <div className="flex items-center gap-3 p-3 bg-slate-50/50 border-t border-slate-100" onClick={stopCardNavigation}>
        {isCreditCard ? (
          <>
            <ActionButton label="Pay Card">
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="transfer"
                defaultDebtAccountId={account.id}
                buttonClassName="h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 shadow-sm"
                triggerContent={<CreditCard className="h-4 w-4" />}
                onOpen={stopCardNavigation}
              />
            </ActionButton>
            <ActionButton label="Income">
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="income"
                defaultSourceAccountId={account.id}
                buttonClassName="h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                triggerContent={<Plus className="h-4 w-4" />}
                onOpen={stopCardNavigation}
              />
            </ActionButton>
            <ActionButton label="Expense">
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="expense"
                defaultSourceAccountId={account.id}
                buttonClassName="h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-sm"
                triggerContent={<Minus className="h-4 w-4" />}
                onOpen={stopCardNavigation}
              />
            </ActionButton>
            <ActionButton label="Lend / Debt">
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="debt"
                defaultSourceAccountId={account.id}
                buttonClassName="h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 shadow-sm"
                triggerContent={<User className="h-4 w-4" />}
                onOpen={stopCardNavigation}
              />
            </ActionButton>
          </>
        ) : (
          <>
            <ActionButton label="Income">
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="income"
                defaultSourceAccountId={account.id}
                buttonClassName="h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                triggerContent={<Plus className="h-4 w-4" />}
                onOpen={stopCardNavigation}
              />
            </ActionButton>
            <ActionButton label="Expense">
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="expense"
                defaultSourceAccountId={account.id}
                buttonClassName="h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-sm"
                triggerContent={<Minus className="h-4 w-4" />}
                onOpen={stopCardNavigation}
              />
            </ActionButton>
            <ActionButton label="Transfer">
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="transfer"
                defaultSourceAccountId={account.id}
                buttonClassName="h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 shadow-sm"
                triggerContent={<ArrowLeftRight className="h-4 w-4" />}
                onOpen={stopCardNavigation}
              />
            </ActionButton>
            <ActionButton label="Lend / Debt">
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="debt"
                defaultSourceAccountId={account.id}
                buttonClassName="h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 shadow-sm"
                triggerContent={<User className="h-4 w-4" />}
                onOpen={stopCardNavigation}
              />
            </ActionButton>
          </>
        )}

        <div className="flex-1" />

        {/* Re-sync Button */}
        <ActionButton label="Re-sync Balance">
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-700 shadow-sm"
          >
            <RefreshCw className={cn("h-4 w-4", isRecalculating && "animate-spin")} />
          </button>
        </ActionButton>
      </div>

      {/* Confirm Money Received Overlay */}
      <div className="absolute top-4 right-4" onClick={stopCardNavigation}>
        <ConfirmMoneyReceived accountId={account.id} minimal />
      </div>
    </div>
  )
}
