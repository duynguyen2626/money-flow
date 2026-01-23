import { getPeople } from '@/services/people.service'
import { PeopleGrid } from '@/components/people/people-grid'
import { getServices } from '@/services/service-manager'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getShops } from '@/services/shop.service'

export const dynamic = 'force-dynamic'

export default async function PeoplePage() {
  // getPeople() now returns all required data including:
  // - current_cycle_debt, outstanding_debt, current_cycle_label
  // - subscription_details with image_url
  // - monthly_debts for outstanding display
  const [people, subscriptions, accounts, categories, shops] = await Promise.all([
    getPeople({ includeArchived: true }),
    getServices(),
    getAccounts(),
    getCategories(),
    getShops(),
  ]) as any

  return (
    <div className="h-full overflow-auto px-0 py-4 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="space-y-6">
        <PeopleGrid
          people={people}
          subscriptions={subscriptions}
          accounts={accounts}
          categories={categories}
          shops={shops}
        />
      </div>
    </div>
  )
}
