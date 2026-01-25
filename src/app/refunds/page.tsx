import { getAccountTransactions } from '@/services/account.service'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { UnifiedTransactionTable } from '@/components/moneyflow/unified-transaction-table'
import { REFUND_PENDING_ACCOUNT_ID } from '@/constants/refunds'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Refund Queue | Money Flow',
}

export const dynamic = 'force-dynamic'

export default async function RefundsPage() {
  const [transactions, accounts, categories, people, shops] = await Promise.all([
    getAccountTransactions(REFUND_PENDING_ACCOUNT_ID),
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex-none flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm mx-6 mt-6">
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

      <div className="flex-1 overflow-hidden mx-6 my-6">
        <UnifiedTransactionTable
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          people={people}
          shops={shops}
          accountId={REFUND_PENDING_ACCOUNT_ID}
        />
      </div>
    </div>
  )
}
