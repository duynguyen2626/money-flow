import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const cardId = searchParams.get('card_id')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!cardId || !month || !year) {
        return NextResponse.json(
            { error: 'Missing required parameters: card_id, month, year' },
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
            .select('id, transaction_date, details, amount, cashback_amount, cashback_rate, final_price')
            .eq('account_id', cardId)
            .eq('type', 'expense')
            .gte('transaction_date', startDate.toISOString())
            .lte('transaction_date', endDate.toISOString())
            .order('transaction_date', { ascending: false }) as {
                data: Array<{
                    id: string
                    transaction_date: string
                    details: string | null
                    amount: number
                    cashback_amount: number | null
                    cashback_rate: number | null
                    final_price: number | null
                }> | null
                error: unknown
            }

        if (error) throw error

        // Calculate cashback for each transaction
        const transactions = (data || []).map((tx) => {
            const amount = Math.abs(parseFloat(String(tx.amount)))
            const cashback = tx.cashback_amount || 0

            return {
                id: tx.id,
                date: tx.transaction_date,
                note: tx.details || 'No description',
                amount: amount,
                cashback: cashback,
            }
        })

        return NextResponse.json(transactions)
    } catch (error) {
        console.error('Error fetching transactions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch transactions' },
            { status: 500 }
        )
    }
}
