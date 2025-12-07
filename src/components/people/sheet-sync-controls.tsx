'use client'

import { useMemo, useState, useTransition } from 'react'
import { syncAllSheetDataAction, testSheetConnectionAction, updatePersonAction } from '@/actions/people-actions'
import { Save, ExternalLink, Check } from 'lucide-react'

type Props = {
  personId: string | null
  sheetLink?: string | null
}

type ToastState = {
  title: string
  detail?: string
  tone?: 'success' | 'error' | 'info'
}

export function SheetSyncControls({ personId, sheetLink }: Props) {
  const [currentLink, setCurrentLink] = useState(sheetLink ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const hasLink = useMemo(() => Boolean(currentLink && currentLink.trim()), [currentLink])
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isPending, startTransition] = useTransition()

  const disabled = !hasLink || !personId || isPending

  const runTest = () => {
    if (!personId) {
      setToast({ title: 'Missing person', tone: 'error' })
      return
    }
    if (!hasLink) {
      setToast({ title: 'Sheet link unavailable', tone: 'error' })
      return
    }

    startTransition(async () => {
      setToast({ title: 'Sending test signal...', tone: 'info' })
      const result = await testSheetConnectionAction(personId)
      if (result?.success) {
        setToast({ title: 'Test signal sent. Check your Google Sheet!', tone: 'success' })
      } else {
        setToast({
          title: 'Test failed',
          detail: result?.message ?? 'Unable to send test signal',
          tone: 'error',
        })
      }
    })
  }

  const runSyncAll = () => {
    if (!personId) {
      setToast({ title: 'Missing person', tone: 'error' })
      return
    }
    if (!hasLink) {
      setToast({ title: 'Sheet link unavailable', tone: 'error' })
      return
    }
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('This will push all past transactions to the sheet. Continue?')
        : true
    if (!confirmed) return

    startTransition(async () => {
      setToast({ title: 'Syncing all transactions...', tone: 'info' })
      const result = await syncAllSheetDataAction(personId)
      if (result?.success) {
        setToast({
          title: `Synced ${result.count ?? 0} transactions`,
          tone: 'success',
        })
      } else {
        setToast({
          title: 'Sync failed',
          detail: result?.message ?? 'Unable to sync transactions',
          tone: 'error',
        })
      }
    })
  }

  const saveLink = () => {
    if (!personId) {
      setToast({ title: 'Missing person', tone: 'error' })
      return
    }

    startTransition(async () => {
      setToast({ title: 'Saving sheet link...', tone: 'info' })
      const result = await updatePersonAction(personId, { sheet_link: currentLink.trim() || null })
      if (result) {
        setToast({ title: 'Sheet link saved!', tone: 'success' })
        setIsEditing(false)
      } else {
        setToast({
          title: 'Save failed',
          detail: 'Unable to save sheet link',
          tone: 'error',
        })
      }
    })
  }

  const indicatorColor = hasLink ? 'bg-green-500' : 'bg-gray-300'
  const indicatorText = hasLink ? 'Sheet link saved' : 'No Sheet link'

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm space-y-4">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <span className={`inline-block h-3 w-3 rounded-full ${indicatorColor}`} aria-hidden />
        <p className="text-sm font-medium text-slate-700">{indicatorText}</p>
      </div>

      {/* Link Input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">Google Sheet URL</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={currentLink}
            onChange={(e) => { setCurrentLink(e.target.value); setIsEditing(true); }}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {isEditing && (
            <button
              type="button"
              onClick={saveLink}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:bg-slate-300"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          )}
          {hasLink && !isEditing && (
            <a
              href={currentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 transition"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          )}
        </div>
      </div>

      {/* Sync Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={runTest}
          disabled={disabled}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? 'Processing...' : 'Test Connection'}
        </button>
        <button
          type="button"
          onClick={runSyncAll}
          disabled={disabled}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? 'Syncing...' : 'Sync All'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${toast.tone === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : toast.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-blue-200 bg-blue-50 text-blue-800'
            }`}
        >
          <p className="font-semibold">{toast.title}</p>
          {toast.detail && <p className="text-xs">{toast.detail}</p>}
        </div>
      )}
    </div>
  )
}
