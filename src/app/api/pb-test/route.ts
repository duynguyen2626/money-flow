
import { NextResponse } from 'next/server'
import {
    getPocketBaseAccounts,
    getPocketBaseShops,
    getPocketBaseCategories,
    getPocketBasePeople,
    loadPocketBaseTransactions
} from '@/services/pocketbase/account-details.service'

export async function GET() {
    console.log('[PB-TEST] Starting tests...')
    try {
        console.log('[PB-TEST] Fetching accounts...')
        const accounts = await getPocketBaseAccounts()
        console.log(`[PB-TEST] Accounts: ${accounts.length}`)

        console.log('[PB-TEST] Fetching shops...')
        const shops = await getPocketBaseShops()
        console.log(`[PB-TEST] Shops: ${shops.length}`)

        console.log('[PB-TEST] Fetching categories...')
        const categories = await getPocketBaseCategories()
        console.log(`[PB-TEST] Categories: ${categories.length}`)

        console.log('[PB-TEST] Fetching people...')
        const people = await getPocketBasePeople()
        console.log(`[PB-TEST] People: ${people.length}`)

        console.log('[PB-TEST] Fetching transactions...')
        const recentTransactions = await loadPocketBaseTransactions({ limit: 5 })
        console.log(`[PB-TEST] Transactions: ${recentTransactions.length}`)

        const data = {
            accounts,
            shops,
            categories,
            people,
            recentTransactions,
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            counts: {
                accounts: data.accounts.length,
                shops: data.shops.length,
                categories: data.categories.length,
                people: data.people.length,
                transactions: data.recentTransactions.length,
            },
            data
        })
    } catch (error: any) {
        console.error('[PB-TEST] Error:', error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
