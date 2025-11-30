import { getPeople, getPersonWithSubs } from '@/services/people.service'
import { getSubscriptions } from '@/services/subscription.service'
import { CreatePersonDialog } from '@/components/people/create-person-dialog'
import { PeopleGrid } from '@/components/people/people-grid'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getShops } from '@/services/shop.service'

export const dynamic = 'force-dynamic'

export default async function PeoplePage() {
  const [people, subscriptions, shops, accounts, categories] = await Promise.all([
    getPeople(),
    getSubscriptions(),
    getShops(),
    getAccounts(),
    getCategories(),
  ])
  const peopleWithSubs = await Promise.all(
    people.map(async person => {
      const enriched = await getPersonWithSubs(person.id)
      return enriched ?? person
    })
  )

  return (
    <div className="space-y-6">
      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-semibold">Quan ly thanh vien</h1>
            <p className="text-sm text-slate-500">Tao nguoi moi va di toi ho so cong no</p>
          </div>
          <CreatePersonDialog subscriptions={subscriptions} />
        </div>

        {people.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <p className="text-lg font-semibold text-slate-700">Chua co thanh vien nao</p>
            <p className="text-sm text-slate-500">Bam &ldquo;Them thanh vien&rdquo; de bat dau tao doi tac vay/no.</p>
          </div>
        ) : (
          <PeopleGrid
            people={peopleWithSubs}
            subscriptions={subscriptions}
            shops={shops}
            accounts={accounts}
            categories={categories}
          />
        )}
      </section>
    </div>
  )
}
