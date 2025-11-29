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
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      onClick={openDetails}
    >
      {/* Section 1: Identity (Top) */}
      <div className={`flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 p-4 ${isCreditCard ? 'flex-row-reverse justify-between' : ''}`}>
        {/* Avatar/Icon */}
        <div className="flex-shrink-0">
          <div className={`flex items-center justify-center bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden ${isCreditCard ? 'h-16 w-24 rounded-lg' : 'h-12 w-12 rounded-full'}`}>
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
          </div>
        </div>

        {/* Name & Type */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 truncate" title={account.name}>
              {account.name}
            </h3>
            {/* Edit Action (Always Visible) */}
            <div onClick={stopCardNavigation}>
              <EditAccountDialog
                account={account}
                collateralAccounts={collateralAccounts}
                triggerContent={
                  <div className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer rounded-full hover:bg-slate-100 transition-colors">
                    <Pencil className="h-3 w-3" />
                  </div>
                }
                onOpen={stopCardNavigation}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getAccountTypeBadgeColor(account.type)}`}>
              {getAccountTypeLabel(account.type)}
            </span>
            {isCreditCard && isChildCard && parentAccount && (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                Linked to {parentAccount.name}
              </span>
            )}
            {isCreditCard && isParentCard && (
              <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                Main Card
              </span>
            )}
            {dueStatus && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${dueStatus.tone}`}>
                <Clock4 className="h-3 w-3" />
                {dueStatus.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Info & Stats (Body) */}
      <div className="flex flex-1 flex-col justify-center p-5 space-y-1">
        {isCreditCard ? (
          <>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {isSharedAvailable ? 'Shared Available' : 'Available'}
            </p>
            <p className={`text-2xl font-bold tracking-tight ${availableBalance < displayLimit * 0.3 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {numberFormatter.format(availableBalance)}
            </p>

            {/* Secondary Stats for Credit Cards */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span>Debt: <span className={`font-medium ${displayDebt > 0 ? 'text-red-600' : 'text-slate-600'}`}>{numberFormatter.format(displayDebt)}</span></span>
              <span className="text-slate-300">|</span>
              <span>Limit: <span className="font-medium text-slate-600">{numberFormatter.format(displayLimit)}</span></span>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Current Balance
            </p>
            <p className={`text-2xl font-bold tracking-tight ${account.current_balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {numberFormatter.format(account.current_balance)}
            </p>

            {/* Secondary Stats for Non-Credit Accounts */}
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

      {/* Section 3: Actions (Footer) */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 p-3">
        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1" onClick={stopCardNavigation}>
          {isCreditCard ? (
            <>
              <ActionButton label="Pay Card">
                <AddTransactionDialog
                  {...dialogBaseProps}
                  defaultType="transfer"
                  defaultDebtAccountId={account.id}
                  buttonClassName="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                  triggerContent={<CreditCard className="h-4 w-4" />}
                  onOpen={stopCardNavigation}
                />
              </ActionButton>
              <ActionButton label="Income">
                <AddTransactionDialog
                  {...dialogBaseProps}
                  defaultType="income"
                  defaultSourceAccountId={account.id}
                  buttonClassName="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                  triggerContent={<Plus className="h-4 w-4" />}
                  onOpen={stopCardNavigation}
                />
              </ActionButton>
              <ActionButton label="Expense">
                <AddTransactionDialog
                  {...dialogBaseProps}
                  defaultType="expense"
                  defaultSourceAccountId={account.id}
                  buttonClassName="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  triggerContent={<Minus className="h-4 w-4" />}
                  onOpen={stopCardNavigation}
                />
              </ActionButton>
              <ActionButton label="Lend / Debt">
                <AddTransactionDialog
                  {...dialogBaseProps}
                  defaultType="debt"
                  defaultSourceAccountId={account.id}
                  buttonClassName="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors text-purple-600 hover:bg-purple-50 hover:text-purple-700"
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
                  buttonClassName="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                  triggerContent={<Plus className="h-4 w-4" />}
                  onOpen={stopCardNavigation}
                />
              </ActionButton>
              <ActionButton label="Expense">
                <AddTransactionDialog
                  {...dialogBaseProps}
                  defaultType="expense"
                  defaultSourceAccountId={account.id}
                  buttonClassName="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  triggerContent={<Minus className="h-4 w-4" />}
                  onOpen={stopCardNavigation}
                />
              </ActionButton>
              <ActionButton label="Transfer">
                <AddTransactionDialog
                  {...dialogBaseProps}
                  defaultType="transfer"
                  defaultSourceAccountId={account.id}
                  buttonClassName="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  triggerContent={<ArrowLeftRight className="h-4 w-4" />}
                  onOpen={stopCardNavigation}
                />
              </ActionButton>
              <ActionButton label="Lend / Debt">
                <AddTransactionDialog
                  {...dialogBaseProps}
                  defaultType="debt"
                  defaultSourceAccountId={account.id}
                  buttonClassName="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                  triggerContent={<User className="h-4 w-4" />}
                  onOpen={stopCardNavigation}
                />
              </ActionButton>
            </>
          )}
        </div>

        {/* Details Link */}
        <div className="flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors group-hover:text-blue-600">
          Details
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Confirm Money Received Overlay (if needed) */}
      <div className="absolute top-4 right-14" onClick={stopCardNavigation}>
        <ConfirmMoneyReceived accountId={account.id} />
      </div>
    </div>
  )
}
