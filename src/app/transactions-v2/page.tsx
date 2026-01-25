import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getUnifiedTransactions } from '@/services/transaction.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { TransactionsPageV2 } from '@/components/transactions-v2/TransactionsPageV2'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Transactions V2 | Money Flow',
}

export const dynamic = 'force-dynamic'

export default async function TransactionsV2Page() {
  const [accounts, categories, people, recentTransactions, shops] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getUnifiedTransactions({ limit: 1000, includeVoided: true }),
    getShops(),
  ])

  return (
    <TransactionsPageV2
      transactions={recentTransactions}
      accounts={accounts}
      categories={categories}
      people={people}
      shops={shops}
    />
  )
}
