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
import { ManageSheetButton } from '@/components/people/manage-sheet-button'
import { toYYYYMMFromDate } from '@/lib/month-tag'

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
  const currentCycleTag = toYYYYMMFromDate(new Date())

  const dialogBaseProps = { accounts, categories, people, shops }

  return (
    <TagFilterProvider>
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Section 1: Header/Filters */}
        <div className="flex-none z-10 bg-white border-b px-4 py-3 md:px-6 md:py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Back Button */}
                <Link
                  href="/people"
                  className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors md:h-10 md:w-10"
                  title="Back to People"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>

                {person.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.avatar_url} alt={person.name} className="h-10 w-10 rounded-md object-cover md:h-12 md:w-12" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-base font-bold text-slate-600 md:h-12 md:w-12 md:text-lg">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">{person.name}</h1>
                    <span className="text-sm text-slate-500">{balanceLabel}</span>
                    <span className={`text-lg font-bold md:text-xl ${balanceClass}`}>
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
                <ManageSheetButton
                  personId={sheetProfileId}
                  cycleTag={currentCycleTag}
                  initialSheetUrl={null}
                  scriptLink={person.sheet_link}
                  googleSheetUrl={person.google_sheet_url}
                  connectHref={`/people/${sheetProfileId}?tab=sheet`}
                  size="sm"
                  linkedLabel="Manage Sheet"
                  unlinkedLabel="Manage Sheet"
                  showViewLink={false}
                  showCycleAction={false}
                  buttonClassName="h-8 border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                />
                <AddTransactionDialog
                  {...dialogBaseProps}
                  buttonText="Settle"
                  defaultType="repayment"
                  defaultPersonId={actualAccountId}
                  defaultAmount={Math.abs(balance)}
                  buttonClassName="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-md shadow-sm transition-colors flex items-center gap-2 text-xs md:px-3 md:py-2 md:text-sm"
                  triggerContent={
                    <>
                      <CheckCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">Settle</span>
                    </>
                  }
                />
                <AddTransactionDialog
                  {...dialogBaseProps}
                  buttonText="Repay"
                  defaultType="repayment"
                  defaultPersonId={actualAccountId}
                  buttonClassName="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-md shadow-sm transition-colors flex items-center gap-2 text-xs md:px-3 md:py-2 md:text-sm"
                  triggerContent={
                    <>
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Repay</span>
                    </>
                  }
                />
                <AddTransactionDialog
                  {...dialogBaseProps}
                  buttonText="Add Debt"
                  defaultType="debt"
                  defaultPersonId={actualAccountId}
                  buttonClassName="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-md shadow-sm transition-colors flex items-center gap-2 text-xs md:px-3 md:py-2 md:text-sm"
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
        <div className="flex-1 min-h-0 p-4 space-y-4 bg-slate-50/50">
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
