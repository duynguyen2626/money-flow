import { CashbackDashboardV2 } from '@/components/cashback/cashback-dashboard-v2'
import { CashbackVolunteerMatrixView } from '@/components/cashback/cashback-volunteer-matrix-view'
import { YearSelector } from '@/components/cashback/year-selector'
import { getCashbackProgress } from '@/services/cashback.service'
import { createClient } from '@/lib/supabase/server'
import { VolunteerCashbackData } from '@/types/cashback.types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreditCard, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{ year?: string, tab?: string }>
}

async function fetchVolunteerCashbackData(year: number): Promise<VolunteerCashbackData[]> {
    const supabase = await createClient()

    // Fetch all volunteer transactions for the year with account info
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
            id,
            occurred_at,
            amount,
            final_price,
            account_id,
            accounts:account_id (
                id,
                name,
                image_url
            )
        `)
        .eq('cashback_mode', 'voluntary')
        .neq('status', 'void')
        .gte('occurred_at', `${year}-01-01`)
        .lte('occurred_at', `${year}-12-31`)
        .order('occurred_at', { ascending: true }) as {
            data: Array<{
                id: string
                occurred_at: string
                amount: number
                final_price: number | null
                account_id: string
                accounts: { id: string, name: string, image_url: string | null } | null
            }> | null
            error: unknown
        }

    if (error) {
        console.error('Error fetching volunteer transactions:', error)
        return []
    }

    if (!transactions || transactions.length === 0) {
        return []
    }

    // Group by account and month
    const grouped = new Map<string, VolunteerCashbackData>()

    transactions.forEach(tx => {
        const accountId = tx.account_id
        const accountName = tx.accounts?.name || 'Unknown Account'
        const accountImageUrl = tx.accounts?.image_url || null
        const month = new Date(tx.occurred_at).getMonth() + 1
        const cashbackGiven = Math.abs(parseFloat(String(tx.amount))) - Math.abs(parseFloat(String(tx.final_price || tx.amount)))

        if (!grouped.has(accountId)) {
            grouped.set(accountId, {
                personId: accountId, // Reusing field name for compatibility
                personName: accountName,
                personImageUrl: accountImageUrl,
                year,
                months: [],
                yearTotal: 0
            })
        }

        const accountData = grouped.get(accountId)!
        const monthData = accountData.months.find(m => m.month === month)

        if (monthData) {
            monthData.cashbackGiven += cashbackGiven
            monthData.txCount += 1
        } else {
            accountData.months.push({
                month,
                cashbackGiven,
                txCount: 1
            })
        }

        accountData.yearTotal += cashbackGiven
    })

    return Array.from(grouped.values()).sort((a, b) =>
        a.personName.localeCompare(b.personName)
    )
}

export default async function CashbackPage({ searchParams }: PageProps) {
    const params = await searchParams
    const year = params.year ? parseInt(params.year) : new Date().getFullYear()
    const defaultTab = params.tab || 'cards'

    const supabase = await createClient()

    // Fetch card cashback data
    const { data: creditCards } = await supabase
        .from('accounts')
        .select('id')
        .eq('type', 'credit_card') as { data: { id: string }[] | null }

    const accountIds = creditCards?.map(a => a.id) ?? []
    const referenceDate = new Date(year, 0, 1)
    const cards = await getCashbackProgress(0, accountIds, referenceDate, false)

    const yearSummaries = await Promise.all(
        cards.map(async (card) => {
            const months = []
            for (let month = 1; month <= 12; month++) {
                const monthDate = new Date(year, month - 1, 15)
                const monthCards = await getCashbackProgress(0, [card.accountId], monthDate, true)
                const monthCard = monthCards[0]

                if (monthCard) {
                    months.push({
                        month,
                        totalGivenAway: monthCard.totalGivenAway,
                        cashbackGiven: monthCard.sharedAmount,
                    })
                }
            }

            const { data: accountData } = await supabase
                .from('accounts')
                .select('annual_fee')
                .eq('id', card.accountId)
                .single() as {
                    data: { annual_fee: number | null } | null
                    error: unknown
                }

            const annualFee = accountData?.annual_fee || 0

            return {
                cardId: card.accountId,
                cardType: 'credit_card' as const,
                year,
                netProfit: card.netProfit,
                months,
                cashbackRedeemedYearTotal: 0,
                annualFeeYearTotal: annualFee,
                interestYearTotal: 0,
                cashbackGivenYearTotal: card.sharedAmount,
            }
        })
    )

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
