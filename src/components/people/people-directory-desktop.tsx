'use client'

import { User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ManageSheetButton } from '@/components/people/manage-sheet-button'
import type { PeopleDirectoryItem } from '@/components/people/people-directory-data'
import { isYYYYMM } from '@/lib/month-tag'

type PeopleDirectoryDesktopProps = {
  items: PeopleDirectoryItem[]
  selectedId?: string | null
  onSelect?: (id: string) => void
}

const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

function sheetStatus(item: PeopleDirectoryItem) {
  if (item.sheetUrl) {
    return { label: 'Linked', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
  }
  if (item.hasScriptLink) {
    return { label: 'Script Only', className: 'border-blue-200 bg-blue-50 text-blue-700' }
  }
  return { label: 'None', className: 'border-slate-200 bg-slate-50 text-slate-500' }
}

export function PeopleDirectoryDesktop({ items, selectedId, onSelect }: PeopleDirectoryDesktopProps) {
  return (
    <div className="hidden md:grid grid-cols-2 gap-3 auto-rows-fr sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => {
        const status = sheetStatus(item)
        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(item.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect?.(item.id)
              }
            }}
            className={cn(
              'flex h-full cursor-pointer flex-col rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md',
              selectedId === item.id ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
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

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">
                    {item.name}
                  </span>
                  {item.isOwner && (
                    <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      Owner
                    </span>
                  )}
                </div>
                {item.subscriptions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {item.subscriptions.map((service) => (
                      <span
                        key={service.id}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
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
                        {service.name}: {service.slots}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {item.cycleTag}
              </p>
              <p
                className={cn(
                  'mt-1 text-lg font-semibold',
                  item.isSettled ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                Remains: {formatter.format(item.remains)}
              </p>
              <p className="text-xs text-slate-500">
                {item.isSettled ? 'Settled' : `Paid: ${formatter.format(item.paid)}`}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                  status.className
                )}
              >
                {status.label}
              </span>
              <div className="flex items-center gap-2">
                {item.additionalActiveCycles > 0 && (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                    +{item.additionalActiveCycles}
                  </span>
                )}
                <ManageSheetButton
                  personId={item.id}
                  cycleTag={item.cycleTag}
                  initialSheetUrl={item.sheetUrl}
                  size="sm"
                  disabled={!isYYYYMM(item.cycleTag)}
                  linkedLabel="View Sheet"
                  unlinkedLabel="Manage Sheet"
                  openAfterSuccess={Boolean(item.sheetUrl)}
                  showViewLink={false}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
