import {
  getPocketBaseAccounts,
  getPocketBaseCategories,
  getPocketBasePeople,
  getPocketBaseShops,
} from '@/services/pocketbase/account-details.service'
import { TestPageClient } from './client-wrapper'

export const dynamic = 'force-dynamic'

export default async function TransactionV2Page() {
    const [accounts, categories, people, shops] = await Promise.all([
        getPocketBaseAccounts(),
        getPocketBaseCategories(),
        getPocketBasePeople(),
        getPocketBaseShops(),
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
