'use client'

import { useMemo, useState, useTransition } from 'react'
import { syncAllSheetDataAction, testSheetConnectionAction } from '@/actions/people-actions'

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
  const hasLink = useMemo(() => Boolean(sheetLink && sheetLink.trim()), [sheetLink])
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

  const indicatorColor = hasLink ? 'bg-green-500' : 'bg-gray-300'
  const indicatorText = hasLink ? 'Sheet link saved' : 'No Sheet link'

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-3 w-3 rounded-full ${indicatorColor}`} aria-hidden />
          <p className="text-sm font-medium text-slate-700">{indicatorText}</p>
        </div>
        {sheetLink && (
          <p className="truncate text-xs text-slate-500" title={sheetLink}>
            {sheetLink}
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
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
      {toast && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            toast.tone === 'success'
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
