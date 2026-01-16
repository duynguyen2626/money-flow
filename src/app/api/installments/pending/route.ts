import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('account_id')

    if (!accountId) {
        return NextResponse.json({ error: 'account_id is required' }, { status: 400 })
    }

    try {
        const supabase = createClient()

        // Fetch active installments for this account
        // The account is the credit card that has installments
        const { data: installments, error } = await supabase
            .from('installments')
            .select('*')
            .eq('status', 'active')
            .gt('remaining_amount', 0)
            .order('next_due_date', { ascending: true })

        if (error) throw error

        // Filter by account_id from original_transaction
        const transactionIds = (installments || [])
            .map((i: any) => i.original_transaction_id)
            .filter((id): id is string => id !== null)

        const { data: transactions } = await supabase
            .from('transactions')
            .select('id, account_id')
            .in('id', transactionIds)


        const accountInstallments = (installments || []).filter((inst: any) => {
            const txn = (transactions || []).find((t: any) => t.id === inst.original_transaction_id) as any
            return txn && txn.account_id === accountId
        })

        // Calculate period number for each installment
        const enrichedInstallments = accountInstallments.map((inst: any) => {
            const start = new Date(inst.start_date)
            const current = new Date()
            const diffMonths = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth()) + 1
            const periodNumber = Math.min(Math.max(1, diffMonths), inst.term_months)

            return {
                id: inst.id,
                name: inst.name,
                monthly_amount: inst.monthly_amount,
                remaining_amount: inst.remaining_amount,
                term_months: inst.term_months,
                next_due_date: inst.next_due_date,
                period_number: periodNumber
            }
        })

        return NextResponse.json(enrichedInstallments)
    } catch (error: any) {
        console.error('Error fetching pending installments:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
