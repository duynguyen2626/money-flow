import { CashbackDashboardV2 } from '@/components/cashback/cashback-dashboard-v2'
import { CashbackMatrixView } from '@/components/cashback/cashback-matrix-view'
import { CashbackVolunteerMatrixView } from '@/components/cashback/cashback-volunteer-matrix-view'
import { YearSelector } from '@/components/cashback/year-selector'
import { getCashbackProgress } from '@/services/cashback.service'
import { createClient } from '@/lib/supabase/server'
import { VolunteerCashbackData } from '@/types/cashback.types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
    const defaultTab = (params.tab === 'matrix' || params.tab === 'volunteer') ? params.tab : 'detail'

    const supabase = await createClient()

    // Fetch card cashback data
    const { data: creditCards } = await supabase
        .from('accounts')
        .select('id, cashback_config')
        .eq('type', 'credit_card') as { data: { id: string, cashback_config: any }[] | null }

    const accountIds = creditCards?.map(a => a.id) ?? []
    const referenceDate = new Date(year, 0, 1)
    const cards = await getCashbackProgress(0, accountIds, referenceDate, false)

    // Detect multi-tier (levels) to improve UI labels
    const tieredMap: Record<string, boolean> = {}
    for (const acc of (creditCards || [])) {
        try {
            const cfg = acc.cashback_config ? JSON.parse(typeof acc.cashback_config === 'string' ? acc.cashback_config : JSON.stringify(acc.cashback_config)) : null
            const levels = cfg?.program?.levels || cfg?.levels || []
            tieredMap[acc.id] = Array.isArray(levels) && levels.length > 0
        } catch { tieredMap[acc.id] = false }
    }

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
                        // Align with new cashback engine: "Give Away" = totalGivenAway
                        totalGivenAway: monthCard.totalGivenAway,
                        cashbackGiven: monthCard.totalGivenAway,
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

            // Derive totals from engine outputs to avoid stale netProfit
            const bankBackYearTotal = card.totalEarned || 0
            const sharedYearTotal = card.totalGivenAway || 0
            const derivedNetProfit = bankBackYearTotal - sharedYearTotal - annualFee

            return {
                cardId: card.accountId,
                cardType: 'credit_card' as const,
                year,
                netProfit: derivedNetProfit,
                months,
                cashbackRedeemedYearTotal: bankBackYearTotal,
                annualFeeYearTotal: annualFee,
                interestYearTotal: 0,
                // Use engine-computed totals for consistency
                cashbackGivenYearTotal: sharedYearTotal,
                bankBackYearTotal,
                sharedYearTotal,
            }
        })
    )

    // Attach cashback_config to cards for UI popover
    const cardsWithConfig = cards.map(c => ({
        ...c,
        cashback_config: creditCards?.find(acc => acc.id === c.accountId)?.cashback_config ?? null,
    }))

    // Fetch volunteer cashback data
    const volunteerData = await fetchVolunteerCashbackData(year)

    return (
        <div className="h-screen flex flex-col p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Cashback Dashboard</h1>
                <div className="w-32">
                    <YearSelector year={year} defaultTab={defaultTab} />
                </div>
            </div>

            <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mb-4 flex gap-2 bg-transparent p-0">
                    <TabsTrigger
                        value="detail"
                        className="rounded-none border border-slate-200 px-3 py-2 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:border-slate-900"
                    >
                        Detail
                    </TabsTrigger>
                    <TabsTrigger
                        value="matrix"
                        className="rounded-none border border-slate-200 px-3 py-2 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:border-slate-900"
                    >
                        Matrix
                    </TabsTrigger>
                    <TabsTrigger
                        value="volunteer"
                        className="rounded-none border border-slate-200 px-3 py-2 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:border-slate-900"
                    >
                        Volunteer
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="detail" className="flex-1 overflow-hidden mt-0">
                    <CashbackDashboardV2
                        initialData={yearSummaries}
                        year={year}
                        cards={cardsWithConfig}
                        tieredMap={tieredMap}
                    />
                </TabsContent>

                <TabsContent value="matrix" className="flex-1 overflow-hidden mt-0">
                    <CashbackMatrixView
                        data={yearSummaries}
                        cards={cardsWithConfig}
                        year={year}
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
