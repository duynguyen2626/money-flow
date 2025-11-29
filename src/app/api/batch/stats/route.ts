import { NextRequest, NextResponse } from 'next/server'
import { getAccountBatchStats } from '@/services/batch.service'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const accountId = searchParams.get('accountId')

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
        }

        const stats = await getAccountBatchStats(accountId)
        return NextResponse.json(stats)
    } catch (error: any) {
        console.error('Error fetching batch stats:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
