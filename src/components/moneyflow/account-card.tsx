'use client'

import Link from 'next/link'
import { ArrowLeftRight, CreditCard, Minus, Pencil, PiggyBank, Plus, User, Clock4, Eye, Wallet, TrendingUp } from 'lucide-react'
import { MouseEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import {
  computeNextDueDate,
  formatCurrency,
  getAccountTypeLabel,
  getSharedLimitParentId,
} from '@/lib/account-utils'
import { Account, AccountCashbackSnapshot, Category, Person, Shop } from '@/types/moneyflow.types'
import { AddTransactionDialog } from './add-transaction-dialog'
import { EditAccountDialog } from './edit-account-dialog'
import { ConfirmMoneyReceived } from './confirm-money-received'

type AccountCardProps = {
  account: Account
  cashback?: AccountCashbackSnapshot
  categories: Category[]
  people: Person[]
  collateralAccounts?: Account[]
  allAccounts?: Account[]
  shops: Shop[]
}

function getDueStatus(dueDate: Date | null) {
  if (!dueDate) return { label: 'No statement date', tone: 'text-slate-500 bg-slate-100' }

  const now = new Date()
  const diffMs = dueDate.getTime() - now.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (daysLeft <= 3) {
    return { label: `Due in ${daysLeft} days`, tone: 'text-red-700 bg-red-100' }
  }

  if (daysLeft <= 7) {
    return { label: `Due in ${daysLeft} days`, tone: 'text-amber-700 bg-amber-100' }
  }

  return { label: `Due in ${daysLeft} days`, tone: 'text-emerald-700 bg-emerald-100' }
}

function getGradient(type: Account['type']) {
  if (type === 'credit_card') return 'from-slate-900 via-slate-800 to-slate-700'
  if (['bank', 'cash', 'ewallet'].includes(type)) return 'from-blue-600 via-cyan-500 to-emerald-500'
  if (['savings', 'investment', 'asset'].includes(type)) return 'from-emerald-400 via-teal-300 to-amber-200'
  if (type === 'debt') return 'from-amber-500 via-orange-400 to-rose-400'
  return 'from-slate-200 via-slate-100 to-white'
}

const badgeColors: Record<Account['type'] | 'default', string> = {
  credit_card: 'bg-amber-50 text-amber-700',
  bank: 'bg-blue-50 text-blue-700',
  cash: 'bg-blue-50 text-blue-700',
  ewallet: 'bg-blue-50 text-blue-700',
  savings: 'bg-emerald-50 text-emerald-700',
  investment: 'bg-emerald-50 text-emerald-700',
  asset: 'bg-emerald-50 text-emerald-700',
  debt: 'bg-orange-50 text-orange-700',
  default: 'bg-slate-100 text-slate-700',
}

function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="group/tooltip relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow transition duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100">
        {label}
      </span>
    </div>
  )
}

function ActionButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip label={label}>{children}</Tooltip>
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
  const dueDate = computeNextDueDate(account.cashback_config ?? null)
  const dueStatus = getDueStatus(dueDate)

  const isCreditCard = account.type === 'credit_card'
  const isNegative = account.current_balance < 0
  const statusLabel =
    typeof account.is_active === 'boolean' ? (account.is_active ? 'Active' : 'Inactive') : 'Active'
  const sharedLimitParentId = getSharedLimitParentId(account.cashback_config ?? null)
  const sharedLimitParent =
    sharedLimitParentId != null ? allAccounts.find(acc => acc.id === sharedLimitParentId) ?? null : null
  const selectableAccounts = allAccounts.length ? allAccounts : [account]

  const openDetails = () => {
    router.push(`/accounts/${account.id}`)
  }

  const stopCardNavigation = (event?: MouseEvent) => {
    event?.stopPropagation?.()
  }

  const cashbackLeft =
    cashback && typeof cashback.remainingBudget === 'number'
      ? cashback.remainingBudget
      : null

  const cashbackProgress =
    cashback && typeof cashback.progress === 'number' ? cashback.progress : 0

  const badgeTone = badgeColors[account.type] ?? badgeColors.default
  const balanceTone = account.current_balance < 0 ? 'text-red-600' : 'text-slate-900'
  const balanceDisplay = new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(account.current_balance)
  const cashbackLabel =
    cashbackLeft === null ? 'Unlimited' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.max(0, cashbackLeft))
  const showTransfer = account.type !== 'credit_card'
  const dialogBaseProps = {
    accounts: allAccounts,
    categories,
    people,
    shops,
  }

  const creditLimit = account.credit_limit ?? 0
  const availableBalance = creditLimit + account.current_balance
  const debtAmount = Math.abs(account.current_balance)

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md h-full"
      role="button"
      tabIndex={0}
    >
      {/* Background Image or Gradient - Full Card Height */}
      <div className={`absolute inset-0 bg-gradient-to-r ${getGradient(account.type)}`}>
        {account.img_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.img_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
        )}
      </div>

      {/* Content Overlay - Full Height */}
      <div
        className="relative z-10 flex flex-col h-full cursor-pointer min-h-[180px]"
        onClick={openDetails}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openDetails()
          }
        }}
      >
        {/* Top Section: Name/Status (Left) & Actions (Right) */}
        <div className="flex items-start justify-between p-4">
          {/* Left: Name & Subtitle */}
          <div className="flex flex-col gap-0.5 rounded-xl bg-white/90 px-3 py-2 shadow-lg backdrop-blur-md max-w-[70%]">
            <Link href={`/accounts/${account.id}`} className="block">
              <span className="text-lg font-bold text-slate-900 leading-tight truncate block">
                {account.name}
              </span>
            </Link>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 truncate">
              <span className={account.is_active ? "text-emerald-700" : "text-slate-500"}>
                {statusLabel}
              </span>
              <span>•</span>
              <span>{getAccountTypeLabel(account.type)}</span>
            </div>
          </div>

          {/* Right: Actions & Limit */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/50 text-white backdrop-blur-md transition hover:bg-white/70 border border-white/30 shadow-md"
                onClick={event => {
                  stopCardNavigation(event)
                  openDetails()
                }}
                title="View details"
              >
                <Eye className="h-4 w-4" />
              </button>
              <EditAccountDialog
                account={account}
                collateralAccounts={collateralAccounts}
                triggerContent={<Pencil className="h-4 w-4" />}
                buttonClassName="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/50 text-white backdrop-blur-md transition hover:bg-white/70 border border-white/30 shadow-md"
                onOpen={stopCardNavigation}
              />
            </div>
            {typeof account.credit_limit === 'number' && account.credit_limit > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-white text-[10px] font-bold shadow-sm backdrop-blur-sm border border-white/10">
                <TrendingUp className="h-3 w-3" />
                <span>{new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(account.credit_limit)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Section: Cashback (Left) & Balances (Right) */}
        <div className="flex items-end justify-between p-4 gap-2">
          {/* Left: Cashback (Yellow) */}
          <div className="flex flex-col gap-2">
            {isCreditCard && (
              <div className="flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1.5 text-slate-900 text-xs font-bold shadow-md">
                <PiggyBank className="h-3.5 w-3.5" />
                <span>{cashbackLabel}</span>
              </div>
            )}
          </div>

          {/* Right: Balances */}
          <div className="flex flex-col items-end gap-2">
            {isCreditCard ? (
              <>
                {/* Debt (Small) */}
                {debtAmount > 0 && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-rose-100 px-2 py-1 shadow-sm border border-rose-200">
                    <Wallet className="h-3 w-3 text-rose-600" />
                    <span className="text-xs font-bold text-rose-700">
                      {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(debtAmount)}
                    </span>
                  </div>
                )}
                {/* Available (Large) */}
                {creditLimit > 0 && (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 shadow-lg">
                    <CreditCard className="h-5 w-5 text-white" />
                    <span className="text-2xl font-black text-white tracking-tight">
                      {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(availableBalance)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              /* Normal Account Balance */
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 shadow-lg backdrop-blur-md">
                <Wallet className="h-5 w-5 text-slate-700" />
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {balanceDisplay}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Section - Overlay on Background */}
        <div className="flex items-center justify-between gap-2 p-3 bg-black/20 backdrop-blur-sm border-t border-white/20">
          {/* Left: Quick Action Buttons */}
          <div className="flex items-center gap-1.5">
            {isCreditCard ? (
              <>
                <ActionButton label="Pay card">
                  <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="transfer"
                    defaultDebtAccountId={account.id}
                    triggerContent={
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white transition-all hover:bg-orange-600 hover:scale-110 shadow-md">
                        <CreditCard className="h-4 w-4" />
                      </span>
                    }
                    onOpen={stopCardNavigation}
                  />
                </ActionButton>
                <ActionButton label="Income">
                  <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="income"
                    defaultSourceAccountId={account.id}
                    triggerContent={
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white transition-all hover:bg-emerald-600 hover:scale-110 shadow-md">
                        <Plus className="h-4 w-4" />
                      </span>
                    }
                    onOpen={stopCardNavigation}
                  />
                </ActionButton>
                <ActionButton label="Expense">
                  <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="expense"
                    defaultSourceAccountId={account.id}
                    triggerContent={
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white transition-all hover:bg-rose-600 hover:scale-110 shadow-md">
                        <Minus className="h-4 w-4" />
                      </span>
                    }
                    onOpen={stopCardNavigation}
                  />
                </ActionButton>
              </>
            ) : (
              <>
                {showTransfer ? (
                  <ActionButton label="Transfer">
                    <AddTransactionDialog
                      {...dialogBaseProps}
                      defaultType="transfer"
                      defaultSourceAccountId={account.id}
                      triggerContent={
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white transition-all hover:bg-blue-600 hover:scale-110 shadow-md">
                          <ArrowLeftRight className="h-4 w-4" />
                        </span>
                      }
                      onOpen={stopCardNavigation}
                    />
                  </ActionButton>
                ) : (
                  <ActionButton label="Pay card">
                    <AddTransactionDialog
                      {...dialogBaseProps}
                      defaultType="transfer"
                      defaultDebtAccountId={account.id}
                      triggerContent={
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white transition-all hover:bg-orange-600 hover:scale-110 shadow-md">
                          <CreditCard className="h-4 w-4" />
                        </span>
                      }
                      onOpen={stopCardNavigation}
                    />
                  </ActionButton>
                )}
                <ActionButton label="Income">
                  <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="income"
                    defaultSourceAccountId={account.id}
                    triggerContent={
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white transition-all hover:bg-emerald-600 hover:scale-110 shadow-md">
                        <Plus className="h-4 w-4" />
                      </span>
                    }
                    onOpen={stopCardNavigation}
                  />
                </ActionButton>
                <ActionButton label="Expense">
                  <AddTransactionDialog
                    {...dialogBaseProps}
                    defaultType="expense"
                    defaultSourceAccountId={account.id}
                    triggerContent={
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white transition-all hover:bg-rose-600 hover:scale-110 shadow-md">
                        <Minus className="h-4 w-4" />
                      </span>
                    }
                    onOpen={stopCardNavigation}
                  />
                </ActionButton>
                {account.type === 'debt' ? (
                  <ActionButton label="Repay / Settle">
                    <AddTransactionDialog
                      {...dialogBaseProps}
                      defaultType={account.current_balance > 0 ? 'repayment' : 'debt'}
                      defaultPersonId={account.id}
                      defaultAmount={Math.abs(account.current_balance)}
                      triggerContent={
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500 text-white transition-all hover:bg-green-600 hover:scale-110 shadow-md">
                          <User className="h-4 w-4" />
                        </span>
                      }
                      onOpen={stopCardNavigation}
                    />
                  </ActionButton>
                ) : (
                  <ActionButton label="Debt">
                    <AddTransactionDialog
                      {...dialogBaseProps}
                      defaultType="debt"
                      defaultSourceAccountId={account.id}
                      triggerContent={
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white transition-all hover:bg-orange-600 hover:scale-110 shadow-md">
                          <User className="h-4 w-4" />
                        </span>
                      }
                      onOpen={stopCardNavigation}
                    />
                  </ActionButton>
                )}
              </>
            )}
          </div>

          {/* Center: Confirm Money Received */}
          <div className="flex-shrink-0">
            <ConfirmMoneyReceived accountId={account.id} />
          </div>

          {/* Right: Due Date Badge */}
          <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-md whitespace-nowrap ${dueStatus.tone === 'text-red-700 bg-red-100' ? 'bg-red-600 text-white' : dueStatus.tone === 'text-amber-700 bg-amber-100' ? 'bg-amber-400 text-slate-900' : 'bg-amber-400 text-slate-900'}`}>
            <Clock4 className="h-3.5 w-3.5" />
            <span className="font-extrabold">Due:</span>
            <span>{dueStatus.label.replace('Due in ', '').replace(' days', '')}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
