import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getRecentTransactions } from '@/services/transaction.service'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { RecentTransactions } from '@/components/moneyflow/recent-transactions'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const [accounts, categories, recentTransactions] = await Promise.all([
    getAccounts(),
    getCategories(),
    getRecentTransactions(25),
  ])

  return (
    <div className="space-y-6">
      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-semibold">So giao dich</h1>
            <p className="text-sm text-slate-500">Quan ly thu chi va dong bo theo thoi gian thuc</p>
          </div>
          <AddTransactionDialog accounts={accounts} categories={categories} />
        </div>
        <RecentTransactions transactions={recentTransactions} />
      </section>
    </div>
  )
}
