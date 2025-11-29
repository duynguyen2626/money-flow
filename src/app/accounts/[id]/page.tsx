import { getAccountDetails, getAccounts } from '@/services/account.service'
import { getUnifiedTransactions } from '@/services/transaction.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { TagFilterProvider } from '@/context/tag-filter-context'
import { AccountDetailsView } from '@/components/moneyflow/account-details-view'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function AccountPage({ params }: PageProps) {
  const { id } = await params

  if (!id || id === 'undefined') {
    return (
      <div className="p-6">
        <p className="text-center text-sm text-gray-500">Invalid account ID.</p>
      </div>
    )
  }

  const account = await getAccountDetails(id)

  if (!account) {
    return (
      <div className="p-6">
        <p className="text-center text-sm text-gray-500">Account not found.</p>
      </div>
    )
  }

  const [transactions, allAccounts, categories, people, shops] = await Promise.all([
    getUnifiedTransactions({ accountId: id, context: 'account', limit: 1000 }), // Increased limit for better view
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
  ])

  return (
    <TagFilterProvider>
      <AccountDetailsView
        account={account}
        transactions={transactions}
        accounts={allAccounts}
        categories={categories}
        people={people}
        shops={shops}
      />
    </TagFilterProvider>
  )
}
