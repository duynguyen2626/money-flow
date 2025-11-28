import { NextResponse } from 'next/server'
import { getBatches } from '@/services/batch.service'

export async function GET() {
    try {
        const batches = await getBatches()
        return NextResponse.json(batches)
    } catch (error: any) {
        console.error('Error fetching batches:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
