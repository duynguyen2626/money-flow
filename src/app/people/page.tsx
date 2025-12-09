import { getPeople } from '@/services/people.service'
import { PeopleGrid } from '@/components/people/people-grid'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getShops } from '@/services/shop.service'
import { getServices } from '@/services/service-manager'

export const dynamic = 'force-dynamic'

export default async function PeoplePage() {
  // getPeople() now returns all required data including:
  // - current_cycle_debt, outstanding_debt, current_cycle_label
  // - subscription_details with logo_url
  // - monthly_debts for outstanding display
  const [people, shops, accounts, categories, subscriptions] = await Promise.all([
    getPeople({ includeArchived: true }),
    getShops(),
    getAccounts(),
    getCategories(),
    getServices(),
  ])

  return (
    <div className="h-full overflow-auto p-6">
      <div className="space-y-6">
        <PeopleGrid
          people={people}
          subscriptions={subscriptions}
          shops={shops}
          accounts={accounts}
          categories={categories}
        />
      </div>
    </div>
  )
}

