import { NextRequest, NextResponse } from 'next/server'
import { getPendingBatchItemsByAccount } from '@/services/batch.service'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const accountId = searchParams.get('accountId')

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
        }

        const items = await getPendingBatchItemsByAccount(accountId)
        return NextResponse.json(items)
    } catch (error: any) {
        console.error('Error fetching pending items:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
