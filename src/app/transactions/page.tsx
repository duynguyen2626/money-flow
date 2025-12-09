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
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-none flex flex-col gap-1 px-6 pt-6 pb-4 bg-background border-b">
          <h1 className="text-2xl font-semibold text-slate-900">Transactions</h1>
        </div>

        <div className="flex-1 overflow-hidden">
          <FilterableTransactions
            transactions={recentTransactions}
            categories={categories}
            accounts={accounts}
            people={people}
            shops={shops}
          />
        </div>
      </div>
    </TagFilterProvider>
  )
}
