import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getUnifiedTransactions } from '@/services/transaction.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { UnifiedTransactionsPageV2 } from '@/components/transactions/UnifiedTransactionsPageV2'
import { TagFilterProvider } from '@/context/tag-filter-context'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Transactions V2 (Test)',
}

export const dynamic = 'force-dynamic'

export default async function TransactionsPageV2() {
  const [accounts, categories, people, recentTransactions, shops] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getUnifiedTransactions({ limit: 1000, includeVoided: true }),
    getShops(),
  ])

  return (
    <TagFilterProvider>
      <UnifiedTransactionsPageV2
        transactions={recentTransactions}
        accounts={accounts}
        categories={categories}
        people={people}
        shops={shops}
      />
    </TagFilterProvider>
  )
}
