import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getServices } from '@/services/service-manager'
import { getPersonDetails, getDebtByTags } from '@/services/debt.service'
import { getUnifiedTransactions } from '@/services/transaction.service'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { TagFilterProvider } from '@/context/tag-filter-context'
import { Plus, CheckCheck, ChevronLeft } from 'lucide-react'
import { ResyncButton } from '@/components/people/resync-button'
import { EditPersonButton } from '@/components/people/edit-person-button'
import { PersonDetailTabs } from '@/components/people/person-detail-tabs'

export const dynamic = 'force-dynamic'

export default async function PeopleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: personId } = await params

  // First, get person details to determine the actual debt account ID
  const person = await getPersonDetails(personId)

  if (!person) {
    return notFound()
  }

  // Use the debt account ID (person.id) for fetching transactions and debt cycles
  // This ensures we get the correct data regardless of whether the URL has Profile ID or Account ID
  const actualAccountId = person.id

  const [accounts, categories, people, shops, transactions, debtCycles, subscriptions] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
    getUnifiedTransactions({ accountId: actualAccountId, personId: person.owner_id ?? undefined, limit: 200, context: 'person' }),
    getDebtByTags(actualAccountId),
    getServices(),
  ])

  const sheetProfileId = person.owner_id ?? personId
  const balance = person.current_balance ?? 0
  const balanceLabel = balance > 0 ? 'They owe you' : balance < 0 ? 'You owe them' : 'Settled'
  const balanceClass = balance > 0 ? 'text-rose-600' : balance < 0 ? 'text-emerald-600' : 'text-slate-600'

  // Map service result to component props
  const mappedCycles = debtCycles.map(c => ({
    tag: c.tag,
    balance: c.netBalance,
    status: c.status,
    last_activity: c.last_activity,
    total_debt: c.originalPrincipal,
    total_repaid: c.totalBack,
    total_cashback: c.totalCashback,
    totalOriginalDebt: c.totalOriginalDebt,
  }))

  const dialogBaseProps = { accounts, categories, people, shops }

  return (
    <TagFilterProvider>
      <div className="flex flex-col h-full overflow-hidden">
        <section className="flex-none bg-white shadow rounded-lg p-6 mx-6 mt-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <Link
                href="/people"
                className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                title="Back to People"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>

              {person.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.avatar_url} alt={person.name} className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-600">
                  {person.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{person.name}</h1>
                <p className="text-sm text-slate-500">{balanceLabel}</p>
                <p className={`text-xl font-bold ${balanceClass}`}>{balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              <EditPersonButton
                person={{ ...person, id: sheetProfileId, owner_id: sheetProfileId } as any}
                subscriptions={subscriptions}
              />
              <ResyncButton accountId={actualAccountId} />
              <AddTransactionDialog
                {...dialogBaseProps}
                buttonText="Settle"
                defaultType="repayment"
                defaultPersonId={actualAccountId}
                defaultAmount={Math.abs(balance)}
                buttonClassName="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors flex items-center gap-2"
                triggerContent={
                  <>
                    <CheckCheck className="h-4 w-4" />
                    <span>Settle</span>
                  </>
                }
              />
              <AddTransactionDialog
                {...dialogBaseProps}
                buttonText="Add Debt"
                defaultType="debt"
                defaultPersonId={actualAccountId}
                buttonClassName="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors flex items-center gap-2"
                triggerContent={
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Add Debt</span>
                  </>
                }
              />
            </div>
          </div>

          {/* Tabbed Content */}
          <PersonDetailTabs
            debtCycles={mappedCycles}
            accounts={accounts}
            categories={categories}
            people={people}
            shops={shops}
            personId={actualAccountId}
            sheetProfileId={sheetProfileId}
            sheetLink={person.sheet_link}
            transactions={transactions}
          />
        </section>
      </div>
    </TagFilterProvider>
  )
}
