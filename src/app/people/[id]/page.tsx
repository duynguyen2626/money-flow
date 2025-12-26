import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getServices } from '@/services/service-manager'
import { getPersonDetails } from '@/services/debt.service'
import { getUnifiedTransactions } from '@/services/transaction.service'
import { getPersonCycleSheets } from '@/services/person-cycle-sheet.service'
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

  const sheetProfileId = person.owner_id ?? personId

  const [accounts, categories, people, shops, transactions, subscriptions, cycleSheets] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
    getUnifiedTransactions({ accountId: actualAccountId, personId: person.owner_id ?? undefined, limit: 1000, context: 'person' }),
    getServices(),
    getPersonCycleSheets(sheetProfileId),
  ])

  const balance = person.current_balance ?? 0
  const balanceLabel = balance > 0 ? 'They owe you' : balance < 0 ? 'You owe them' : 'Settled'
  const balanceClass = balance > 0 ? 'text-rose-600' : balance < 0 ? 'text-emerald-600' : 'text-slate-600'

  const dialogBaseProps = { accounts, categories, people, shops }

  return (
    <TagFilterProvider>
      <div className="flex flex-col h-[calc(100vh-theme(spacing.header))] overflow-hidden">
        {/* Section 1: Header/Filters */}
        <div className="flex-none z-10 bg-white border-b px-6 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
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
                  <img src={person.avatar_url} alt={person.name} className="h-12 w-12 rounded-md object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-lg font-bold text-slate-600">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h1 className="text-2xl font-semibold text-slate-900">{person.name}</h1>
                    <span className="text-sm text-slate-500">{balanceLabel}</span>
                    <span className={`text-xl font-bold ${balanceClass}`}>
                      {balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
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
                  buttonClassName="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md shadow-sm transition-colors flex items-center gap-2 text-sm"
                  triggerContent={
                    <>
                      <CheckCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">Settle</span>
                    </>
                  }
                />
                <AddTransactionDialog
                  {...dialogBaseProps}
                  buttonText="Add Debt"
                  defaultType="debt"
                  defaultPersonId={actualAccountId}
                  buttonClassName="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-md shadow-sm transition-colors flex items-center gap-2 text-sm"
                  triggerContent={
                    <>
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add Debt</span>
                    </>
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Content - The Cycle List */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4 bg-slate-50/50">
          <PersonDetailTabs
            accounts={accounts}
            categories={categories}
            people={people}
            shops={shops}
            personId={actualAccountId}
            sheetProfileId={sheetProfileId}
            sheetLink={person.sheet_link}
            googleSheetUrl={person.google_sheet_url}
            transactions={transactions}
            cycleSheets={cycleSheets}
          />
        </div>
      </div>
    </TagFilterProvider>
  )
}
