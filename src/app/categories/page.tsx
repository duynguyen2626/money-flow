import { getCategories } from "@/services/category.service"
import { getShops } from "@/services/shop.service"
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
    searchParams: { tab?: string }
}) {
    const [categories, shops] = await Promise.all([
        getCategories(),
        getShops()
    ])

    const tab = searchParams?.tab || "categories"

    return (
        <ClassificationsManager
            initialCategories={categories}
            initialShops={shops}
            defaultTab={tab}
        />
    )
}
