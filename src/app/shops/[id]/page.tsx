import { notFound } from "next/navigation"
import { getShopById, getShops } from "@/services/shop.service"
import { getCategories } from "@/services/category.service"
import { getAccounts } from "@/services/account.service"
import { getPeople } from "@/services/people.service"
import { loadTransactions } from "@/services/transaction.service"
import { ShopDetailClient } from "@/components/shops/shop-detail-client"

interface ShopDetailsPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function ShopDetailsPage({ params }: ShopDetailsPageProps) {
    const { id } = await params
    const shop = await getShopById(id)

    if (!shop) {
        notFound()
    }

    const [transactions, allShops, allCategories, accounts, people] = await Promise.all([
        loadTransactions({
            shopId: id,
            limit: 100,
        }),
        getShops(),
        getCategories(),
        getAccounts(),
        getPeople()
    ])

    return (
        <ShopDetailClient
            shop={shop}
            transactions={transactions}
            allShops={allShops}
            allCategories={allCategories}
            accounts={accounts}
            people={people}
        />
    )
}
