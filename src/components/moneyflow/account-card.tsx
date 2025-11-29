'use client'

import Link from 'next/link'
import {
  CreditCard,
  Wallet,
  Landmark,
  PiggyBank,
  User,
  Plus,
  Minus,
  ChevronRight,
  ArrowLeftRight,
  Pencil,
  Clock4
} from 'lucide-react'
import { MouseEvent, ReactNode } from 'react'
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

  // Logic for credit card stats
  const isCreditCard = account.type === 'credit_card'
  const dueDate = computeNextDueDate(account.cashback_config ?? null)
  const dueStatus = getDueStatus(dueDate)

  // Parent/Child Logic
  const sharedLimitParentId = getSharedLimitParentId(account.cashback_config)
  const parentAccount = sharedLimitParentId ? allAccounts.find(a => a.id === sharedLimitParentId) : null
  const isChildCard = !!parentAccount
  const isParentCard = !isChildCard && allAccounts.some(a => getSharedLimitParentId(a.cashback_config) === account.id)

  // Calculate credit card metrics
  const creditLimit = account.credit_limit ?? 0
  const netBalance = (account.total_in ?? 0) - (account.total_out ?? 0) // Usually negative for credit cards
  const currentDebt = Math.abs(netBalance < 0 ? netBalance : 0) // Absolute value of negative balance

  // Available = Limit + Net Balance (if netBalance is -30k and limit is 150k, available is 120k)
  let availableBalance = creditLimit + netBalance
  let displayLimit = creditLimit
  let displayDebt = currentDebt
  let isSharedAvailable = false

  // For child cards, calculate shared available
  if (isChildCard && parentAccount) {
    // Shared Available = Parent Limit + (Parent Net Balance + Sum(Other Child Net Balances))
    // Actually, simpler: Parent Available = Parent Limit - Total Debt (Parent + Children)
    // The child sees the SAME available balance as the parent.

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
    availableBalance = displayLimit - totalDebt

    // Own Debt is just this card's debt
    displayDebt = currentDebt
    isSharedAvailable = true
  }

  // For parent cards, calculate total debt including children
  if (isParentCard) {
    const childCards = allAccounts.filter(a => getSharedLimitParentId(a.cashback_config) === account.id)
    const totalChildDebt = childCards.reduce((sum, child) => {
      const childNetBalance = (child.total_in ?? 0) - (child.total_out ?? 0)
      return sum + Math.abs(childNetBalance < 0 ? childNetBalance : 0)
    }, 0)

    displayDebt = currentDebt + totalChildDebt
    availableBalance = creditLimit - displayDebt
  }

  const openDetails = () => {
    router.push(`/accounts/${account.id}`)
  }

  const stopCardNavigation = (event?: MouseEvent) => {
    event?.stopPropagation?.()
  }

  const dialogBaseProps = {
    accounts: allAccounts,
    categories,
    people,
    shops,
  }

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer h-full"
      onClick={openDetails}
    >
      {/* Quick Add Button (Top-Right) */}
      <div className="absolute top-3 right-3 z-10" onClick={stopCardNavigation}>
        <AddTransactionDialog
          {...dialogBaseProps}
          defaultType={isCreditCard ? 'expense' : 'expense'}
          defaultSourceAccountId={account.id}
          buttonClassName="h-8 w-8 inline-flex items-center justify-center rounded-full bg-slate-900 text-white shadow-md hover:bg-slate-800 transition-colors"
          triggerContent={<Plus className="h-5 w-5" />}
          onOpen={stopCardNavigation}
        />
      </div>

      {/* Card Content */}
      <div className="flex flex-col p-5 gap-4 h-full">
        {/* Header: Avatar & Name */}
        <div className="flex flex-col items-center text-center gap-3">
          {/* Avatar with Edit Action */}
          <div className="relative group/avatar" onClick={stopCardNavigation}>
            <EditAccountDialog
              account={account}
              collateralAccounts={collateralAccounts}
              triggerContent={
                <div className={`flex items-center justify-center bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden cursor-pointer transition-transform active:scale-95 ${isCreditCard ? 'h-12 w-20 rounded-md' : 'h-14 w-14 rounded-full'}`}>
                  {account.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={account.logo_url}
                      alt={account.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-slate-500">
                      {getAccountIcon(account.type)}
                    </div>
                  )}
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                    <Pencil className="h-4 w-4 text-white drop-shadow-md" />
                  </div>
                </div>
              }
              onOpen={stopCardNavigation}
            />
          </div>

          {/* Name & Badges */}
          <div className="flex flex-col items-center gap-1 w-full">
            <h3 className="font-semibold text-slate-900 truncate max-w-full" title={account.name}>
              {account.name}
            </h3>
            <div className="flex flex-wrap justify-center gap-1.5">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getAccountTypeBadgeColor(account.type)}`}>
                {getAccountTypeLabel(account.type)}
              </span>
              {isCreditCard && isChildCard && parentAccount && (
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                  Shared Limit
                </span>
              )}
              {isCreditCard && isParentCard && (
                <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                  Main Card
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Balance Section */}
        <div className="flex flex-col items-center justify-center flex-1 py-2">
          {isCreditCard ? (
            <>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                {isSharedAvailable ? 'Shared Available' : 'Available'}
              </p>
              <p className={cn(
                "text-2xl font-bold tracking-tight",
                availableBalance < displayLimit * 0.3 ? 'text-amber-600' : 'text-emerald-600'
              )}>
                {numberFormatter.format(availableBalance)}
              </p>

              {/* Secondary Stats */}
              <div className="flex flex-col items-center gap-1 mt-2">
                {/* Own Debt */}
                <div className="text-xs text-slate-500">
                  Own Debt: <span className={cn("font-medium", displayDebt > 0 ? 'text-red-600' : 'text-slate-600')}>
                    {numberFormatter.format(displayDebt)}
                  </span>
                </div>

                {/* Due Date Badge */}
                {dueStatus && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${dueStatus.tone}`}>
                    <Clock4 className="h-3 w-3" />
                    {dueStatus.label}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                Current Balance
              </p>
              <p className={cn(
                "text-2xl font-bold tracking-tight",
                account.current_balance < 0 ? 'text-red-600' : 'text-slate-900'
              )}>
                {numberFormatter.format(account.current_balance)}
              </p>

              {/* Secondary Stats */}
              <div className="min-h-[20px] mt-1">
                {account.type === 'savings' && (
                  <div className="text-xs text-slate-400">
                    Savings Account
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm Money Received Overlay */}
      <div className="absolute top-4 left-4" onClick={stopCardNavigation}>
        <ConfirmMoneyReceived accountId={account.id} />
      </div>
    </div>
  )
}
