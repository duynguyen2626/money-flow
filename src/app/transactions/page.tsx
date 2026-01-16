import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getUnifiedTransactions } from '@/services/transaction.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { UnifiedTransactionsPage } from '@/components/transactions/UnifiedTransactionsPage'
import { TagFilterProvider } from '@/context/tag-filter-context'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Transactions',
}

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
      <UnifiedTransactionsPage
        transactions={recentTransactions}
        accounts={accounts}
        categories={categories}
        people={people}
        shops={shops}
      />
    </TagFilterProvider>
  )
}
