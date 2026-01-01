import { NextRequest, NextResponse } from 'next/server'
import { importBankMappingsFromExcel } from '@/services/bank.service'

export async function POST(request: NextRequest) {
    try {
        const { excelData, bankType } = await request.json()

        if (!excelData) {
            return NextResponse.json({ error: 'No data provided' }, { status: 400 })
        }

        const result = await importBankMappingsFromExcel(excelData, bankType || 'VIB')
        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Import mappings error:', error)
        if (error.message?.includes('row-level security policy')) {
            return NextResponse.json(
                { error: 'Database permission denied. Please run migration "20251127235500_add_rls_to_bank_mappings.sql" or add SUPABASE_SERVICE_ROLE_KEY to .env.local' },
                { status: 403 }
            )
        }
        return NextResponse.json(
            { error: error.message || 'Import failed' },
            { status: 500 }
        )
    }
}
