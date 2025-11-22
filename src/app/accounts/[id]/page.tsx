import Link from 'next/link'
import { getAccountDetails, getAccountTransactions, getAccountStats, getAccountTransactionDetails, getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { ArrowLeftRight, CreditCard, Minus, Plus, User, Settings } from 'lucide-react'
import { EditAccountDialog } from '@/components/moneyflow/edit-account-dialog'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { formatCurrency, getAccountTypeLabel, parseSavingsConfig } from '@/lib/account-utils'
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions'
import { TagFilterProvider } from '@/context/tag-filter-context'

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

  const [txns, stats, txnDetails, allAccounts, categories, people] = await Promise.all([
    getAccountTransactions(id, 50),
    account.type === 'credit_card' ? getAccountStats(id) : Promise.resolve(null),
    getAccountTransactionDetails(id, 50),
    getAccounts(),
    getCategories(),
    getPeople(),
  ])

  const savingsAccounts = allAccounts.filter(acc =>
    acc.type === 'savings' || acc.type === 'investment' || acc.type === 'asset'
  )
  const collateralAccount = account.secured_by_account_id
    ? allAccounts.find(acc => acc.id === account.secured_by_account_id) ?? null
    : null

  let totalInflow = 0
  let totalOutflow = 0
  
  txnDetails.forEach(txn => {
    txn.transaction_lines?.forEach((line: { account_id: string; type: string; amount: number; }) => {
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
  const statSummary = [
    {
      label: 'In',
      value: totalInflow,
      tone: 'text-emerald-700',
      bg: 'bg-emerald-50',
      prefix: '+',
    },
    {
      label: 'Out',
      value: totalOutflow,
      tone: 'text-red-700',
      bg: 'bg-red-50',
      prefix: '-',
    },
    {
      label: 'Net',
      value: netBalance,
      tone: netBalance >= 0 ? 'text-emerald-700' : 'text-red-700',
      bg: 'bg-slate-100',
      prefix: netBalance >= 0 ? '+' : '-',
    },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl font-semibold text-slate-600">
                  {account.name.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <h1 className="text-xl font-semibold">{account.name}</h1>
                  <p className="text-sm uppercase tracking-wide text-slate-500">
                    {getAccountTypeLabel(account.type)}
                  </p>
                  {isCreditCard && account.credit_limit !== undefined && (
                    <p className="text-xs text-slate-500">
                      Credit limit: {formatCurrency(account.credit_limit ?? 0)}
                    </p>
                  )}
                  {isCreditCard && collateralAccount && (
                    <p className="text-xs font-medium text-blue-700">
                      Secured by{' '}
                      <Link href={`/accounts/${collateralAccount.id}`} className="underline">
                        {collateralAccount.name}
                      </Link>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Current balance</span>
                  <p
                    className={`text-2xl font-semibold tabular-nums ${
                      account.current_balance < 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {formatCurrency(account.current_balance)}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {account.type !== 'credit_card' && (
                    <AddTransactionDialog
                      accounts={allAccounts}
                      categories={categories}
                      people={people}
                      defaultType="transfer"
                      defaultSourceAccountId={account.id}
                      triggerContent={
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-slate-700">
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                          Transfer
                        </span>
                      }
                    />
                  )}
                  {account.type === 'credit_card' && (
                    <AddTransactionDialog
                      accounts={allAccounts}
                      categories={categories}
                      people={people}
                      defaultType="transfer"
                      defaultDebtAccountId={account.id}
                      triggerContent={
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-blue-700">
                          <CreditCard className="h-3.5 w-3.5" />
                          Credit Pay
                        </span>
                      }
                    />
                  )}
                  <AddTransactionDialog
                    accounts={allAccounts}
                    categories={categories}
                    people={people}
                    defaultType="debt"
                    defaultDebtAccountId={account.id}
                    defaultSourceAccountId={account.id}
                    triggerContent={
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-amber-600">
                        <User className="h-3.5 w-3.5" />
                        Debt
                      </span>
                    }
                  />
                  <AddTransactionDialog
                    accounts={allAccounts}
                    categories={categories}
                    people={people}
                    defaultType="income"
                    defaultSourceAccountId={account.id}
                    triggerContent={
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700">
                        <Plus className="h-3.5 w-3.5" />
                        Income
                      </span>
                    }
                  />
                  <AddTransactionDialog
                    accounts={allAccounts}
                    categories={categories}
                    people={people}
                    defaultType="expense"
                    defaultSourceAccountId={account.id}
                    triggerContent={
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-rose-700">
                        <Minus className="h-3.5 w-3.5" />
                        Expense
                      </span>
                    }
                  />
                  <EditAccountDialog
                    account={account}
                    collateralAccounts={savingsAccounts}
                    triggerContent={
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-slate-800">
                        <Settings className="h-3.5 w-3.5" />
                        Settings
                      </span>
                    }
                  />
                </div>
              </div>
            </div>

            {cashbackStatsAvailable && stats ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <div className="text-left">
                  <p className="text-xs uppercase tracking-wide text-slate-600">Cashback Cycle</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {stats.currentSpend > 0 ? formatCurrency(stats.currentSpend) : 'No spending yet'}
                  </p>
                </div>
                <div className="flex flex-col items-end text-xs text-slate-600">
                  <span>
                    Rate: {Math.round(stats.rate * 100)}%
                    {stats.minSpend ? ` · Min spend ${formatCurrency(stats.minSpend)}` : ' · No min spend'}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    Remaining:{' '}
                    {stats.maxCashback
                      ? formatCurrency(Math.max(0, stats.maxCashback - stats.earnedSoFar))
                      : 'Unlimited'}
                  </span>
                </div>
              </div>
            ) : isAssetAccount ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <p className="text-xs uppercase tracking-wide text-slate-500">Interest Information</p>
                <p className="text-sm font-semibold text-slate-900">
                  {assetConfig?.interestRate !== null && assetConfig?.interestRate !== undefined
                    ? `${assetConfig.interestRate}%`
                    : 'Not set'}
                </p>
                <p className="text-xs text-slate-500">
                  {assetConfig?.termMonths ? `${assetConfig.termMonths} months` : 'No term'}
                  {assetConfig?.maturityDate ? ` · Matures on ${formatDateValue(assetConfig.maturityDate) ?? ''}` : ''}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <p className="text-xs uppercase tracking-wide text-slate-500">Cashback Cycle</p>
                <p className="text-sm font-semibold text-slate-500">Not applicable</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
            {statSummary.map(stat => (
              <div
                key={stat.label}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${stat.bg}`}
              >
                <span className="text-slate-600">{stat.label}:</span>
                <span className={`${stat.tone} tabular-nums`}>
                  {stat.prefix} {formatCurrency(Math.abs(stat.value))}
                </span>
              </div>
            ))}
          </div>

          {cashbackStatsAvailable && stats && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Earned:</span>
                <span className="font-semibold text-emerald-700">{formatCurrency(stats.earnedSoFar)}</span>
                {stats.maxCashback && <span className="text-slate-500">/ {formatCurrency(stats.maxCashback)}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Remaining:</span>
                <span className="font-semibold">
                  {stats.maxCashback
                    ? formatCurrency(Math.max(0, stats.maxCashback - stats.earnedSoFar))
                    : 'Unlimited'}
                </span>
              </div>
            </div>
          )}
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
              accountType={account.type}
            />
          </div>
        </section>
      </TagFilterProvider>
    </div>
  )
}
