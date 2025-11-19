import { CreditCard } from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import { CashbackCard } from '@/services/cashback.service'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

type CashbackDashboardProps = {
  cards: CashbackCard[]
}

export function CashbackDashboard({ cards }: CashbackDashboardProps) {
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
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {cards.map(card => {
        const spendGoalLabel =
          typeof card.spendTarget === 'number'
            ? currencyFormatter.format(card.spendTarget)
            : 'Khong gioi han'

        const progressValue = Number.isFinite(card.progress) ? card.progress : 0
        const earnedLabel = currencyFormatter.format(card.earned)
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
                {progressValue.toFixed(0)}% hoan thanh muc tieu
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium">Dieu kien</p>
              <p className="text-xs text-slate-500">
                Rate: {ratePercent} - Max: {maxCashbackLabel}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
