import { ServicesBoard } from '@/components/services/services-board'
import { getPeople } from '@/services/people.service'
import { getSubscriptions } from '@/services/subscription.service'
import { getAccounts } from '@/services/account.service'
import { getShops } from '@/services/shop.service'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
  const [subscriptions, people, accounts, shops] = await Promise.all([
    getSubscriptions(),
    getPeople(),
    getAccounts(),
    getShops(),
  ])

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-6 shadow">
        <ServicesBoard subscriptions={subscriptions} people={people} accounts={accounts} shops={shops} />
      </section>
    </div>
  )
}
