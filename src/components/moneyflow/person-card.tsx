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
                  {person.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.avatar_url}
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

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 border-t border-slate-100 pt-2">
            <div className="flex flex-col items-start truncate">
              <span className="text-slate-400 mb-0.5 text-[9px] uppercase tracking-wider">Debt</span>
              <span className={cn("font-bold text-sm truncate w-full", debtAmount > 0 ? "text-slate-700" : "text-slate-300")}>
                {compactNumberFormatter.format(debtAmount)}
              </span>
            </div>

            <div className="flex flex-col items-start truncate pl-2 border-l border-slate-100">
              <span className="text-slate-400 mb-0.5 text-[9px] uppercase tracking-wider">Back</span>
              <span className={cn("font-bold text-sm truncate w-full", sumBackAmount > 0 ? "text-slate-700" : "text-slate-300")}>
                {compactNumberFormatter.format(sumBackAmount)}
              </span>
            </div>

            <div className="flex flex-col items-start truncate pl-2 border-l border-slate-100">
              <span className="text-slate-400 mb-0.5 text-[9px] uppercase tracking-wider">Repay</span>
              <span className={cn("font-bold text-sm truncate w-full", repayAmount > 0 ? "text-slate-700" : "text-slate-300")}>
                {compactNumberFormatter.format(repayAmount)}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-slate-100">
            <AddTransactionDialog
              accounts={accounts}
              categories={categories}
              people={[person]}
              shops={shops}
              defaultType="debt"
              defaultPersonId={person.id}
              buttonClassName="flex w-full items-center justify-center gap-1 rounded-md bg-orange-50 px-2 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors"
              triggerContent={
                <>
                  <ArrowUpRight className="h-3 w-3" /> Lend
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
              buttonClassName="flex w-full items-center justify-center gap-1 rounded-md bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
              triggerContent={
                <>
                  <ArrowDownLeft className="h-3 w-3" /> Repay
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
            <div className="relative h-12 w-12 flex-shrink-0 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
              {person.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.avatar_url}
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

        {/* Balance Section */}
        <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Current Balance
            </span>
            {isSettled ? (
              <Badge variant="outline" className="text-slate-500 border-slate-200 bg-white">Settled</Badge>
            ) : (
              <Badge variant="outline" className={cn(
                "bg-white",
                isPositive ? "text-emerald-700 border-emerald-200" : "text-red-700 border-red-200"
              )}>
                {isPositive ? "Owes You" : "You Owe"}
              </Badge>
            )}
          </div>
          <div className={cn(
            "text-2xl font-bold tracking-tight",
            isSettled ? "text-slate-400" : (isPositive ? "text-emerald-600" : "text-red-600")
          )}>
            {currencyFormatter.format(Math.abs(balance))}
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
