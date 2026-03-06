import {
  getPocketBaseAccounts,
  getPocketBaseCategories,
  getPocketBaseUnifiedTransactions,
  getPocketBasePeople,
  getPocketBaseShops,
} from '@/services/pocketbase/account-details.service'
import { UnifiedTransactionsPage } from '@/components/transactions/UnifiedTransactionsPage'
import { TagFilterProvider } from '@/context/tag-filter-context'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Transactions | Money Flow',
}

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const [accounts, categories, people, recentTransactions, shops] = await Promise.all([
    getPocketBaseAccounts(),
    getPocketBaseCategories(),
    getPocketBasePeople(),
    getPocketBaseUnifiedTransactions({ limit: 1000, includeVoided: true }),
    getPocketBaseShops(),
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
