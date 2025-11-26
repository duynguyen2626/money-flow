import { notFound } from 'next/navigation'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getPersonDetails } from '@/services/debt.service'
import { getUnifiedTransactions } from '@/services/transaction.service'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions'
import { TagFilterProvider } from '@/context/tag-filter-context'

export const dynamic = 'force-dynamic'

export default async function PeopleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: personId } = await params

  const [person, accounts, categories, people, shops, transactions] = await Promise.all([
    getPersonDetails(personId),
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
    getUnifiedTransactions({ accountId: personId, limit: 200, context: 'person' }),
  ])

  if (!person) {
    return notFound()
  }

  const balance = person.current_balance ?? 0
  const balanceLabel = balance > 0 ? 'They owe you' : balance < 0 ? 'You owe them' : 'Settled'
  const balanceClass = balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-red-600' : 'text-slate-600'

  return (
    <TagFilterProvider>
      <div className="space-y-6">
        <section className="relative bg-white shadow rounded-lg p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
            <div className="flex items-center gap-4">
              {person.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.avatar_url} alt={person.name} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600">
                  {person.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{person.name}</h1>
                <p className="text-sm text-slate-500">{balanceLabel}</p>
                <p className={`text-xl font-bold ${balanceClass}`}>{balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <FilterableTransactions
              transactions={transactions}
              categories={categories}
              accounts={accounts}
              people={people}
              shops={shops}
              accountId={personId}
              accountType="debt"
              hidePeopleColumn
            />
          </div>
          <div className="absolute right-4 bottom-4 flex flex-col gap-2">
            <AddTransactionDialog
              accounts={accounts}
              categories={categories}
              people={people}
              shops={shops}
              buttonText=""
              defaultType="repayment"
              defaultPersonId={personId}
              defaultAmount={Math.abs(balance)}
              buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600 shadow hover:bg-green-100"
              triggerContent={<span title="Settle">✔</span>}
            />
            <AddTransactionDialog
              accounts={accounts}
              categories={categories}
              people={people}
              shops={shops}
              buttonText=""
              defaultType="debt"
              defaultPersonId={personId}
              buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 shadow hover:bg-red-100"
              triggerContent={<span title="Add Debt">＋</span>}
            />
          </div>
        </section>
      </div>
    </TagFilterProvider>
  )
}
