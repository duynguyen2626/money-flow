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
      return enriched ? { ...person, ...enriched } : person
    })
  )

  return (
    <div className="space-y-6">
      <PeopleGrid
        people={peopleWithSubs}
        subscriptions={subscriptions}
        shops={shops}
        accounts={accounts}
        categories={categories}
      />
    </div>
  )
}
