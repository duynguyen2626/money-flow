import { NextResponse } from 'next/server'
import { getBankMappings } from '@/services/bank.service'

export async function GET() {
    try {
        const banks = await getBankMappings()
        return NextResponse.json(banks)
    } catch (error: any) {
        console.error('Error fetching banks:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
