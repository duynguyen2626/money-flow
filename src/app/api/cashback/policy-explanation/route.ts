import { NextRequest, NextResponse } from 'next/server'
import { getTransactionCashbackPolicyExplanation } from '@/services/cashback.service'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const url = new URL(request.url)
    const transactionId = url.searchParams.get('transactionId')

    if (!transactionId) {
        return NextResponse.json(
            { error: 'transactionId is required' },
            { status: 400 }
        )
    }

    try {
        const metadata = await getTransactionCashbackPolicyExplanation(transactionId)
        return NextResponse.json(metadata)
    } catch (error) {
        console.error('Error in cashback policy explanation route:', error)
        return NextResponse.json(
            { error: 'Failed to fetch policy explanation' },
            { status: 500 }
        )
    }
}
