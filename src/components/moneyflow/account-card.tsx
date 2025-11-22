'use client'

import Link from 'next/link'
import { ArrowLeftRight, CreditCard, Minus, Pencil, Plus, Users } from 'lucide-react'

import { computeNextDueDate, formatCurrency, getAccountTypeLabel } from '@/lib/account-utils'
import { Account, AccountCashbackSnapshot, Category, Person } from '@/types/moneyflow.types'
import { Progress } from '@/components/ui/progress'
import { AddTransactionDialog } from './add-transaction-dialog'
import { EditAccountDialog } from './edit-account-dialog'
import { useRouter } from 'next/navigation'
import { MouseEvent } from 'react'

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

  return (
    <article
      className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md cursor-pointer"
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
      {account.img_url && (
        <div
          aria-hidden
          className="absolute inset-0 opacity-25 transition duration-300 group-hover:opacity-35"
          style={{
            backgroundImage: `url(${account.img_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      <header className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-lg font-semibold text-blue-700">
            {getInitial(account.name)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/accounts/${account.id}`}
            className="text-base font-semibold text-slate-900 hover:text-blue-700"
          >
            {account.name}
          </Link>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            {getAccountTypeLabel(account.type)}
          </span>
        </div>
            <p className="text-xs text-slate-500">{statusLabel}</p>
          </div>
        </div>
        <EditAccountDialog
          account={account}
          collateralAccounts={collateralAccounts}
          triggerContent={
            <div className="flex items-center gap-1 text-slate-600">
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit account</span>
            </div>
          }
          buttonClassName="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          onOpen={stopCardNavigation}
        />
      </header>

      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Current balance</p>
          <p
            className={`font-mono tabular-nums text-2xl font-semibold ${
              isNegative ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {formatCurrency(account.current_balance)}
          </p>
        </div>

        {isCreditCard && (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-600">Payment deadline</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${dueStatus.tone}`}>
                    {dueStatus.label}
                  </span>
                  {dueDate && (
                    <span className="text-xs text-slate-500">
                      {dueDate.toLocaleDateString('en-CA')}
                    </span>
                  )}
                </div>
              </div>
              {typeof account.credit_limit === 'number' && account.credit_limit > 0 && (
                <span className="text-xs font-semibold text-slate-500">
                  Limit: {formatCurrency(account.credit_limit)}
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Cashback left</span>
                <span className="font-semibold">
                  {cashbackLeft === null ? 'Unlimited' : formatCurrency(Math.max(0, cashbackLeft))}
                </span>
              </div>
              <Progress value={cashbackProgress} className="h-2" />
              <p className="text-[11px] text-slate-500">
                Spent {formatCurrency(cashback?.currentSpend ?? 0)}
                {cashback?.cycleLabel ? ` · Cycle ${cashback.cycleLabel}` : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      <footer className="relative z-10 flex flex-wrap items-center gap-2">
        {account.type !== 'credit_card' && (
          <AddTransactionDialog
            accounts={selectableAccounts}
            categories={categories}
            people={people}
            defaultType="transfer"
            defaultSourceAccountId={account.id}
            triggerContent={<ArrowLeftRight className="h-4 w-4" />}
            buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
            buttonText="Transfer"
          />
        )}
        {isCreditCard && (
          <AddTransactionDialog
            accounts={selectableAccounts}
            categories={categories}
            people={people}
            defaultType="transfer"
            defaultDebtAccountId={account.id}
            triggerContent={<CreditCard className="h-4 w-4" />}
            buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
            buttonText="Repay"
            onOpen={stopCardNavigation}
          />
        )}
        <AddTransactionDialog
          accounts={selectableAccounts}
          categories={categories}
          people={people}
          defaultType="debt"
          defaultSourceAccountId={account.id}
          triggerContent={<Users className="h-4 w-4" />}
          buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
          buttonText="Debt"
          onOpen={stopCardNavigation}
        />
        <AddTransactionDialog
          accounts={selectableAccounts}
          categories={categories}
          people={people}
          defaultType="income"
          defaultSourceAccountId={account.id}
          triggerContent={<Plus className="h-4 w-4" />}
          buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
          buttonText="Income"
          onOpen={stopCardNavigation}
        />
        <AddTransactionDialog
          accounts={selectableAccounts}
          categories={categories}
          people={people}
          defaultType="expense"
          defaultSourceAccountId={account.id}
          triggerContent={<Minus className="h-4 w-4" />}
          buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
          buttonText="Expense"
          onOpen={stopCardNavigation}
        />
      </footer>
    </article>
  )
}
