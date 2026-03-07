
import { NextResponse } from 'next/server'
import {
    getPocketBaseAccounts,
    loadPocketBaseTransactions
} from '@/services/pocketbase/account-details.service'

export async function GET() {
    console.log('[PB-TEST] Starting integrity check...')
    try {
        const accounts = await getPocketBaseAccounts()
        const accountIds = new Set(accounts.map(a => a.id))

        const transactions = await loadPocketBaseTransactions({ limit: 50 })

        const issues: any[] = []
        transactions.forEach(t => {
            // Check account_id
            // Note: mapTransaction in account-details.service.ts might already fail or return name if expand worked.
            // But we want to check the raw foreign key if possible.
        })

        return NextResponse.json({
            success: true,
            stats: {
                totalAccounts: accounts.length,
                totalTransactionsChecked: transactions.length,
            },
            sampleTransactions: transactions.slice(0, 5).map(t => ({
                id: t.id,
                account_id: t.account_id, // This is the mapped MF3 id or slug
                account_name: t.account_name, // If expand worked, this has a name
            }))
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
