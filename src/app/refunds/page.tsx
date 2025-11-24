import { getAccountTransactions } from '@/services/account.service'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { RecentTransactions } from '@/components/moneyflow/recent-transactions'
import { REFUND_PENDING_ACCOUNT_ID } from '@/constants/refunds'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RefundsPage() {
  const [transactions, accounts, categories, people, shops] = await Promise.all([
    getAccountTransactions(REFUND_PENDING_ACCOUNT_ID),
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
  ])

  // Filter out any transactions that might have been settled or don't belong (double safety)
  // Although getAccountTransactions(REFUND_PENDING_ACCOUNT_ID) should only return relevant ones.
  // We strictly want pending refunds here.

  return (
    <section className="space-y-6">
       <header className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <Link
          href="/transactions"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Refund Tracker</p>
          <h1 className="text-2xl font-semibold text-slate-900">Pending Refunds</h1>
          <p className="text-sm text-slate-500">Track and confirm refunds that are waiting to be received.</p>
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
