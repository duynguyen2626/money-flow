import { getCategories } from "@/services/category.service"
import { getShops } from "@/services/shop.service"
import { getAccounts } from "@/services/account.service"
import { getPeople } from "@/services/people.service"
import { ClassificationsManager } from "@/components/settings/ClassificationsManager"
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Classifications | Money Flow',
    description: 'Manage transaction categories and shops.'
}

export const dynamic = 'force-dynamic'

export default async function ClassificationsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>
}) {
    const params = await searchParams
    const [categories, shops, accounts, people] = await Promise.all([
        getCategories(),
        getShops(),
        getAccounts(),
        getPeople()
    ])

    const tab = params?.tab || "categories"

    return (
        <ClassificationsManager
            initialCategories={categories}
            initialShops={shops}
            accounts={accounts}
            people={people}
            defaultTab={tab}
        />
    )
}
