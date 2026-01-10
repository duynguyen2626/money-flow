import { getAccountDetails, getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getAccountBatchStats } from '@/services/batch.service'
import { getAccountSpendingStats } from '@/services/cashback.service'
import { loadTransactions } from '@/services/transaction.service'
import { AccountDetailHeader } from '@/components/moneyflow/account-detail-header'
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions'
import { TagFilterProvider } from '@/context/tag-filter-context'

import { AccountTabs } from '@/components/moneyflow/account-tabs'

type PageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    tab?: string
  }>
}

export default async function AccountPage({ params, searchParams }: PageProps) {
  const { id } = await params
  // Removed cashback tab logic
  const activeTab = 'transactions'

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

  const [allAccounts, categories, people, shops, batchStats, cashbackStats, transactions] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
    getAccountBatchStats(id),
    getAccountSpendingStats(id, new Date()),
    loadTransactions({ accountId: id, context: 'account', limit: 1000 }),
  ])

  // Derived data for header
  const savingsAccounts = allAccounts.filter(a => a.type === 'savings' || a.type === 'investment' || a.type === 'asset')
  const collateralAccount = account.secured_by_account_id ? allAccounts.find(a => a.id === account.secured_by_account_id) ?? null : null

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50">
      <TagFilterProvider>
        {/* Header - Reduced Spacing */}
        <div className="mx-6 mt-6 mb-3 space-y-3">
          <AccountDetailHeader
            account={account}
            categories={categories}
            people={people}
            allAccounts={allAccounts}
            savingsAccounts={savingsAccounts}
            collateralAccount={collateralAccount}
            statTotals={{ inflow: 0, outflow: 0, net: 0 }}
            cashbackStats={cashbackStats ?? null}
            isAssetAccount={account.type === 'asset'}
            assetConfig={null}
            shops={shops}
            batchStats={batchStats}
          />

          <AccountTabs accountId={account.id} activeTab={activeTab} />
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white">
          <FilterableTransactions
            transactions={transactions}
            accounts={allAccounts}
            categories={categories}
            people={people}
            shops={shops}
            accountId={account.id}
            accountType={account.type}
            contextId={account.id}
            context="account"
          />
        </div>
      </TagFilterProvider>
    </div>
  )
}
