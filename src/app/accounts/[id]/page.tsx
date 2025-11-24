import { getAccountDetails, getAccountTransactions, getAccountStats, getAccountTransactionDetails, getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { parseSavingsConfig, getSharedLimitParentId } from '@/lib/account-utils'
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions'
import { TagFilterProvider } from '@/context/tag-filter-context'
import { AccountDetailHeader } from '@/components/moneyflow/account-detail-header'

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

  const [txns, stats, txnDetails, allAccounts, categories, people, shops] = await Promise.all([
    getAccountTransactions(id, 50),
    account.type === 'credit_card' ? getAccountStats(id) : Promise.resolve(null),
    getAccountTransactionDetails(id, 50),
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

  txnDetails.forEach(txn => {
    txn.transaction_lines?.forEach((line: { account_id: string; type: string; amount: number }) => {
      if (line.account_id === id) {
        if (line.type === 'debit') {
          totalOutflow += Math.abs(line.amount)
        } else if (line.type === 'credit') {
          totalInflow += Math.abs(line.amount)
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
        <section className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-lg font-semibold">Transaction History</h2>
            <span className="text-sm text-slate-500">{txns.length} most recent</span>
          </div>
          <div className="mt-4">
            <FilterableTransactions
              transactions={txns}
              categories={categories}
              accounts={allAccounts}
              people={people}
              accountType={account.type}
              accountId={id}
            />
          </div>
        </section>
      </TagFilterProvider>
    </div>
  )
}
