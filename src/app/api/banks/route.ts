import { NextResponse } from 'next/server'
import { getBankMappings } from '@/services/bank.service'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const bankType = searchParams.get('bank_type')

        const banks = await getBankMappings(bankType || undefined)
        return NextResponse.json(banks)
    } catch (error: any) {
        console.error('Error fetching banks:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
