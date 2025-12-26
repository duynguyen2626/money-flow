import { getPeople } from '@/services/people.service'
import { PeopleGrid } from '@/components/people/people-grid'
import { getServices } from '@/services/service-manager'

export const dynamic = 'force-dynamic'

export default async function PeoplePage() {
  // getPeople() now returns all required data including:
  // - current_cycle_debt, outstanding_debt, current_cycle_label
  // - subscription_details with image_url
  // - monthly_debts for outstanding display
  const [people, subscriptions] = await Promise.all([
    getPeople({ includeArchived: true }),
    getServices(),
  ])

  return (
    <div className="h-full overflow-auto p-6">
      <div className="space-y-6">
        <PeopleGrid
          people={people}
          subscriptions={subscriptions}
        />
      </div>
    </div>
  )
}

