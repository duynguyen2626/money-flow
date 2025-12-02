import { getPeople, getPersonWithSubs } from '@/services/people.service'
import { CreatePersonDialog } from '@/components/people/create-person-dialog'
import { PeopleGrid } from '@/components/people/people-grid'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getShops } from '@/services/shop.service'

export const dynamic = 'force-dynamic'

export default async function PeoplePage() {
  const [peopleAll, shops, accounts, categories] = await Promise.all([
    getPeople({ includeArchived: true }),
    getShops(),
    getAccounts(),
    getCategories(),
  ])
  const peopleWithSubs = await Promise.all(
    peopleAll.map(async person => {
      const enriched = await getPersonWithSubs(person.id)
      return enriched ? { ...person, ...enriched } : person
    })
  )

  return (
    <div className="space-y-6">
      <PeopleGrid
        people={peopleWithSubs}
        subscriptions={[]}
        shops={shops}
        accounts={accounts}
        categories={categories}
      />
    </div>
  )
}
