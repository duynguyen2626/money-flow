import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getRecentTransactions } from '@/services/transaction.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions'
import { TagFilterProvider } from '@/context/tag-filter-context'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const [accounts, categories, people, recentTransactions, shops] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getRecentTransactions(50),
    getShops(),
  ])

  return (
    <TagFilterProvider>
      <div className="space-y-6">
        <section className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 border-b pb-4">
            <div>
              <h1 className="text-2xl font-semibold">Transactions</h1>
              <p className="text-sm text-slate-500">Manage your income and expenses, with real-time synchronization.</p>
            </div>
            <AddTransactionDialog accounts={accounts} categories={categories} people={people} shops={shops} />
          </div>
          <FilterableTransactions
            transactions={recentTransactions}
            categories={categories}
            accounts={accounts}
            people={people}
            shops={shops}
          />
        </section>
      </div>
    </TagFilterProvider>
  )
}
