'use client'

import { FormEvent, MouseEvent, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

import { Account, DebtAccount } from '@/types/moneyflow.types'
import { settleDebt } from '@/services/debt.service'
import { generateTag } from '@/lib/tag'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

type SettleDebtDialogProps = {
  debt: DebtAccount
  accounts: Account[]
  onClose: () => void
  defaultTag?: string
  defaultAmount?: number
  onSuccess?: () => Promise<void> | void
}

export function SettleDebtDialog({ debt, accounts, onClose, defaultTag, defaultAmount, onSuccess }: SettleDebtDialogProps) {
  const router = useRouter()
  const realAccounts = useMemo(() => accounts.filter(acc => acc.type !== 'debt'), [accounts])
  const initialAccountId = realAccounts[0]?.id ?? ''
  const currentMonthTag = useMemo(() => generateTag(new Date()), [])
  const defaultTagValue = defaultTag ?? currentMonthTag
  const defaultAmountValue = useMemo(
    () => defaultAmount ?? Math.abs(debt.current_balance),
    [defaultAmount, debt.current_balance]
  )
  const [selectedAccount, setSelectedAccount] = useState(initialAccountId)
  const [tag, setTag] = useState(defaultTagValue)
  const [amount, setAmount] = useState(defaultAmountValue)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    setTag(defaultTagValue)
  }, [defaultTagValue])

  const title = debt.current_balance >= 0 ? `Thu no tu ${debt.name}` : `Tra no cho ${debt.name}`

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const closeDialog = () => {
    if (isSubmitting) return
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus(null)

    const trimmedTag = tag.trim()

    if (!selectedAccount) {
      setStatus({ type: 'error', message: 'Vui long chon tai khoan de nhan/tra tien.' })
      return
    }

    if (!amount || amount <= 0) {
      setStatus({ type: 'error', message: 'So tien phai lon hon 0.' })
      return
    }

    if (!trimmedTag) {
      setStatus({ type: 'error', message: 'Vui long nhap tag cho ky no.' })
      return
    }

    setIsSubmitting(true)
    const result = await settleDebt(
      debt.id,
      amount,
      selectedAccount,
      note.trim(),
      new Date(date),
      trimmedTag.toUpperCase()
    )
    setIsSubmitting(false)

    if (!result) {
      setStatus({ type: 'error', message: 'Khong the tat toan. Thu lai sau.' })
      return
    }

    setStatus({ type: 'success', message: 'Da tao giao dich tat toan.' })
    await (onSuccess ? onSuccess() : router.refresh())
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
      onClick={closeDialog}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={stopPropagation}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Tat toan cong no</p>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            type="button"
            className="rounded p-1 text-gray-500 transition hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="Close dialog"
            onClick={closeDialog}
          >
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">So tien</label>
            <input
              type="number"
              min={0}
              step="any"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={amount}
              onChange={event => setAmount(Number(event.target.value))}
              placeholder="0"
            />
            <p className="text-xs text-gray-500">
              So tien mac dinh la so du hien tai ({currencyFormatter.format(Math.abs(debt.current_balance))})
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Kỳ nợ (Tag)</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={tag}
              onChange={event => setTag(event.target.value.toUpperCase())}
              placeholder="Ví dụ: NOV25"
            />
            <p className="text-xs text-gray-500">Gợi ý: {currentMonthTag}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Chon tai khoan</label>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={selectedAccount}
              onChange={event => setSelectedAccount(event.target.value)}
              disabled={realAccounts.length === 0}
            >
              {realAccounts.length === 0 && <option value="">Khong co tai khoan hop le</option>}
              {realAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            {realAccounts.length === 0 && (
              <p className="text-sm text-red-600">
                Vui long tao tai khoan tien mat/ngan hang truoc.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Ngay tat toan</label>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={date}
              onChange={event => setDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Ghi chu (khong bat buoc)</label>
            <textarea
              className="min-h-[60px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Vi du: Tra mot phan, chuyen khoan ngan hang"
              value={note}
              onChange={event => setNote(event.target.value)}
            />
          </div>

          {status && (
            <p
              className={`text-sm ${
                status.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {status.message}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              Huy
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || realAccounts.length === 0}
            >
              {isSubmitting ? 'Dang xu ly...' : 'Xac nhan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
