'use client'

import { useState } from 'react'
import { HandCoins, Banknote, ChevronRight, Check, Pencil } from 'lucide-react'

import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { Account, Category, MonthlyDebtSummary, Person, Shop, Subscription } from '@/types/moneyflow.types'
import { CustomTooltip } from '@/components/ui/custom-tooltip'

type PersonCardProps = {
  person: Person
  shops: Shop[]
  accounts: Account[]
  categories: Category[]
  subscriptions: Subscription[]
  onEdit: () => void
  onOpenDebt: () => void
  variant?: 'detailed' | 'compact'
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
})

export function PersonCard({
  person,
  shops,
  accounts,
  categories,
  subscriptions,
  onEdit,
  onOpenDebt,
  variant = 'detailed',
}: PersonCardProps) {
  const balance = person.balance ?? 0
  const isActive = balance !== 0
  const monthlyDebts = (person.monthly_debts ?? []).slice(0, 3)
  const firstDebtTag = monthlyDebts[0]?.tag ?? monthlyDebts[0]?.tagLabel


  const renderDebtRow = (entry: MonthlyDebtSummary) => (
    <div
      key={`${person.id}-${entry.tagLabel}`}
      className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-3 py-1 text-[11px] text-slate-600"
      onClick={event => event.stopPropagation()}
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{entry.tagLabel}</p>
        <p>{currencyFormatter.format(entry.amount)}</p>
      </div>
      {person.debt_account_id && (
        <AddTransactionDialog
          accounts={accounts}
          categories={categories}
          people={[person]}
          shops={shops}
          defaultType="repayment"
          defaultTag={entry.tag ?? entry.tagLabel}
          defaultAmount={entry.amount}
          defaultDebtAccountId={person.debt_account_id}
          buttonClassName="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white p-0 text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
          triggerContent={<Check className="h-3 w-3" />}
        />
      )}
    </div>
  )

  const badgeClasses =
    balance > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
  const balanceLabel = currencyFormatter.format(Math.abs(balance))

  if (variant === 'compact') {
    return (
      <article className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-[11px] shadow-sm transition-colors hover:border-slate-300">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {person.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={person.avatar_url}
                alt={person.name}
                className="h-10 w-10 rounded-none object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center bg-slate-100 font-semibold text-slate-600">
                {person.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-slate-900 truncate">{person.name}</p>
                <button
                  type="button"
                  onClick={onEdit}
                  className="text-slate-400 hover:text-blue-600 transition"
                  aria-label="Edit person"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {person.subscription_details?.[0]?.name ?? person.email ?? 'Member'}
              </p>
            </div>
          </div>
          <div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${badgeClasses}`}>
            {balance > 0 ? `Owes ${balanceLabel}` : balance < 0 ? `You owe ${balanceLabel}` : 'Settled'}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[10px]">
          <div className="flex flex-col gap-1.5 text-slate-500">
            {person.subscription_details && person.subscription_details.length > 0 ? (
              person.subscription_details.map(service => {
                const sub = subscriptions.find(s => s.id === service.id)
                const shop = sub?.shop_id ? shops.find(s => s.id === sub.shop_id) : null

                return (
                  <div key={service.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {shop?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={shop.logo_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[8px] font-bold text-slate-500">
                          {service.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="truncate text-slate-700 font-medium">{service.name}</span>
                      <span className="text-slate-400">: {service.slots}</span>
                    </div>

                  </div>
                )
              })
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-slate-400 italic">
                No active services
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <CustomTooltip content="Lend money">
              <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={[person]}
                shops={shops}
                defaultType="debt"
                defaultDebtAccountId={person.debt_account_id ?? undefined}
                buttonClassName="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                triggerContent={<HandCoins className="h-4 w-4" />}
              />
            </CustomTooltip>

            <CustomTooltip content="Repay debt">
              <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={[person]}
                shops={shops}
                defaultType="repayment"
                defaultDebtAccountId={person.debt_account_id ?? undefined}
                defaultAmount={balance > 0 ? balance : undefined}
                defaultTag={firstDebtTag}
                buttonClassName="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700"
                triggerContent={<Banknote className="h-4 w-4" />}
              />
            </CustomTooltip>

            <CustomTooltip content="View details">
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation()
                  onOpenDebt()
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
                aria-label="View details"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </CustomTooltip>


          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-[11px] shadow-sm transition-colors hover:border-slate-300"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {person.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.avatar_url}
              alt={person.name}
              className="h-10 w-10 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-semibold text-slate-600">
              {person.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 truncate">{person.name}</p>
              <button
                type="button"
                onClick={onEdit}
                className="text-slate-400 hover:text-blue-600 transition"
                aria-label="Edit person"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              {person.subscription_details?.[0]?.name ?? person.email ?? 'Member'}
            </p>
          </div>
        </div>
        <div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${badgeClasses}`}>
          {balance > 0 ? `Owes ${balanceLabel}` : balance < 0 ? `You owe ${balanceLabel}` : 'Settled'}
        </div>
      </div>

      {isActive && monthlyDebts.length > 0 && (
        <div className="rounded-2xl bg-rose-50/50 p-2 text-[11px]">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <span>Debt Breakdown</span>
            {person.monthly_debts && person.monthly_debts.length > 3 && (
              <span className="text-blue-600">+{person.monthly_debts.length - 3} more</span>
            )}
          </div>
          <div className="mt-2 space-y-1">{monthlyDebts.map(renderDebtRow)}</div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[10px]">
        <div className="flex flex-col gap-1.5 text-slate-500">
          {person.subscription_details && person.subscription_details.length > 0 ? (
            person.subscription_details.map(service => {
              const sub = subscriptions.find(s => s.id === service.id)
              const shop = sub?.shop_id ? shops.find(s => s.id === sub.shop_id) : null

              return (
                <div key={service.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {shop?.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shop.logo_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[8px] font-bold text-slate-500">
                        {service.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-slate-700 font-medium">{service.name}</span>
                    <span className="text-slate-400">: {service.slots}</span>
                  </div>

                </div>
              )
            })
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 italic">
              No active services
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <CustomTooltip content="Lend money">
            <AddTransactionDialog
              accounts={accounts}
              categories={categories}
              people={[person]}
              shops={shops}
              defaultType="debt"
              defaultDebtAccountId={person.debt_account_id ?? undefined}
              buttonClassName="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
              triggerContent={<HandCoins className="h-4 w-4" />}
            />
          </CustomTooltip>

          <CustomTooltip content="Repay debt">
            <AddTransactionDialog
              accounts={accounts}
              categories={categories}
              people={[person]}
              shops={shops}
              defaultType="repayment"
              defaultDebtAccountId={person.debt_account_id ?? undefined}
              defaultAmount={balance > 0 ? balance : undefined}
              defaultTag={firstDebtTag}
              buttonClassName="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700"
              triggerContent={<Banknote className="h-4 w-4" />}
            />
          </CustomTooltip>

          <CustomTooltip content="View details">
            <button
              type="button"
              onClick={event => {
                event.stopPropagation()
                onOpenDebt()
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
              aria-label="View details"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </CustomTooltip>


        </div>
      </div>
    </article>
  )
}
