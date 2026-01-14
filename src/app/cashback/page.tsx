import { Suspense } from 'react'
import { getCashbackYearAnalytics } from '@/services/cashback.service'
import { CashbackDashboardV2 } from '@/components/cashback/cashback-dashboard-v2'
import { getCashbackProgress } from '@/services/cashback.service'

export const dynamic = 'force-dynamic'

export default async function CashbackPage({
    searchParams,
}: {
    searchParams: Promise<{ year?: string }>
}) {
    const resolvedParams = await searchParams
    const year = Number(resolvedParams?.year) || new Date().getFullYear()

    // Fetch Data
    const data = await getCashbackYearAnalytics(year)
    const cards = await getCashbackProgress(0, [], new Date())

    return (
        <div className="container mx-auto py-6 h-screen flex flex-col">
            <h1 className="text-2xl font-bold mb-4">Cashback Dashboard</h1>
            <Suspense fallback={<div>Loading stats...</div>}>
                <CashbackDashboardV2 initialData={data} year={year} cards={cards} />
            </Suspense>
        </div>
    )
}
