import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('account_id')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!accountId || !month || !year) {
        return NextResponse.json(
            { error: 'Missing required parameters: account_id, month, year' },
            { status: 400 }
        )
    }

    try {
        const supabase = await createClient()

        // Calculate date range for the month
        const monthNum = parseInt(month)
        const yearNum = parseInt(year)
        const startDate = new Date(yearNum, monthNum - 1, 1)
        const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59)

        const { data, error } = await supabase
            .from('transactions')
            .select(`
                id, 
                occurred_at, 
                note, 
                amount, 
                final_price,
                person_id,
                people:person_id (
                    id,
                    name,
                    image_url
                )
            `)
            .eq('account_id', accountId)
            .eq('cashback_mode', 'voluntary')
            .neq('status', 'void')
            .gte('occurred_at', startDate.toISOString())
            .lte('occurred_at', endDate.toISOString())
            .order('occurred_at', { ascending: false }) as {
                data: Array<{
                    id: string
                    occurred_at: string
                    note: string | null
                    amount: number
                    final_price: number | null
                    person_id: string | null
                    people: { id: string, name: string, image_url: string | null } | null
                }> | null
                error: unknown
            }

        if (error) throw error

        // Calculate cashback given for each transaction
        const transactions = (data || []).map((tx) => {
            const originalAmount = Math.abs(parseFloat(String(tx.amount)))
            const finalPrice = tx.final_price ? Math.abs(parseFloat(String(tx.final_price))) : originalAmount
            const cashbackGiven = originalAmount - finalPrice

            return {
                id: tx.id,
                date: tx.occurred_at,
                note: tx.note || 'No description',
                originalAmount: originalAmount,
                finalPrice: finalPrice,
                cashbackGiven: cashbackGiven,
                sharePercent: 0, // Not stored in database
                personName: tx.people?.name || 'Unknown',
                personImageUrl: tx.people?.image_url || null
            }
        })

        return NextResponse.json(transactions)
    } catch (error) {
        console.error('Error fetching volunteer transactions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch volunteer transactions' },
            { status: 500 }
        )
    }
}
