'use client'

import { ReactNode, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { TransactionWithDetails } from '@/types/moneyflow.types'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  ArrowRightLeft,
  BadgePercent,
  Check,
  Copy,
  Pencil,
  PiggyBank,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'

interface TransactionsTableProps {
  transactions: TransactionWithDetails[]
  selectedIds: Set<string>
  onToggleRow: (id: string) => void
  onToggleAll: (checked: boolean) => void
  onEdit: (txn: TransactionWithDetails) => void
  onClone: (txn: TransactionWithDetails) => void
}

const badgeBase = 'inline-flex items-center gap-1 h-6 min-w-[72px] px-2 text-[11px] font-semibold rounded-none border bg-slate-50 text-slate-700'
const typeStyles: Record<string, { label: string; className: string; icon: ReactNode }> = {
  income: { label: 'Income', className: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  expense: { label: 'Expense', className: 'bg-rose-50 text-rose-700 border-rose-100', icon: <TrendingDown className="w-3.5 h-3.5" /> },
  transfer: { label: 'Transfer', className: 'bg-blue-50 text-blue-700 border-blue-100', icon: <ArrowRightLeft className="w-3.5 h-3.5" /> },
  debt: { label: 'Lend', className: 'bg-amber-50 text-amber-700 border-amber-100', icon: <PiggyBank className="w-3.5 h-3.5" /> },
  repayment: { label: 'Repay', className: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: <Wallet className="w-3.5 h-3.5" /> },
  cashback: { label: 'Cashback', className: 'bg-green-50 text-green-700 border-green-100', icon: <Sparkles className="w-3.5 h-3.5" /> },
}

function formatAmount(value?: number | null) {
  if (value === undefined || value === null) return '—'
  return value.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function cashbackBadge(percent?: number | null, amount?: number | null) {
  if (!percent && !amount) return null
  const pct = percent && percent > 0 && percent < 1 ? percent * 100 : percent
  const label = pct ? `${pct}% cb` : `${amount} cb`
  return (
    <span className={cn(badgeBase, 'bg-emerald-50 border-emerald-100 text-emerald-700 min-w-[80px]')}>
      <BadgePercent className="w-3 h-3" />
      {label}
    </span>
  )
}

function typeBadge(type?: string | null) {
  const key = type || 'expense'
  const meta = typeStyles[key] || typeStyles.expense
  return (
    <span className={cn(badgeBase, 'justify-center min-w-[88px]', meta.className)}>
      {meta.icon}
      {meta.label}
    </span>
  )
}

function getFinalAmount(txn: TransactionWithDetails) {
  const original = txn.original_amount ?? txn.amount ?? 0
  const sharePercentRaw = txn.cashback_share_percent ?? 0
  const sharePercent = sharePercentRaw > 0 && sharePercentRaw < 1 ? sharePercentRaw * 100 : sharePercentRaw
  const shareFixed = txn.cashback_share_fixed ?? 0
  const shareAmount = txn.cashback_share_amount ?? 0
  const bankRate = txn.bank_rate ?? 0
  const bankBack = txn.bank_back ?? 0
  const percentBackValue = sharePercent ? (original * sharePercent) / 100 : 0
  const bankPercentValue = bankRate ? (original * bankRate) / 100 : 0
  return txn.final_price ?? (original - percentBackValue - shareFixed - (shareAmount || bankBack) - bankPercentValue - (txn.profit || 0))
}

function getFlowParts(txn: TransactionWithDetails) {
  const source = txn.source_account_name || txn.account_name || txn.source_name
  const destination = txn.destination_account_name || txn.destination_name
  const sourceImg = txn.source_image || txn.account_image_url
  const destinationImg = txn.destination_image
  const person = txn.person_name
  const personImg = txn.person_image_url

  const rightLabel = person || destination || ''
  const rightImg = person ? personImg : destinationImg
  const leftLabel = source || '—'
  const isTransfer = !!rightLabel

  return { leftLabel, rightLabel, leftImg: sourceImg, rightImg, isTransfer }
}

function AmountCell({ txn }: { txn: TransactionWithDetails }) {
  const original = txn.original_amount ?? txn.amount ?? 0
  const sharePercentRaw = txn.cashback_share_percent ?? 0
  const sharePercent = sharePercentRaw > 0 && sharePercentRaw < 1 ? sharePercentRaw * 100 : sharePercentRaw
  const shareFixed = txn.cashback_share_fixed ?? 0
  const shareAmount = txn.cashback_share_amount ?? 0
  const bankRate = txn.bank_rate ?? 0
  const bankBack = txn.bank_back ?? 0
  const hasBack = sharePercent || shareFixed || shareAmount || bankRate || bankBack
  const percentBackValue = sharePercent ? (original * sharePercent) / 100 : 0
  const bankPercentValue = bankRate ? (original * bankRate) / 100 : 0
  const final = getFinalAmount(txn)
  const finalColor = final < 0 ? 'text-rose-600' : 'text-foreground'

  const adjustments = useMemo(() => {
    const items: { label: string; value: number }[] = []
    if (sharePercent) items.push({ label: `Back share ${sharePercent}%`, value: percentBackValue })
    if (shareFixed) items.push({ label: 'Back share fixed', value: shareFixed })
    if (shareAmount) items.push({ label: 'Back share amount', value: shareAmount })
    if (bankRate && !sharePercent) items.push({ label: `Bank back ${bankRate}%`, value: bankPercentValue })
    if (bankBack && !shareAmount) items.push({ label: 'Bank back', value: bankBack })
    if (txn.profit) items.push({ label: 'Adjust (profit)', value: txn.profit })
    return items
  }, [sharePercent, shareFixed, shareAmount, bankRate, bankBack, percentBackValue, bankPercentValue, txn.profit])

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className={cn("flex items-center justify-end gap-2 text-right px-2 py-1 rounded border border-transparent", hasBack && "border-amber-200")}> 
          <div className={cn("font-semibold", finalColor)}>{formatAmount(final)}</div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 space-y-2" align="end">
        <div className="flex items-center justify-between text-sm">
          <span>Original</span>
          <span className="font-medium">{formatAmount(original)}</span>
        </div>
        {adjustments.map((adj) => (
          <div key={adj.label} className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{adj.label}</span>
            <span>-{formatAmount(adj.value)}</span>
          </div>
        ))}
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Final</span>
          <span>{formatAmount(final)}</span>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export function TransactionsTable({ transactions, selectedIds, onToggleRow, onToggleAll, onEdit, onClone }: TransactionsTableProps) {
  const allChecked = transactions.length > 0 && transactions.every((t) => selectedIds.has(t.id))
  const indeterminate = selectedIds.size > 0 && !allChecked
  const [copiedId, setCopiedId] = useState<string | null>(null)

  return (
    <div className="border rounded-lg bg-white">
      {/* Desktop table */}
      <div className="hidden md:block h-[72vh] overflow-auto relative">
        <table className="min-w-full table-fixed whitespace-nowrap text-sm border-collapse">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0 z-20 border-b">
            <tr>
              <th className="w-10 px-3 py-2 text-left border-r">
                <Checkbox
                  checked={indeterminate ? 'indeterminate' : allChecked}
                  onCheckedChange={(checked) => onToggleAll(Boolean(checked))}
                  aria-label="Select page"
                />
              </th>
              <th className="px-3 py-2 text-left w-[90px] border-r">Date</th>
              <th className="px-3 py-2 text-left flex-1 border-r">Description</th>
              <th className="px-3 py-2 text-left w-[280px] border-r">Flow (Account ➜ Party)</th>
              <th className="px-3 py-2 text-left w-[160px] border-r">Category</th>
              <th className="px-3 py-2 text-left w-[120px] border-r">Type</th>
              <th className="px-3 py-2 text-right w-[140px] border-r">Amount</th>
              <th className="px-3 py-2 text-right w-[140px] border-r">Final</th>
              <th className="px-3 py-2 text-right w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((txn) => {
              const flow = getFlowParts(txn)
              const hasCashback = !!(txn.cashback_share_percent ?? txn.bank_rate ?? txn.cashback_share_amount ?? txn.bank_back)
              const flowHoverBadges = hasCashback ? [cashbackBadge(txn.cashback_share_percent ?? txn.bank_rate, txn.cashback_share_amount ?? txn.bank_back)].filter(Boolean) : []
              const finalValue = getFinalAmount(txn)
              const amountColor = finalValue < 0 ? 'text-rose-600' : 'text-foreground'

              return (
                <tr key={txn.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 align-middle border-r border-slate-200">
                    <Checkbox checked={selectedIds.has(txn.id)} onCheckedChange={() => onToggleRow(txn.id)} aria-label="Select row" />
                  </td>
                  <td className="px-3 py-2 align-middle border-r border-slate-200">
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <span className="font-medium text-foreground inline-block">{format(new Date(txn.occurred_at), 'dd MMM')}</span>
                      </TooltipTrigger>
                      <TooltipContent>{format(new Date(txn.occurred_at), 'dd MMM yyyy HH:mm')}</TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="px-3 py-2 align-middle border-r border-slate-200">
                    <div className="flex items-center gap-2 min-w-0">
                      {txn.shop_image_url && (
                        <img src={txn.shop_image_url} alt={txn.shop_name || 'Shop'} className="h-8 w-8 object-contain rounded-none bg-transparent" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium text-foreground" title={txn.shop_name || txn.note}>{txn.shop_name || txn.note || 'No note'}</div>
                        {txn.note && txn.shop_name && <div className="truncate text-xs text-muted-foreground" title={txn.note}>{txn.note}</div>}
                      </div>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "text-slate-400 hover:text-slate-700 transition-colors shrink-0",
                              copiedId === txn.id && "text-emerald-600"
                            )}
                            onClick={() => {
                              navigator?.clipboard?.writeText(txn.id)
                              setCopiedId(txn.id)
                              setTimeout(() => setCopiedId(null), 2000)
                            }}
                          >
                            {copiedId === txn.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{copiedId === txn.id ? 'Copied!' : 'Copy ID'}</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle border-r border-slate-200">
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center gap-2 min-w-0">
                          {flow.leftImg && <img src={flow.leftImg} alt={flow.leftLabel} className="h-8 w-8 object-contain rounded-none bg-white shrink-0" />}
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <span className="truncate font-medium text-foreground" title={flow.leftLabel}>{flow.leftLabel}</span>
                            </TooltipTrigger>
                            <TooltipContent>{flow.leftLabel}</TooltipContent>
                          </Tooltip>
                          {flow.isTransfer && <ArrowRightLeft className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <span className="truncate text-muted-foreground" title={flow.rightLabel}>{flow.rightLabel}</span>
                            </TooltipTrigger>
                            <TooltipContent>{flow.rightLabel}</TooltipContent>
                          </Tooltip>
                          {flow.rightImg && <img src={flow.rightImg} alt={flow.rightLabel} className="h-8 w-8 object-contain rounded-none bg-white shrink-0" />}
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="space-y-2 w-64" side="bottom" align="start">
                        {flowHoverBadges.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {flowHoverBadges.map((b, idx) => (
                              <div key={idx}>{b}</div>
                            ))}
                          </div>
                        )}
                        {flowHoverBadges.length === 0 && <p className="text-xs text-muted-foreground">No cashback</p>}
                      </HoverCardContent>
                    </HoverCard>
                  </td>
                  <td className="px-3 py-3 align-middle border-r border-slate-200">
                    <div className="flex items-center gap-2 min-w-0">
                      {txn.category_image_url && (
                        <img src={txn.category_image_url} alt={txn.category_name || ''} className="h-8 w-8 object-contain rounded-none bg-white" />
                      )}
                      <span className="truncate font-medium">{txn.category_name || 'Uncategorized'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle border-r border-slate-200">{typeBadge(txn.type)}</td>
                  <td className="px-3 py-2 align-middle text-right border-r border-slate-200">
                    <div className={cn("font-medium", amountColor)}>{formatAmount(txn.original_amount ?? txn.amount)}</div>
                  </td>
                  <td className="px-3 py-2 align-middle text-right border-r border-slate-200">
                    <AmountCell txn={txn} />
                  </td>
                  <td className="px-3 py-2 align-middle text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => onEdit(txn)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => onClone(txn)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clone</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y">
        {transactions.map((txn) => {
          const flow = getFlowParts(txn)
          const finalValue = getFinalAmount(txn)
          const amountColor = finalValue < 0 ? 'text-rose-600' : 'text-foreground'

          return (
            <div key={txn.id} className="p-3">
              <div className="flex items-start gap-2">
                <Checkbox checked={selectedIds.has(txn.id)} onCheckedChange={() => onToggleRow(txn.id)} aria-label="Select row" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-tight truncate">{txn.note || 'No note'}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(txn.occurred_at), 'dd MMM HH:mm')}</div>
                    </div>
                    <div className="text-right">
                      <div className={cn("font-semibold", amountColor)}>{formatAmount(txn.final_price ?? txn.amount)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
                    <span className="font-medium text-foreground">{flow.leftLabel}</span>
                    {flow.isTransfer && <ArrowRightLeft className="w-3.5 h-3.5" />}
                    {flow.rightLabel && <span>{flow.rightLabel}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      {typeBadge(txn.type)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(txn)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "text-slate-400 hover:text-slate-700 transition-colors shrink-0",
                              copiedId === txn.id && "text-emerald-600"
                            )}
                            onClick={() => {
                              navigator?.clipboard?.writeText(txn.id)
                              setCopiedId(txn.id)
                              setTimeout(() => setCopiedId(null), 2000)
                            }}
                          >
                            {copiedId === txn.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{copiedId === txn.id ? 'Copied!' : 'Copy ID'}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
