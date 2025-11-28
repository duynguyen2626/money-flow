import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const searchParams = request.nextUrl.searchParams
        const bankNumber = searchParams.get('bank_number')
        const bankName = searchParams.get('bank_name')
        const cardName = searchParams.get('card_name')

        if (!bankNumber || !bankName) {
            return NextResponse.json({ hasDuplicate: false })
        }

        const supabase = await createClient()

        // Check for confirmed items with same bank_number, bank_name, and card_name
        let query = supabase
            .from('batch_items')
            .select('*')
            .eq('batch_id', id)
            .eq('bank_number', bankNumber)
            .eq('bank_name', bankName)
            .eq('status', 'confirmed')

        if (cardName) {
            query = query.eq('card_name', cardName)
        }

        const { data, error } = await query.limit(1)

        if (error) throw error

        return NextResponse.json({
            hasDuplicate: data && data.length > 0,
            confirmedItem: data && data.length > 0 ? data[0] : null
        })
    } catch (error: any) {
        console.error('Error checking duplicate:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
