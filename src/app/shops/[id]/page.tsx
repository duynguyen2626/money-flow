import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShopById, getShops } from '@/services/shop.service'
import { RecentTransactions } from '@/components/moneyflow/recent-transactions'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type ShopDetailsPageProps = {
  params: {
    id: string
  }
}

export default async function ShopDetailsPage({ params }: ShopDetailsPageProps) {
  const { getTransactionsByShop } = await import('@/services/transaction.service')

  const [transactions, accounts, categories, people, shops, shop] = await Promise.all([
    getTransactionsByShop(params.id),
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
    getShopById(params.id)
  ])

  const displayShop = shop ?? shops.find(s => s.id === params.id)

  return (
    <section className="space-y-6">
       <header className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <Link
          href="/shops"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Shop Details</p>
          <div className="flex items-center gap-3 mt-1">
            {displayShop?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                src={displayShop.logo_url}
                alt={displayShop.name}
                className="h-8 w-8 rounded-full object-cover"
                />
            ) : displayShop && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {displayShop.name.charAt(0).toUpperCase()}
                </div>
            )}
            <h1 className="text-2xl font-semibold text-slate-900">{displayShop?.name ?? 'Unknown Shop'}</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">Transaction history for this shop.</p>
        </div>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <RecentTransactions
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            people={people}
            shops={shops}
        />
      </div>
    </section>
  )
}
