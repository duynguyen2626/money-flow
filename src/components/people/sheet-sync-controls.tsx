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
      setToast({ title: 'Thiếu người dùng', tone: 'error' })
      return
    }
    if (!hasLink) {
      setToast({ title: 'Chưa có Sheet link', tone: 'error' })
      return
    }

    startTransition(async () => {
      setToast({ title: 'Đang gửi tín hiệu test...', tone: 'info' })
      const result = await testSheetConnectionAction(personId)
      if (result?.success) {
        setToast({ title: 'Đã bắn tín hiệu test. Kiểm tra Google Sheet nhé!', tone: 'success' })
      } else {
        setToast({
          title: 'Test thất bại',
          detail: result?.message ?? 'Không gửi được tín hiệu test',
          tone: 'error',
        })
      }
    })
  }

  const runSyncAll = () => {
    if (!personId) {
      setToast({ title: 'Thiếu người dùng', tone: 'error' })
      return
    }
    if (!hasLink) {
      setToast({ title: 'Chưa có Sheet link', tone: 'error' })
      return
    }
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('Việc này sẽ đẩy toàn bộ giao dịch cũ sang Sheet. Tiếp tục?')
        : true
    if (!confirmed) return

    startTransition(async () => {
      setToast({ title: 'Đang đồng bộ toàn bộ...', tone: 'info' })
      const result = await syncAllSheetDataAction(personId)
      if (result?.success) {
        setToast({
          title: `Đã đồng bộ ${result.count ?? 0} giao dịch`,
          tone: 'success',
        })
      } else {
        setToast({
          title: 'Đồng bộ thất bại',
          detail: result?.message ?? 'Không thể đồng bộ',
          tone: 'error',
        })
      }
    })
  }

  const indicatorColor = hasLink ? 'bg-green-500' : 'bg-gray-300'
  const indicatorText = hasLink ? 'Đã lưu Sheet link' : 'Chưa có Sheet link'

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
          {isPending ? 'Đang xử lý...' : 'Test Kết Nối'}
        </button>
        <button
          type="button"
          onClick={runSyncAll}
          disabled={disabled}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? 'Đang đồng bộ...' : 'Đồng Bộ Tất Cả'}
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
