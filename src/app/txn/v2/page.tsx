import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { TestPageClient } from './client-wrapper'

export const dynamic = 'force-dynamic'

export default async function TransactionV2Page() {
    const [accounts, categories, people, shops] = await Promise.all([
        getAccounts(),
        getCategories(),
        getPeople(),
        getShops(),
    ])

    return (
        <TestPageClient
            accounts={accounts}
            categories={categories}
            people={people}
            shops={shops}
        />
    )
}
