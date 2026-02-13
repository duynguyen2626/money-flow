import { getCategoryById, getCategories } from "@/services/category.service"
import { notFound } from "next/navigation"
import { getShops } from "@/services/shop.service"
import { getAccounts } from "@/services/account.service"
import { getPeople } from "@/services/people.service"
import { loadTransactions } from "@/services/transaction.service"
import { CategoryDetailClient } from "@/components/moneyflow/category-detail-client"

interface CategoryDetailsPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function CategoryDetailsPage({ params }: CategoryDetailsPageProps) {
    const { id } = await params
    const category = await getCategoryById(id)

    if (!category) {
        notFound()
    }

    const [transactions, allCategories, allShops, accounts, people] = await Promise.all([
        loadTransactions({
            categoryId: id,
            limit: 100, // Load recent 100 transactions initially
        }),
        getCategories(),
        getShops(),
        getAccounts(),
        getPeople()
    ])

    return (
        <CategoryDetailClient
            category={category}
            transactions={transactions}
            allCategories={allCategories}
            allShops={allShops}
            accounts={accounts}
            people={people}
        />
    )
}
