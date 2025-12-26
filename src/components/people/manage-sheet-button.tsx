'use client'

import { useState, useTransition } from 'react'
import type { MouseEvent } from 'react'
import { FileSpreadsheet, RefreshCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ManageCycleSheetResponse } from '@/types/sheet.types'

type ManageSheetButtonProps = {
  personId: string
  cycleTag: string
  initialSheetUrl?: string | null
  className?: string
  size?: 'sm' | 'md'
  iconOnly?: boolean
  showViewLink?: boolean
  linkedLabel?: string
  unlinkedLabel?: string
  disabled?: boolean
  openAfterSuccess?: boolean
}

export function ManageSheetButton({
  personId,
  cycleTag,
  initialSheetUrl = null,
  className,
  size = 'sm',
  iconOnly = false,
  showViewLink = false,
  linkedLabel = 'Sync Sheet',
  unlinkedLabel = 'Manage Sheet',
  disabled,
  openAfterSuccess = false,
}: ManageSheetButtonProps) {
  const [sheetUrl, setSheetUrl] = useState<string | null>(initialSheetUrl ?? null)
  const [isPending, startTransition] = useTransition()

  const label = sheetUrl ? linkedLabel : unlinkedLabel
  const icon = sheetUrl ? RefreshCcw : FileSpreadsheet
  const Icon = icon
  const isDisabled = disabled || !personId || !cycleTag || isPending

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (isDisabled) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/sheets/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId, cycleTag }),
        })

        const data = (await res.json()) as ManageCycleSheetResponse
        if (!res.ok || data?.error) {
          console.error('Manage sheet failed:', data?.error ?? res.statusText)
          return
        }

        const nextUrl = data.sheetUrl ?? sheetUrl
        if (data.sheetUrl) {
          setSheetUrl(data.sheetUrl)
        }
        if (openAfterSuccess && nextUrl) {
          window.open(nextUrl, '_blank', 'noopener,noreferrer')
        }
      } catch (error) {
        console.error('Manage sheet request failed:', error)
      }
    })
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition',
          size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
          iconOnly && 'h-9 w-9 px-0',
          isDisabled
            ? 'border-slate-200 bg-slate-100 text-slate-400'
            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700'
        )}
        aria-label={iconOnly ? label : undefined}
      >
        <Icon className={cn('h-4 w-4', isPending && 'animate-spin')} />
        {!iconOnly && <span>{label}</span>}
      </button>

      {showViewLink && sheetUrl && (
        <a
          href={sheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'text-xs font-semibold text-blue-600 hover:text-blue-700',
            size === 'md' && 'text-sm'
          )}
        >
          View Sheet
        </a>
      )}
    </div>
  )
}
