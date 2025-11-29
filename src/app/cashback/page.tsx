import { getCashbackProgress } from '@/services/cashback.service'
import { CashbackCard } from '@/components/moneyflow/cashback-card'
import { Layers, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CashbackPage() {
  const cards = await getCashbackProgress()

  const minSpendCards = cards.filter(c => typeof c.minSpend === 'number' && c.minSpend > 0)
  const directCards = cards.filter(c => !c.minSpend || c.minSpend === 0)

  return (
    <section className="space-y-8">
      <header className="rounded-lg border bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Cashback Tracking</p>
            <h1 className="text-2xl font-semibold text-slate-900">Cashback Overview</h1>
            <p className="text-sm text-slate-500">
              Track your earnings and remaining limits for each card.
            </p>
          </div>
          <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            {cards.length} cards active
          </div>
        </div>
      </header>

      {cards.length === 0 && (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center text-slate-500">
          <p className="text-lg font-semibold">No cashback cards found</p>
          <p className="text-sm text-slate-400">
            Add a credit card with cashback configuration to see it here.
          </p>
        </div>
      )}

      {directCards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Zap className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Direct Cashback</h2>
            <span className="text-xs text-slate-400 font-normal">(No minimum spend required)</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {directCards.map(card => (
              <CashbackCard key={card.accountId} card={card} />
            ))}
          </div>
        </div>
      )}

      {minSpendCards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Layers className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Tiered / Min Spend</h2>
            <span className="text-xs text-slate-400 font-normal">(Requires minimum spend)</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {minSpendCards.map(card => (
              <CashbackCard key={card.accountId} card={card} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
