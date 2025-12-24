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
    getUnifiedTransactions({ limit: 1000, includeVoided: true }),
    getShops(),
  ])

  return (
    <TagFilterProvider>
      <div className="flex h-full overflow-hidden overflow-x-hidden">
        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <FilterableTransactions
              transactions={recentTransactions}
              categories={categories}
              accounts={accounts}
              people={people}
              shops={shops}
            />
          </div>
        </div>
      </div>
    </TagFilterProvider>
  )
}
