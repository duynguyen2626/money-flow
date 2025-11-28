import { NextRequest, NextResponse } from 'next/server'
import { confirmBatchItem } from '@/services/batch.service'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { itemId, batchId } = body

        if (!itemId) {
            return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
        }

        await confirmBatchItem(itemId)

        // Revalidate relevant paths
        if (batchId) {
            revalidatePath(`/batch/${batchId}`)
        }
        revalidatePath('/accounts')

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error confirming batch item:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
