import { Metadata } from 'next'
import { CashbackDashboardV2 } from '@/components/cashback/cashback-dashboard-v2'
import { CashbackVolunteerMatrixView } from '@/components/cashback/cashback-volunteer-matrix-view'
import { YearSelector } from '@/components/cashback/year-selector'
import { getPocketBaseCashbackProgress, getPocketBaseCashbackYearAnalytics } from '@/services/pocketbase/cashback-performance.service'
import { VolunteerCashbackData } from '@/types/cashback.types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreditCard, Users } from 'lucide-react'
import {
    getPocketBaseAccounts,
    getPocketBaseCategories,
    getPocketBasePeople,
    getPocketBaseShops,
} from '@/services/pocketbase/account-details.service'

export const metadata: Metadata = {
    title: 'Cashback Dashboard | Money Flow',
}

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{ year?: string, tab?: string }>
}

async function fetchVolunteerCashbackData(year: number): Promise<VolunteerCashbackData[]> {
    return []
}

export default async function CashbackPage({ searchParams }: PageProps) {
    const params = await searchParams
    const year = params.year ? parseInt(params.year) : new Date().getFullYear()
    const defaultTab = params.tab || 'cards'

    const [accountsData, categoriesData, peopleData, shopsData] = await Promise.all([
        getPocketBaseAccounts(),
        getPocketBaseCategories(),
        getPocketBasePeople(),
        getPocketBaseShops(),
    ])

    const accountIds = accountsData.filter((account) => account.type === 'credit_card').map((account) => account.id)
    const cards = await getPocketBaseCashbackProgress(accountIds)

    const yearSummaries = await getPocketBaseCashbackYearAnalytics(year)

    // Fetch volunteer cashback data
    const volunteerData = await fetchVolunteerCashbackData(year)

    return (
        <div className="h-screen flex flex-col p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Cashback Dashboard</h1>
                <YearSelector year={year} defaultTab={defaultTab} />
            </div>

            <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mb-4">
                    <TabsTrigger value="cards">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Cards (Normal)
                    </TabsTrigger>
                    <TabsTrigger value="volunteer">
                        <Users className="w-4 h-4 mr-2" />
                        Volunteer
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="cards" className="flex-1 overflow-hidden mt-0">
                    <CashbackDashboardV2
                        initialData={yearSummaries}
                        year={year}
                        cards={cards}
                        accounts={accountsData}
                        categories={categoriesData}
                        people={peopleData}
                        shops={shopsData}
                    />
                </TabsContent>

                <TabsContent value="volunteer" className="flex-1 overflow-hidden mt-0">
                    <CashbackVolunteerMatrixView
                        data={volunteerData}
                        year={year}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
