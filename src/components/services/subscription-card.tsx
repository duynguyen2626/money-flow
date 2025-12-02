'use client'

import { differenceInCalendarDays, format } from 'date-fns'
import { Subscription } from '@/types/moneyflow.types'

import { getServiceBranding } from './service-branding'

type SubscriptionCardProps = {
  subscription: Subscription
  onEdit?: () => void
  onMemberClick?: (profileId: string) => void
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '—'
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value?: string | null) {
  if (!value) return 'Chua dat'
  try {
    return format(new Date(value), 'dd MMM yyyy')
  } catch {
    return value
  }
}

function getStatus(nextDate?: string | null) {
  if (!nextDate) {
    return { label: 'No date', tone: 'bg-slate-100 text-slate-700' }
  }
  const diff = differenceInCalendarDays(new Date(nextDate), new Date())
  if (diff < 0) return { label: 'Overdue', tone: 'bg-rose-100 text-rose-700' }
  if (diff <= 3) return { label: 'Due soon', tone: 'bg-amber-100 text-amber-700' }
  return { label: 'Scheduled', tone: 'bg-emerald-100 text-emerald-700' }
}

function formatTemplate(template: string, subscription: Subscription) {
  const now = subscription.next_billing_date ? new Date(subscription.next_billing_date) : new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = String(now.getFullYear())
  const safePrice = Math.max(0, Math.round(subscription.price ?? 0))
  const memberCount = subscription.members?.length ?? 0

  return template
    .replace('{name}', subscription.name)
    .replace('{date}', `${month}-${year}`)
    .replace('{price}', formatMoney(safePrice))
    .replace('{members}', String(memberCount))
}

export function SubscriptionCard({ subscription, onEdit, onMemberClick }: SubscriptionCardProps) {
  const brand = getServiceBranding(subscription.name)
  const status = getStatus(subscription.next_billing_date)
  const members = subscription.members ?? []
  const totalSlots = members.reduce((sum, m) => sum + (m.slots ?? 1), 0)

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ring-4 ${brand.bg} ${brand.text} ${brand.ring}`}
          >
            {brand.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase text-slate-500">Subscription</span>
            <p className="text-lg font-semibold text-slate-900">{subscription.name}</p>
            <p className="text-sm text-slate-500">{formatMoney(subscription.price)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>
            {status.label}
          </span>
          {onEdit && (
            <button
              type="button"
              className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              onClick={onEdit}
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        <span>Next billing</span>
        <span className="font-semibold">{formatDate(subscription.next_billing_date)}</span>
      </div>

      {subscription.note_template && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="block font-semibold text-slate-700 mb-1">Note Template</span>
          <code className="block rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-800 break-all">
            {formatTemplate(subscription.note_template, subscription)}
          </code>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
          <span>Members</span>
          <span>{totalSlots}</span>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-slate-500">Chua gan thanh vien nao.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map(member => (
              <button
                key={`${subscription.id}-${member.profile_id}`}
                type="button"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm hover:border-blue-200 hover:text-blue-700 focus:outline-none"
                onClick={() => onMemberClick?.(member.profile_id)}
              >
                <span className="text-[11px] font-semibold text-slate-800">
                  {member.profile_name ?? 'Thanh vien'}
                </span>
                {typeof member.fixed_amount === 'number' && (
                  <span className="text-[11px] text-slate-500">
                    {formatMoney(member.fixed_amount)}
                  </span>
                )}
                {(member.slots ?? 1) > 1 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-100 px-1 text-[9px] font-bold text-slate-600">
                    {member.slots}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
