import { getPeople } from '@/services/people.service'
import { getServices } from '@/services/service-manager'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getShops } from '@/services/shop.service'
import { PeopleDirectoryV2 } from '@/components/people/v2/people-directory-v2'

export const dynamic = 'force-dynamic'

export default async function PeopleV2Page() {
    const [people, subscriptions, accounts, categories, shops] = await Promise.all([
        getPeople({ includeArchived: true }),
        getServices() as Promise<any>,
        getAccounts(),
        getCategories(),
        getShops(),
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
