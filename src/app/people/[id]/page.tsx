import { notFound } from 'next/navigation'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getPersonDetails, getDebtByTags } from '@/services/debt.service'
import { getUnifiedTransactions } from '@/services/transaction.service'
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions'
import { TagFilterProvider } from '@/context/tag-filter-context'
import { DebtCycleTabs } from '@/components/moneyflow/debt-cycle-tabs'
import { SheetSyncControls } from '@/components/people/sheet-sync-controls'
import { Plus, CheckCheck } from 'lucide-react'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { ResyncButton } from '@/components/people/resync-button'

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

  const [accounts, categories, people, shops, transactions, debtCycles] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
    getUnifiedTransactions({ accountId: actualAccountId, personId: person.owner_id ?? undefined, limit: 200, context: 'person' }),
    getDebtByTags(actualAccountId),
  ])

  const sheetProfileId = person.owner_id ?? personId
  const balance = person.current_balance ?? 0
  const balanceLabel = balance > 0 ? 'They owe you' : balance < 0 ? 'You owe them' : 'Settled'
  const balanceClass = balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-red-600' : 'text-slate-600'

  // Map service result to component props
  const mappedCycles = debtCycles.map(c => ({
    tag: c.tag,
    balance: c.netBalance,
    status: c.status,
    last_activity: c.last_activity
  }))

  return (
    <TagFilterProvider>
      <div className="space-y-6">
        <section className="bg-white shadow rounded-lg p-6">
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

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              <ResyncButton accountId={actualAccountId} />
              <AddTransactionDialog
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
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
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                buttonText="Add Debt"
                defaultType="debt"
                defaultPersonId={actualAccountId}
                buttonClassName="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors flex items-center gap-2"
                triggerContent={
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Add Debt</span>
                  </>
                }
              />
            </div>
          </div>

          <div className="mt-6">
            <CollapsibleSection title="Sheet Sync & Debt Cycles" defaultOpen={true}>
              <div className="space-y-6">
                {/* Sheet Sync Controls */}
                <SheetSyncControls personId={sheetProfileId} sheetLink={person.sheet_link} />

                {/* Debt Cycle Cards */}
                <DebtCycleTabs
                  allCycles={mappedCycles}
                  accounts={accounts}
                  categories={categories}
                  people={people}
                  shops={shops}
                  personId={actualAccountId}
                />
              </div>
            </CollapsibleSection>
          </div>

          <div className="mt-6">
            <FilterableTransactions
              transactions={transactions}
              categories={categories}
              accounts={accounts}
              people={people}
              shops={shops}
              accountId={actualAccountId}
              accountType="debt"
              hidePeopleColumn
            />
          </div>
        </section>
      </div>
    </TagFilterProvider>
  )
}
