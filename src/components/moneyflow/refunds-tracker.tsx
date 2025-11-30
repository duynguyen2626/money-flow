'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Account } from '@/types/moneyflow.types'
import { PendingRefundItem, confirmRefund } from '@/services/transaction.service'
import { REFUND_PENDING_ACCOUNT_ID } from '@/constants/refunds'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
})

type RefundsTrackerProps = {
  pendingRefunds: PendingRefundItem[]
  accounts: Account[]
}

export function RefundsTracker({ pendingRefunds, accounts }: RefundsTrackerProps) {
  const router = useRouter()
  const [activeRefund, setActiveRefund] = useState<PendingRefundItem | null>(null)
  const [targetAccountId, setTargetAccountId] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const targetAccounts = useMemo(
    () => accounts.filter(account => account.id !== REFUND_PENDING_ACCOUNT_ID),
    [accounts]
  )

  const totalPending = useMemo(
    () => pendingRefunds.reduce((sum, item) => sum + item.amount, 0),
    [pendingRefunds]
  )

  const openConfirmDialog = (refund: PendingRefundItem) => {
    setActiveRefund(refund)
    setTargetAccountId(targetAccounts[0]?.id ?? null)
    setErrorMessage(null)
  }

  const closeConfirmDialog = () => {
    setActiveRefund(null)
    setErrorMessage(null)
    setIsConfirming(false)
    setTargetAccountId(null)
  }

  const handleConfirm = async () => {
    if (!activeRefund) return
    if (!targetAccountId) {
      setErrorMessage('Select a receiving account.')
      return
    }

    setIsConfirming(true)
    setErrorMessage(null)

    try {
      const result = await confirmRefund(activeRefund.id, targetAccountId)
      if (!result.success) {
        setErrorMessage(result.error ?? 'Unable to confirm refund.')
        return
      }
      closeConfirmDialog()
      router.refresh()
    } finally {
      setIsConfirming(false)
    }
  }

  const formatDate = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return '-'
    }
    return parsed.toLocaleDateString('en-CA')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Pending refunds</p>
          <p className="text-3xl font-semibold text-slate-900">
            {currencyFormatter.format(totalPending)}
          </p>
        </div>
        <p className="text-sm text-slate-500">{pendingRefunds.length} pending requests</p>
      </div>

      <div className="space-y-3">
        {pendingRefunds.length === 0 ? (
          <p className="text-sm text-slate-500">No pending refund requests.</p>
        ) : (
          pendingRefunds.map(refund => (
            <div
              key={refund.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {refund.note ?? 'Refund request'}
                </p>
                <p className="text-xs text-slate-500">
                  {refund.original_note ?? 'Original transaction has no note'}
                </p>
                <p className="text-xs text-slate-400">
                  {refund.original_category ?? 'No category'} · {formatDate(refund.occurred_at)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 text-right">
                <p className="text-lg font-semibold text-slate-900">
                  {currencyFormatter.format(refund.amount)}
                </p>
                <button
                  className="inline-flex items-center justify-center rounded-md border border-blue-600 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                  onClick={() => openConfirmDialog(refund)}
                >
                  Funds received
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {activeRefund && createPortal(
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
          onClick={closeConfirmDialog}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Confirm refund</h3>
              <button
                className="text-slate-500 transition hover:text-slate-700"
                onClick={closeConfirmDialog}
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-2">{activeRefund.note}</p>
            <label className="text-xs font-semibold text-slate-700">Select receiving account</label>
            <select
              value={targetAccountId ?? ''}
              onChange={event => setTargetAccountId(event.target.value || null)}
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Choose account</option>
              {targetAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            {errorMessage && (
              <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={closeConfirmDialog}
                disabled={isConfirming}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
