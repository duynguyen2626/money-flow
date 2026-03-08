import {
  getPocketBasePeople,
  getPocketBaseAccounts,
  getPocketBaseCategories,
  getPocketBaseShops,
} from '@/services/pocketbase/account-details.service'
import { getServices } from '@/services/service-manager'
import { PeopleDirectoryV2 } from '@/components/people/v2/people-directory-v2'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'People & Debt | Money Flow',
}

export const dynamic = 'force-dynamic'

export default async function PeopleV2Page() {
    const [people, subscriptions, accounts, categories, shops] = await Promise.all([
        getPocketBasePeople(),
        getServices() as Promise<any>,
        getPocketBaseAccounts(),
        getPocketBaseCategories(),
        getPocketBaseShops(),
    ])

    return (
        <div className="h-full overflow-hidden">
            <PeopleDirectoryV2
                people={people}
                subscriptions={subscriptions}
                accounts={accounts}
                categories={categories}
                shops={shops}
            />
        </div>
    )
}
