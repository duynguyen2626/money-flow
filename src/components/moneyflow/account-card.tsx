'use client'

import Link from 'next/link'
import { ArrowLeftRight, CreditCard, Minus, Pencil, PiggyBank, Plus, User, Clock4, Eye } from 'lucide-react'
import { MouseEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { computeNextDueDate, formatCurrency, getAccountTypeLabel } from '@/lib/account-utils'
import { Account, AccountCashbackSnapshot, Category, Person } from '@/types/moneyflow.types'
import { AddTransactionDialog } from './add-transaction-dialog'
import { EditAccountDialog } from './edit-account-dialog'

type AccountCardProps = {
  account: Account
  cashback?: AccountCashbackSnapshot
  categories: Category[]
  people: Person[]
  collateralAccounts?: Account[]
  allAccounts?: Account[]
}

function getDueStatus(dueDate: Date | null) {
  if (!dueDate) return { label: 'No statement date', tone: 'text-slate-500 bg-slate-100' }

  const now = new Date()
  const diffMs = dueDate.getTime() - now.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (daysLeft <= 3) {
    return { label: `${daysLeft} days left`, tone: 'text-red-700 bg-red-100' }
  }

  if (daysLeft <= 7) {
    return { label: `${daysLeft} days left`, tone: 'text-amber-700 bg-amber-100' }
  }

  return { label: `${daysLeft} days left`, tone: 'text-emerald-700 bg-emerald-100' }
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
}: AccountCardProps) {
  const router = useRouter()
  const dueDate = computeNextDueDate(account.cashback_config ?? null)
  const dueStatus = getDueStatus(dueDate)

  const isCreditCard = account.type === 'credit_card'
  const isNegative = account.current_balance < 0
  const statusLabel =
    typeof account.is_active === 'boolean' ? (account.is_active ? 'Active' : 'Inactive') : 'Active'
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
    cashbackLeft === null ? 'Unlimited' : formatCurrency(Math.max(0, cashbackLeft))
  const showTransfer = account.type !== 'credit_card'

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      onClick={openDetails}
      role="button"
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openDetails()
        }
      }}
    >
      <div className={`h-28 w-full bg-gradient-to-r ${getGradient(account.type)} relative overflow-hidden`}>
        {account.img_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.img_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
        )}
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-slate-600 backdrop-blur transition hover:bg-white hover:text-slate-800"
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
            buttonClassName="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-slate-600 backdrop-blur transition hover:bg-white hover:text-slate-800"
            onOpen={stopCardNavigation}
          />
        </div>
        <div className="absolute bottom-2 left-4 right-4 flex items-end justify-between gap-3 text-white">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Link href={`/accounts/${account.id}`} className="text-base font-semibold whitespace-nowrap">
                {account.name}
              </Link>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur">
              <span className="text-white/90">{statusLabel}</span>
              <span className="text-white/80">•</span>
              <span className="text-white">{getAccountTypeLabel(account.type)}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-white/80">Balance</p>
            <div className="mt-1 inline-flex items-center rounded-lg bg-gray-50 px-3 py-1 shadow-sm">
              <p className={`text-2xl font-bold leading-tight tracking-tight whitespace-nowrap ${balanceTone}`}>
                {balanceDisplay}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isCreditCard && (
            <>
              <div className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                <PiggyBank className="h-3 w-3" />
                <span>Back remaining: {cashbackLabel}</span>
              </div>
              {typeof account.credit_limit === 'number' && account.credit_limit > 0 && (
                <div className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-700">
                  <span>Limit: {formatCurrency(account.credit_limit)}</span>
                </div>
              )}
            </>
          )}
          {!isCreditCard && typeof account.credit_limit === 'number' && account.credit_limit > 0 && (
            <div className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-700">
              <span>Limit: {formatCurrency(account.credit_limit)}</span>
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 pt-3">
          {isCreditCard ? (
            <div className="flex w-full flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <ActionButton label="Pay card">
                  <AddTransactionDialog
                    accounts={selectableAccounts}
                    categories={categories}
                    people={people}
                    defaultType="transfer"
                    defaultDebtAccountId={account.id}
                    triggerContent={
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600">
                        <CreditCard className="h-4 w-4" />
                      </span>
                    }
                    onOpen={stopCardNavigation}
                  />
                </ActionButton>
                <ActionButton label="Income">
                  <AddTransactionDialog
                    accounts={selectableAccounts}
                    categories={categories}
                    people={people}
                    defaultType="income"
                    defaultSourceAccountId={account.id}
                    triggerContent={
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600">
                        <Plus className="h-4 w-4" />
                      </span>
                    }
                    onOpen={stopCardNavigation}
                  />
                </ActionButton>
                <ActionButton label="Expense">
                  <AddTransactionDialog
                    accounts={selectableAccounts}
                    categories={categories}
                    people={people}
                    defaultType="expense"
                    defaultSourceAccountId={account.id}
                    triggerContent={
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
                        <Minus className="h-4 w-4" />
                      </span>
                    }
                    onOpen={stopCardNavigation}
                  />
                </ActionButton>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${dueStatus.tone}`}>
                <Clock4 className="h-3 w-3" />
                <span>{dueStatus.label}</span>
              </div>
            </div>
          ) : (
            <>
              {showTransfer ? (
                <ActionButton label="Transfer">
                  <AddTransactionDialog
                    accounts={selectableAccounts}
                    categories={categories}
                    people={people}
                    defaultType="transfer"
                    defaultSourceAccountId={account.id}
                    triggerContent={
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">
                        <ArrowLeftRight className="h-4 w-4" />
                      </span>
                    }
                    onOpen={stopCardNavigation}
                  />
                </ActionButton>
              ) : (
                <ActionButton label="Pay card">
                  <AddTransactionDialog
                    accounts={selectableAccounts}
                    categories={categories}
                    people={people}
                    defaultType="transfer"
                    defaultDebtAccountId={account.id}
                    triggerContent={
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600">
                        <CreditCard className="h-4 w-4" />
                      </span>
                    }
                    onOpen={stopCardNavigation}
                  />
                </ActionButton>
              )}
              <ActionButton label="Income">
                <AddTransactionDialog
                  accounts={selectableAccounts}
                  categories={categories}
                  people={people}
                  defaultType="income"
                  defaultSourceAccountId={account.id}
                  triggerContent={
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600">
                      <Plus className="h-4 w-4" />
                    </span>
                  }
                  onOpen={stopCardNavigation}
                />
              </ActionButton>
              <ActionButton label="Expense">
                <AddTransactionDialog
                  accounts={selectableAccounts}
                  categories={categories}
                  people={people}
                  defaultType="expense"
                  defaultSourceAccountId={account.id}
                  triggerContent={
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
                      <Minus className="h-4 w-4" />
                    </span>
                  }
                  onOpen={stopCardNavigation}
                />
              </ActionButton>
              <ActionButton label="Debt">
                <AddTransactionDialog
                  accounts={selectableAccounts}
                  categories={categories}
                  people={people}
                  defaultType="debt"
                  defaultDebtAccountId={account.id}
                  defaultSourceAccountId={account.id}
                  triggerContent={
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                      <User className="h-4 w-4" />
                    </span>
                  }
                  onOpen={stopCardNavigation}
                />
              </ActionButton>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
