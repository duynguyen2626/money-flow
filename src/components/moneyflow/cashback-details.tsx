'use client'

import { MouseEvent } from 'react'
import { CashbackCard, CashbackTransaction } from '@/services/cashback.service'

type CashbackDetailsDialogProps = {
  card: CashbackCard
  onClose: () => void
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function CashbackDetailsDialog({ card, onClose }: CashbackDetailsDialogProps) {
  const spentLabel = currencyFormatter.format(card.currentSpend)
  const earnedLabel = currencyFormatter.format(card.earned)
  const start = dateFormatter.format(new Date(card.cycleStart))
  const end = dateFormatter.format(new Date(card.cycleEnd))

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => event.stopPropagation()

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={stopPropagation}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase text-slate-400">Chi tiet hoan tien</p>
            <h2 className="text-xl font-semibold text-slate-900">{card.accountName}</h2>
            <p className="text-sm text-slate-500">
              Ky: {start} – {end}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 transition hover:border-slate-400 hover:text-slate-900"
          >
            Dong
          </button>
        </div>

        <div className="mt-5 grid gap-4 border-b border-slate-100 pb-4 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-400">Tong tieu trong ky</p>
            <p className="text-lg font-semibold text-slate-900">{spentLabel}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Da hoan</p>
            <p className="text-lg font-semibold text-emerald-600">{earnedLabel}</p>
          </div>
        </div>

        <div className="mt-6 max-h-[55vh] overflow-y-auto">
          {card.transactions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Chua co giao dich trong ky nay.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {card.transactions.map(txn => (
                <TransactionRow key={txn.id} txn={txn} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

type TransactionRowProps = {
  txn: CashbackTransaction
}

function TransactionRow({ txn }: TransactionRowProps) {
  return (
    <li className="flex items-center justify-between py-3 text-sm">
      <div>
        <p className="font-semibold text-slate-900">
          {dateFormatter.format(new Date(txn.occurred_at))}
        </p>
        <p className="text-xs text-slate-500">
          {txn.note || 'Khong co ghi chu'}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-slate-900">
          {currencyFormatter.format(txn.amount)}
        </p>
        <p className="text-xs text-emerald-600">
          Hoan tien: {currencyFormatter.format(txn.earned)}
        </p>
      </div>
    </li>
  )
}
