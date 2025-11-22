'use client'

import Link from 'next/link'
import {
  ArrowLeftRight,
  CreditCard,
  Minus,
  Pencil,
  PiggyBank,
  Plus,
  User,
  Wallet,
  Clock4,
  Eye,
} from 'lucide-react'
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

function getInitial(name: string) {
  const [first = ''] = name.split(' ')
  return first.charAt(0).toUpperCase()
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

function ActionButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 text-[11px] text-slate-600" title={label}>
      {children}
      <span className="font-semibold">{label}</span>
    </div>
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
      <div className={`h-32 w-full bg-gradient-to-r ${getGradient(account.type)} relative overflow-hidden`}>
        {account.img_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.img_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
        )}
        <div className="absolute -bottom-6 left-4 h-12 w-16 rounded-md border-4 border-white bg-white p-1 shadow-sm">
          {account.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.logo_url} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded bg-slate-100 text-sm font-semibold text-slate-700">
              {getInitial(account.name)}
            </div>
          )}
        </div>
        <div className="absolute bottom-2 left-4 right-4 flex items-end justify-between gap-3 text-white">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Link href={`/accounts/${account.id}`} className="text-base font-semibold whitespace-nowrap">
                {account.name}
              </Link>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {getAccountTypeLabel(account.type)}
              </span>
            </div>
            <p className="text-xs text-white/80">{statusLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-white/80">Balance</p>
            <p className={`text-xl font-bold leading-tight whitespace-nowrap ${balanceTone}`}>
              {formatCurrency(account.current_balance)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 pt-8">
        <div className="flex items-center justify-end gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700">
            <Wallet className="h-3 w-3" />
            {account.currency}
          </span>
          <EditAccountDialog
            account={account}
            collateralAccounts={collateralAccounts}
            triggerContent={<Pencil className="h-4 w-4" />}
            buttonClassName="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700"
            onOpen={stopCardNavigation}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isCreditCard && (
            <>
              <div className="flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-rose-700">
                <Clock4 className="h-3 w-3" />
                <span>Due: {dueDate ? dueDate.toLocaleDateString('en-CA') : 'Not set'}</span>
              </div>
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
          {account.type === 'debt' && (
            <div className="flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-orange-700">
              <CreditCard className="h-3 w-3" />
              <span>Debt account</span>
            </div>
          )}
        </div>

        <div className="mt-1 grid grid-cols-5 gap-2 border-t border-dashed pt-3">
          {showTransfer ? (
            <ActionButton label="Transfer">
              <AddTransactionDialog
                accounts={selectableAccounts}
                categories={categories}
                people={people}
                defaultType="transfer"
                defaultSourceAccountId={account.id}
                triggerContent={
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 text-blue-700 hover:border-blue-400">
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
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 text-blue-700 hover:border-blue-400">
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
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-200 text-emerald-700 hover:border-emerald-400">
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
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 text-rose-700 hover:border-rose-400">
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
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-200 text-orange-700 hover:border-orange-400">
                  <User className="h-4 w-4" />
                </span>
              }
              onOpen={stopCardNavigation}
            />
          </ActionButton>
          <ActionButton label="Details">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700"
              onClick={event => {
                stopCardNavigation(event)
                openDetails()
              }}
            >
              <Eye className="h-4 w-4" />
            </button>
          </ActionButton>
        </div>
      </div>
    </article>
  )
}
