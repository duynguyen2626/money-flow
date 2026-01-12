'use client'

import {
  MoreVertical,
  User,
  TrendingDown,
  TrendingUp,
  Banknote,
  ExternalLink,
  Check,
  Info,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react'
import { useState } from 'react'

import { Account, Category, Person, Shop, Subscription } from '@/types/moneyflow.types'
import { AddTransactionDialog } from './add-transaction-dialog'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { CustomTooltip } from '@/components/ui/custom-tooltip'
import { cn } from '@/lib/utils'
import { EditPersonDialog } from '@/components/people/edit-person-dialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { updatePersonAction } from '@/actions/people-actions'

interface PersonCardProps {
  person: Person
  subscriptions: Subscription[]
  variant?: 'detailed' | 'compact'
  isSelected?: boolean
  onSelect?: () => void
  accounts?: Account[]
  categories?: Category[]
  shops?: Shop[]
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

export function PersonCard({ person, subscriptions, variant = 'detailed', isSelected, onSelect, accounts = [], categories = [], shops = [] }: PersonCardProps) {
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

  const balance = person.balance ?? 0
  const isPositive = balance >= 0 // Positive means they owe me (Asset)
  const isSettled = Math.abs(balance) < 1

  // Derived metrics (using balance for now as we don't have separate totals)
  const debtAmount = isPositive ? balance : 0
  const sumBackAmount = !isPositive ? Math.abs(balance) : 0
  const repayAmount = 0 // Placeholder as we don't track total repaid yet

  const handleArchive = async () => {
    await updatePersonAction(person.id, { is_archived: true })
    setShowArchiveConfirm(false)
  }

  // Get top 3 monthly debts for detailed view
  const monthlyDebts = (person.monthly_debts ?? []).slice(0, 3)



  if (variant === 'compact') {
    return (
      <>
        <div
          className={cn(
            "group relative flex flex-col rounded-xl border bg-white transition-all hover:shadow-md overflow-hidden h-full",
            isSelected ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/10" : "border-slate-200",
            "p-3 gap-3"
          )}
        >
          {/* Header: Avatar + Name + Details */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="relative h-9 w-9 flex-shrink-0 rounded-md overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                  {person.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.image_url}
                      alt={person.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm truncate leading-tight">
                    {person.name}
                  </h3>
                  <button
                    onClick={onSelect}
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 w-fit font-medium"
                  >
                    Details <ExternalLink className="h-2 w-2" />
                  </button>
                </div>
              </div>

              {/* Service Slots */}
              {person.subscription_details && person.subscription_details.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {person.subscription_details.map(sub => (
                    <span key={sub.id} className="inline-flex items-center gap-0.5 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                      {sub.name}: {sub.slots}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 text-slate-400 hover:text-slate-600">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-32 p-1">
                  <div className="flex flex-col">
                    <EditPersonDialog
                      person={person}
                      subscriptions={subscriptions}
                      trigger={
                        <button className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-left">
                          Edit
                        </button>
                      }
                    />
                    <button
                      onClick={() => setShowArchiveConfirm(true)}
                      className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 text-red-600 text-left"
                    >
                      Archive
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Metrics - Iteration 2 Layout */}
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 flex-1">
            {/* Row 1: Cycle Tag + Remains (Hero) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Main Cycle Tag */}
                {monthlyDebts[0] ? (
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {monthlyDebts[0].tagLabel?.replace('-', ' ') || 'CYCLE'}
                    </span>
                    {/* Using formatCycleTag for tooltip if needed, but display raw label for now as per image "DEC 25" */}
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">NO DATA</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Remains Badge - Hero */}
                <div className={cn(
                  "px-3 py-1 rounded-md border text-lg font-extrabold shadow-sm",
                  debtAmount > 0
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>
                  <span className="text-[0.6em] text-slate-400 font-normal mr-1 uppercase">Remains:</span>
                  {numberFormatter.format(debtAmount)}
                </div>
              </div>
            </div>

            {/* Row 2: Repaid + Status + Outstanding Badge */}
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2">
                {/* Repaid - Subtle */}
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  Repaid: {compactNumberFormatter.format(sumBackAmount)}
                </span>

                {/* Status */}
                {debtAmount === 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    Paid <Check className="h-3 w-3" />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Outstanding Cycle Badge (+1) */}
                {(person.monthly_debts?.length || 0) > 1 && (
                  <span className="flex h-9 items-center justify-center rounded-md bg-rose-100 px-3 text-sm font-bold text-rose-600">
                    +{(person.monthly_debts?.length || 0) - 1}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
            <AddTransactionDialog
              accounts={accounts}
              categories={categories}
              people={[person]}
              shops={shops}
              defaultType="debt"
              defaultPersonId={person.id}
              buttonClassName="flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors border border-orange-100 shadow-sm"
              triggerContent={
                <>
                  <ArrowUpRight className="h-4 w-4" /> Lend
                </>
              }
            />
            <AddTransactionDialog
              accounts={accounts}
              categories={categories}
              people={[person]}
              shops={shops}
              defaultType="repayment"
              defaultPersonId={person.id}
              buttonClassName="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-100 shadow-sm"
              triggerContent={
                <>
                  <ArrowDownLeft className="h-4 w-4" /> Repay
                </>
              }
            />
          </div>

          {/* Selection Indicator */}
          {isSelected && (
            <div className="absolute top-2 right-2 h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm pointer-events-none">
              <Check className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        <ConfirmDialog
          open={showArchiveConfirm}
          onOpenChange={setShowArchiveConfirm}
          title="Archive Person"
          description={`Are you sure you want to archive ${person.name}? They will be hidden from the main list.`}
          onConfirm={handleArchive}
          confirmText="Archive"
          variant="destructive"
        />
      </>
    )
  }

  return (
    <>
      <div
        onClick={onSelect}
        className={cn(
          "group relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md h-full cursor-pointer",
          isSelected ? "border-blue-500 ring-2 ring-blue-500 ring-offset-2" : "border-slate-200 hover:border-blue-300"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 flex-shrink-0 bg-slate-100 border border-slate-200 flex items-center justify-center">
              {person.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.image_url}
                  alt={person.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div className="flex flex-col">
              <h3 className="font-bold text-slate-900 text-lg leading-tight">
                {person.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {person.sheet_link && (
                  <a
                    href={person.sheet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Sheet <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-600">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-32 p-1">
                <div className="flex flex-col">
                  <EditPersonDialog
                    person={person}
                    subscriptions={subscriptions}
                    trigger={
                      <button className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-left">
                        Edit
                      </button>
                    }
                  />
                  <button
                    onClick={() => setShowArchiveConfirm(true)}
                    className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 text-red-600 text-left"
                  >
                    Archive
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Metrics - Iteration 2 Layout (Detailed Card) */}
        <div className="mb-4 flex flex-col gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
          {/* Row 1: Cycle Tag + Remains (Hero) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Main Cycle Tag */}
              {monthlyDebts[0] ? (
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                    {monthlyDebts[0].tagLabel?.replace('-', ' ') || 'CURRENT'}
                  </span>
                </div>
              ) : (
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">NO DATA</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Remains Badge - Hero */}
              <div className={cn(
                "px-4 py-1.5 rounded-lg border text-xl font-extrabold shadow-sm bg-white",
                balance > 0
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}>
                <span className="text-[0.6em] text-slate-400 font-normal mr-2 uppercase">Remains:</span>
                {numberFormatter.format(Math.abs(balance))}
              </div>
            </div>
          </div>

          {/* Row 2: Repaid + Status + Outstanding Badge */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-3">
              {/* Repaid - Subtle */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                Repaid: {compactNumberFormatter.format(monthlyDebts.reduce((sum, d) => sum + (d.amount < 0 ? Math.abs(d.amount) : 0), 0))}
              </span>

              {/* Status */}
              {balance === 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                  Paid <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Outstanding Cycle Badge (+1) */}
              {(monthlyDebts.length || 0) > 1 && (
                <span className="flex h-8 items-center justify-center rounded-md bg-rose-100 px-2.5 text-xs font-bold text-rose-600">
                  +{(monthlyDebts.length || 0) - 1}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Debts Summary */}
        <div className="flex-grow space-y-2 mb-4">
          {monthlyDebts.length > 0 ? (
            <>
              <div className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-2">
                {/* <History className="h-3 w-3" /> */}
                Recent Activity
              </div>
              <div className="space-y-1.5">
                {monthlyDebts.map((debt, idx) => (
                  <div key={(idx).toString()} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 truncate max-w-[120px]" title={debt.tagLabel}>
                      {debt.tagLabel}
                    </span>
                    <span className="font-medium text-slate-900">
                      {compactNumberFormatter.format(debt.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 italic py-4">
              No recent activity
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Archive Person"
        description={`Are you sure you want to archive ${person.name}? They will be hidden from the main list.`}
        onConfirm={handleArchive}
        confirmText="Archive"
        variant="destructive"
      />
    </>
  )
}
