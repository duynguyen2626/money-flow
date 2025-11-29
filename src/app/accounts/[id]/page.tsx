import { getAccountDetails, getAccounts } from '@/services/account.service'
import { getUnifiedTransactions } from '@/services/transaction.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getSharedLimitParentId } from '@/lib/account-utils'
import { TagFilterProvider } from '@/context/tag-filter-context'
import { UnifiedTransactionTable } from '@/components/moneyflow/unified-transaction-table'
import { CreditCard, Wallet, Plus, Minus, ArrowLeftRight, User, Settings } from 'lucide-react'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { EditAccountDialog } from '@/components/moneyflow/edit-account-dialog'
import Link from 'next/link'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

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
    getUnifiedTransactions({ accountId: id, context: 'account', limit: 100 }),
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
  ])

  const savingsAccounts = allAccounts.filter(acc =>
    acc.type === 'savings' || acc.type === 'investment' || acc.type === 'asset'
  )

  // Calculate credit card metrics
  const isCreditCard = account.type === 'credit_card'
  const sharedLimitParentId = getSharedLimitParentId(account.cashback_config ?? null)
  const parentAccount = sharedLimitParentId
    ? allAccounts.find(acc => acc.id === sharedLimitParentId) ?? null
    : null
  const isChildCard = !!parentAccount

  let displayBalance = account.current_balance
  let displayLabel = 'Current Balance'

  if (isCreditCard) {
    const creditLimit = account.credit_limit ?? 0
    const netBalance = (account.total_in ?? 0) - (account.total_out ?? 0)

    if (isChildCard && parentAccount) {
      const parentNetBalance = (parentAccount.total_in ?? 0) - (parentAccount.total_out ?? 0)
      const combinedNetBalance = parentNetBalance + netBalance
      const displayLimit = parentAccount.credit_limit ?? 0
      displayBalance = displayLimit + combinedNetBalance
    } else {
      displayBalance = creditLimit + netBalance
    }

    displayLabel = 'Available'
  }

  const dialogBaseProps = {
    accounts: allAccounts,
    categories,
    people,
    shops,
  }

  return (
    <div className="space-y-6">
      {/* Simple Header Section */}
      <section className="rounded-lg bg-white p-6 shadow border border-slate-200">
        <div className="flex items-start justify-between mb-6">
          {/* Left: Logo + Name + Balance */}
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              {account.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={account.logo_url}
                  alt={account.name}
                  className="h-16 w-16 object-contain rounded-lg border border-slate-200"
                />
              ) : (
                <div className="h-16 w-16 flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200">
                  {isCreditCard ? (
                    <CreditCard className="h-8 w-8 text-slate-400" />
                  ) : (
                    <Wallet className="h-8 w-8 text-slate-400" />
                  )}
                </div>
              )}
            </div>

            {/* Name + Balance */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{account.name}</h1>
                {isChildCard && parentAccount && (
                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Linked to {parentAccount.name}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {displayLabel}
                </p>
                <p className={`text-3xl font-bold tracking-tight ${isCreditCard
                    ? (displayBalance < (account.credit_limit ?? 0) * 0.3 ? 'text-amber-600' : 'text-emerald-600')
                    : (displayBalance < 0 ? 'text-red-600' : 'text-slate-900')
                  }`}>
                  {currencyFormatter.format(displayBalance)}
                </p>

                {isCreditCard && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Limit: <span className="font-medium">{currencyFormatter.format(isChildCard && parentAccount ? (parentAccount.credit_limit ?? 0) : (account.credit_limit ?? 0))}</span></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Back to Accounts */}
          <Link
            href="/accounts"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Accounts
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
          {isCreditCard ? (
            <>
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="transfer"
                defaultDebtAccountId={account.id}
                triggerContent={
                  <span className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-white px-3 py-1.5 text-xs font-semibold text-purple-700 shadow-sm hover:border-purple-200 hover:bg-purple-50">
                    <CreditCard className="h-3.5 w-3.5" />
                    Pay Card
                  </span>
                }
              />
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="income"
                defaultSourceAccountId={account.id}
                triggerContent={
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm hover:border-emerald-200 hover:bg-emerald-50">
                    <Plus className="h-3.5 w-3.5" />
                    Income
                  </span>
                }
              />
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="expense"
                defaultSourceAccountId={account.id}
                triggerContent={
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:border-rose-200 hover:bg-rose-50">
                    <Minus className="h-3.5 w-3.5" />
                    Expense
                  </span>
                }
              />
            </>
          ) : (
            <>
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="income"
                defaultSourceAccountId={account.id}
                triggerContent={
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm hover:border-emerald-200 hover:bg-emerald-50">
                    <Plus className="h-3.5 w-3.5" />
                    Income
                  </span>
                }
              />
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="expense"
                defaultSourceAccountId={account.id}
                triggerContent={
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:border-rose-200 hover:bg-rose-50">
                    <Minus className="h-3.5 w-3.5" />
                    Expense
                  </span>
                }
              />
              <AddTransactionDialog
                {...dialogBaseProps}
                defaultType="transfer"
                defaultSourceAccountId={account.id}
                triggerContent={
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50">
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    Transfer
                  </span>
                }
              />
            </>
          )}
          <AddTransactionDialog
            {...dialogBaseProps}
            defaultType="debt"
            defaultSourceAccountId={account.id}
            triggerContent={
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm hover:border-amber-200 hover:bg-amber-50">
                <User className="h-3.5 w-3.5" />
                Lend / Debt
              </span>
            }
          />
          <EditAccountDialog
            account={account}
            collateralAccounts={savingsAccounts}
            accounts={allAccounts}
            triggerContent={
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200">
                <Settings className="h-3.5 w-3.5" />
                Settings
              </span>
            }
          />
        </div>
      </section>

      {/* Transaction Table Section */}
      <TagFilterProvider>
        <section className="bg-white shadow rounded-lg border border-slate-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 border-b pb-3">Transaction History</h2>

            {/* Table Container with Horizontal Scroll */}
            <div className="w-full max-w-[calc(100vw-48px)] mx-auto">
              <div className="border rounded-md overflow-hidden flex flex-col">
                <div className="overflow-x-auto overflow-y-hidden">
                  <UnifiedTransactionTable
                    data={transactions}
                    transactions={transactions}
                    context="account"
                    accountId={id}
                    accountType={account.type}
                    accounts={allAccounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </TagFilterProvider>
    </div>
  )
}
