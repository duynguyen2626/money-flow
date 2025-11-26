import { getAccountDetails, getAccountStats, getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getUnifiedTransactions } from '@/services/transaction.service'
import { parseSavingsConfig, getSharedLimitParentId } from '@/lib/account-utils'
import { TagFilterProvider } from '@/context/tag-filter-context'
import { AccountDetailHeader } from '@/components/moneyflow/account-detail-header'
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions'

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

  const [stats, transactions, allAccounts, categories, people, shops] = await Promise.all([
    getAccountStats(id),
    getUnifiedTransactions(id, 200),
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
  ])

  const savingsAccounts = allAccounts.filter(acc =>
    acc.type === 'savings' || acc.type === 'investment' || acc.type === 'asset'
  )
  const collateralAccount = account.secured_by_account_id
    ? allAccounts.find(acc => acc.id === account.secured_by_account_id) ?? null
    : null
  const parentAccountId = getSharedLimitParentId(account.cashback_config ?? null)
  const parentAccount = parentAccountId
    ? allAccounts.find(acc => acc.id === parentAccountId) ?? null
    : null

  let totalInflow = 0
  let totalOutflow = 0
  transactions.forEach(txn => {
    txn.transaction_lines?.forEach(line => {
      if (line.account_id === id) {
        if (line.type === 'debit') {
          totalInflow += Math.abs(line.amount)
        } else if (line.type === 'credit') {
          totalOutflow += Math.abs(line.amount)
        }
      }
    })
  })

  const netBalance = totalInflow - totalOutflow
  const isCreditCard = account.type === 'credit_card'
  const isAssetAccount =
    account.type === 'savings' || account.type === 'investment' || account.type === 'asset'
  const assetConfig = isAssetAccount ? parseSavingsConfig(account.cashback_config) : null
  const formatDateValue = (value: string | null | undefined) => {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString('en-CA')
  }
  const cashbackStatsAvailable = Boolean(isCreditCard && stats)
  const statTotals = { inflow: totalInflow, outflow: totalOutflow, net: netBalance }
  const formattedAssetConfig = assetConfig
    ? { ...assetConfig, maturityDate: formatDateValue(assetConfig.maturityDate) }
    : null

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-6 shadow">
        <div className="space-y-4">
          <AccountDetailHeader
            account={account}
            categories={categories}
            people={people}
            allAccounts={allAccounts}
            savingsAccounts={savingsAccounts}
            collateralAccount={collateralAccount}
            statTotals={statTotals}
            cashbackStats={cashbackStatsAvailable ? stats : null}
            isAssetAccount={isAssetAccount}
            assetConfig={formattedAssetConfig}
            shops={shops}
          />
        </div>
      </section>

      <TagFilterProvider>
        <FilterableTransactions
          transactions={transactions}
          categories={categories}
          accounts={allAccounts}
          people={people}
          shops={shops}
          accountId={id}
          accountType={account.type}
        />
      </TagFilterProvider>
    </div>
  )
}
