import { NextRequest, NextResponse } from 'next/server'
import { importBatchItemsFromExcel } from '@/services/batch.service'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { excelData, batchTag } = await request.json()

        if (!excelData) {
            return NextResponse.json(
                { error: 'Excel data is required' },
                { status: 400 }
            )
        }

        const result = await importBatchItemsFromExcel(
            id,
            excelData,
            batchTag
        )

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Import error:', error)
        return NextResponse.json(
            { error: error.message || 'Import failed' },
            { status: 500 }
        )
    }
}
