
import { NextResponse } from 'next/server'
import { deleteBatchItem } from '@/services/batch.service'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const { itemId } = await request.json()

        if (!itemId) {
            return NextResponse.json(
                { error: 'Item ID is required' },
                { status: 400 }
            )
        }

        await deleteBatchItem(itemId)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error voiding batch item:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to void item' },
            { status: 500 }
        )
    }
}
