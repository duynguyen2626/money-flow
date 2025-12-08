import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getUnifiedTransactions } from '@/services/transaction.service'
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
    getUnifiedTransactions({ limit: 100, includeVoided: true }),
    getShops(),
  ])

  return (
    <TagFilterProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-1 mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500">Manage your income and expenses, with real-time synchronization.</p>
        </div>

        <FilterableTransactions
          transactions={recentTransactions}
          categories={categories}
          accounts={accounts}
          people={people}
          shops={shops}
        />
      </div>
    </TagFilterProvider>
  )
}
