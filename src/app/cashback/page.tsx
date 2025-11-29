import { getCashbackProgress } from '@/services/cashback.service'
import { CashbackCard } from '@/components/moneyflow/cashback-card'

export const dynamic = 'force-dynamic'

export default async function CashbackPage() {
  const cards = await getCashbackProgress()

  return (
    <section className="space-y-4">
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

      {cards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map(card => (
            <CashbackCard key={card.accountId} card={card} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center text-slate-500">
          <p className="text-lg font-semibold">No cashback cards found</p>
          <p className="text-sm text-slate-400">
            Add a credit card with cashback configuration to see it here.
          </p>
        </div>
      )}
    </section>
  )
}
