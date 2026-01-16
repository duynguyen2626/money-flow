import { CashbackDashboard } from '@/components/moneyflow/cashback-dashboard'
import { getCashbackProgress } from '@/services/cashback.service'

export const dynamic = 'force-dynamic'

export default async function CashbackPage() {
  const cards = await getCashbackProgress()

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-6 shadow">
        <div className="border-b pb-4">
          <p className="text-sm uppercase text-slate-400">Cashback</p>
          <h1 className="text-2xl font-semibold text-slate-900">Theo doi tien thuong the</h1>
          <p className="text-sm text-slate-500">
            Xem tien da hoan va muc tieu chi tieu cho tung the tin dung.
          </p>
        </div>
        <div className="mt-6">
          <CashbackDashboard cards={cards} />
        </div>
      </section>
    </div>
  )
}
