'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, ChevronRight, History, MinusCircle, Pencil, PlusCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ManageSheetButton } from '@/components/people/manage-sheet-button'
import type { PeopleDirectoryItem } from '@/components/people/people-directory-data'
import { isYYYYMM } from '@/lib/month-tag'
import { EditPersonDialog } from '@/components/people/edit-person-dialog'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import type { Account, Category, Person, Shop, Subscription } from '@/types/moneyflow.types'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type PeopleDirectoryDesktopProps = {
  items: PeopleDirectoryItem[]
  subscriptions: Subscription[]
  people: Person[]
  accounts: Account[]
  categories: Category[]
  shops: Shop[]
  selectedId?: string | null
  onSelect?: (id: string) => void
}

const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

function isValidLink(value: string | null | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed)
}

function sheetStatus(item: PeopleDirectoryItem) {
  const hasSheetUrl = isValidLink(item.sheetUrl)
  if (hasSheetUrl) {
    return { label: 'Connected', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
  }
  if (item.hasScriptLink) {
    return { label: 'Script Only', className: 'border-blue-200 bg-blue-50 text-blue-700' }
  }
  return { label: 'No Script', className: 'border-slate-200 bg-slate-50 text-slate-500' }
}

export function PeopleDirectoryDesktop({
  items,
  subscriptions,
  people,
  accounts,
  categories,
  shops,
  selectedId,
  onSelect,
}: PeopleDirectoryDesktopProps) {
  const [debtModalItem, setDebtModalItem] = useState<PeopleDirectoryItem | null>(null)

  const modalDebts = (debtModalItem?.person.monthly_debts ?? []).filter(
    (debt) => Number(debt.amount ?? 0) > 0
  )

  return (
    <>
      <div className="hidden md:grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((item) => {
          const status = sheetStatus(item)
          return (
            <div
              key={item.id}
              className={cn(
                'flex h-full min-h-[260px] flex-col rounded-3xl border bg-white p-4 shadow-sm transition hover:shadow-md',
                selectedId === item.id
                  ? 'border-blue-300 ring-1 ring-blue-200'
                  : 'border-slate-200'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {item.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.avatarUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-lg font-semibold text-slate-900">
                        {item.name}
                      </span>
                      {item.isOwner && (
                        <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          Owner
                        </span>
                      )}
                    </div>
                    {item.subscriptions.length > 0 && (
                      <div className="mt-1 flex max-w-full flex-nowrap gap-1.5 overflow-x-visible pb-1">
                        {item.subscriptions.map((service) => (
                          <span
                            key={service.id}
                            title={`${service.name}: ${service.slots} slot${service.slots > 1 ? 's' : ''}`}
                            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                          >
                            {service.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={service.image_url}
                                alt=""
                                className="h-3 w-3 object-contain"
                              />
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400">
                                {service.name.slice(0, 1)}
                              </span>
                            )}
                            <span className="hidden xl:inline">{service.name}: {service.slots}</span>
                            <span className="hidden lg:inline xl:hidden">{service.name.slice(0, 3)}: {service.slots}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex max-w-[110px] shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-semibold leading-none truncate',
                      status.className
                    )}
                  >
                    {status.label}
                  </span>
                  <div onClick={(event) => event.stopPropagation()}>
                    <EditPersonDialog
                      person={item.person}
                      subscriptions={subscriptions}
                      trigger={
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="relative mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div
                  className={cn(
                    'absolute left-0 top-0 h-full w-1.5 rounded-l-2xl',
                    item.isSettled ? 'bg-emerald-400' : 'bg-amber-400'
                  )}
                />
                <div className="pl-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{item.cycleTag}</span>
                    </div>
                    {item.additionalActiveCycles > 0 && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setDebtModalItem(item)
                        }}
                        className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-bold text-rose-700 shadow-sm transition hover:bg-rose-100"
                        title="View outstanding cycles"
                      >
                        +{item.additionalActiveCycles}
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Remains</p>
                      <p
                        className={cn(
                          'truncate text-xl font-bold tabular-nums tracking-tight',
                          item.isSettled ? 'text-emerald-600' : 'text-rose-600'
                        )}
                      >
                        {formatter.format(item.remains)}
                      </p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Paid</p>
                      <p className="truncate text-xs font-semibold text-slate-500 tabular-nums">
                        {formatter.format(item.paid)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <AddTransactionDialog
                  accounts={accounts}
                  categories={categories}
                  people={people}
                  shops={shops}
                  defaultType="debt"
                  defaultPersonId={item.person.id}
                  defaultTag={isYYYYMM(item.cycleTag) ? item.cycleTag : undefined}
                  buttonText="Lend"
                  buttonClassName="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-semibold uppercase text-rose-600 shadow-sm transition hover:bg-rose-50"
                  triggerContent={
                    <>
                      <MinusCircle className="h-4 w-4" />
                      Lend
                    </>
                  }
                />
                <AddTransactionDialog
                  accounts={accounts}
                  categories={categories}
                  people={people}
                  shops={shops}
                  defaultType="repayment"
                  defaultPersonId={item.person.id}
                  defaultTag={isYYYYMM(item.cycleTag) ? item.cycleTag : undefined}
                  buttonText="Repay"
                  buttonClassName="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold uppercase text-emerald-600 shadow-sm transition hover:bg-emerald-50"
                  triggerContent={
                    <>
                      <PlusCircle className="h-4 w-4" />
                      Repay
                    </>
                  }
                />
              </div>

              <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-1.5 text-xs font-semibold text-slate-600">
                <div className="space-y-1">
                  <div className="relative">
                    <ManageSheetButton
                      personId={item.id}
                      cycleTag={item.cycleTag}
                      initialSheetUrl={item.sheetUrl}
                      scriptLink={item.person.sheet_link ?? null}
                      googleSheetUrl={item.person.google_sheet_url ?? null}
                      connectHref={`/people/${item.id}?tab=sheet`}
                      size="sm"
                      disabled={!isYYYYMM(item.cycleTag)}
                      linkedLabel="Sheet"
                      unlinkedLabel="Manage Sheet"
                      showViewLink={false}
                      className="w-full"
                      buttonClassName="w-full justify-start gap-2 rounded-xl border-transparent bg-transparent px-2 py-2 pr-8 text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-slate-900"
                    />
                    <ChevronRight className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  <Link
                    href={`/people/${item.id}?tab=history`}
                    onClick={(event) => event.stopPropagation()}
                    className="flex w-full min-w-0 items-center justify-between rounded-xl px-2 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2 truncate">
                      <History className="h-4 w-4 text-slate-400" />
                      History details
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={!!debtModalItem} onOpenChange={(open) => !open && setDebtModalItem(null)}>
        <DialogContent className="max-w-md" onClick={(event) => event.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>
              {debtModalItem ? `${debtModalItem.name} outstanding cycles` : 'Outstanding cycles'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {modalDebts.length === 0 && (
              <p className="text-sm text-slate-500">No outstanding cycles.</p>
            )}
            {modalDebts.length > 0 && (
              <>
                {/* Current Cycle (shown on card) */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Current (shown on card)
                  </h4>
                  <div className="flex items-center justify-between rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700">
                        {modalDebts[0].tagLabel || modalDebts[0].tag || 'Cycle'}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatter.format(Number(modalDebts[0].amount ?? 0))}
                    </span>
                  </div>
                </div>

                {/* Previous Cycles */}
                {modalDebts.length > 1 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Previous Cycles
                    </h4>
                    <div className="space-y-2">
                      {modalDebts.slice(1).map((debt, index) => (
                        <div
                          key={`${debt.tagLabel ?? debt.tag ?? 'cycle'}-${index}`}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <span className="text-sm font-semibold text-slate-700">
                            {debt.tagLabel || debt.tag || 'Cycle'}
                          </span>
                          <span className="text-sm font-bold text-amber-700">
                            {formatter.format(Number(debt.amount ?? 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="pt-3">
            {debtModalItem && (
              <Link
                href={`/people/${debtModalItem.id}?tab=details`}
                onClick={() => setDebtModalItem(null)}
                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open details
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
