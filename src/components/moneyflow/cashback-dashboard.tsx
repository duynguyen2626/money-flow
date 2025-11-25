'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import { CashbackCard } from '@/types/cashback.types'
import { CashbackDetailsDialog } from './cashback-details'

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

type CashbackDashboardProps = {
  cards: CashbackCard[]
}

const calculateProgress = (earned: number | null, max: number | null) => {
  const safeEarned = earned ?? 0
  const safeMax = max ?? 0

  if (safeMax === 0) {
    return 0
  }

  const percent = (safeEarned / safeMax) * 100

  if (!Number.isFinite(percent)) {
    return 0
  }

  return Math.min(percent, 100)
}

export function CashbackDashboard({ cards }: CashbackDashboardProps) {
  const [expandedCard, setExpandedCard] = useState<CashbackCard | null>(null)

  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-white p-10 text-center text-slate-500">
        <p className="text-lg font-semibold">Chua co the ho tro cashback</p>
        <p className="text-sm text-slate-400">
          Hay them the tin dung co cashback_config de theo doi tien thuong.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(card => {
          const safeSpendTarget =
            typeof card.spendTarget === 'number' && Number.isFinite(card.spendTarget)
              ? card.spendTarget
              : null
          const spendGoalLabel =
            safeSpendTarget !== null
              ? currencyFormatter.format(safeSpendTarget)
              : 'Khong gioi han'
          const remainingLabel =
            typeof card.remainingBudget === 'number'
              ? currencyFormatter.format(Math.max(0, card.remainingBudget))
              : null

          const progressValue = calculateProgress(card.totalEarned, card.maxCashback)
          const earnedLabel = currencyFormatter.format(card.totalEarned)
          const spendLabel = currencyFormatter.format(card.currentSpend)
          const ratePercent = `${Math.round(card.rate * 100)}%`
          const maxCashbackLabel =
            typeof card.maxCashback === 'number'
              ? currencyFormatter.format(card.maxCashback)
              : 'Khong gioi han'

          return (
            <div key={card.accountId} className="rounded-2xl bg-white p-6 shadow">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-900/5 p-3 text-slate-700">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-400">The tin dung</p>
                  <p className="text-lg font-semibold text-slate-900">{card.accountName}</p>
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Cycle:</span> {card.cycleLabel}
                {remainingLabel && (
                  <span className="ml-2 text-slate-500">
                    <span className="font-semibold text-slate-700">Remaining:</span> {remainingLabel}
                  </span>
                )}
              </div>

              <div className="mt-6">
                <p className="text-sm text-slate-500">Da hoan</p>
                <p className="text-3xl font-bold text-emerald-600">{earnedLabel}</p>
                {typeof card.maxCashback === 'number' && (
                  <p className="text-xs text-slate-400 mt-1">
                    Tien thuong toi da: {currencyFormatter.format(card.maxCashback)}
                  </p>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Da tieu: {spendLabel}</span>
                  <span>Can tieu: {spendGoalLabel}</span>
                </div>
                <Progress value={progressValue} />
                <div className="text-right text-xs text-slate-400">
                  {card.maxCashback
                    ? `${progressValue.toFixed(1)}% hoan thanh muc tieu`
                    : 'N/A'}
                </div>
              </div>
              {card.minSpend !== null && !card.minSpendMet && (
                <p className="mt-3 text-xs text-amber-600">
                  Can them {currencyFormatter.format(Math.max(0, card.minSpendRemaining ?? 0))} de dat min spend.
                </p>
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>Da chia: {currencyFormatter.format(card.sharedAmount)}</span>
                <span
                  className={`font-semibold ${
                    card.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'
                  }`}
                >
                  Loi nhuan: {currencyFormatter.format(card.netProfit)}
                </span>
              </div>

              <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dieu kien</p>
                    <p className="text-xs text-slate-500">
                      Rate: {ratePercent} - Max: {maxCashbackLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedCard(card)}
                    className="text-xs font-semibold text-blue-600 transition hover:text-blue-800"
                  >
                    Chi tiet
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {expandedCard && (
        <CashbackDetailsDialog
          card={expandedCard}
          onClose={() => setExpandedCard(null)}
        />
      )}
    </>
  )
}
