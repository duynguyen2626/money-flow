'use client'

import { User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ManageSheetButton } from '@/components/people/manage-sheet-button'
import type { PeopleDirectoryItem } from '@/components/people/people-directory-data'
import { isYYYYMM } from '@/lib/month-tag'

type PeopleDirectoryMobileProps = {
  items: PeopleDirectoryItem[]
  selectedId?: string | null
  onSelect?: (id: string) => void
}

const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function PeopleDirectoryMobile({ items, selectedId, onSelect }: PeopleDirectoryMobileProps) {
  return (
    <div className="space-y-2 md:hidden">
      {items.map((item) => (
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
            'flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition',
            selectedId === item.id ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200'
          )}
        >
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
            {item.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.avatarUrl}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-slate-900">
                {item.name}
              </span>
              <span
                className={cn(
                  'text-sm font-semibold',
                  item.isSettled ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {formatter.format(item.remains)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>{item.cycleTag}</span>
              <span>{item.isSettled ? 'Settled' : `Paid: ${formatter.format(item.paid)}`}</span>
            </div>
          </div>

          <ManageSheetButton
            personId={item.id}
            cycleTag={item.cycleTag}
            initialSheetUrl={item.sheetUrl}
            iconOnly
            size="md"
            disabled={!isYYYYMM(item.cycleTag)}
          />
        </div>
      ))}
    </div>
  )
}
