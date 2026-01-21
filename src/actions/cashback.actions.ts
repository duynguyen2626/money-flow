'use server'

import { getMonthlyCashbackTransactions, getCashbackProgress } from '@/services/cashback.service'

export async function fetchMonthlyCashbackDetails(cardId: string, month: number, year: number) {
    try {
        return await getMonthlyCashbackTransactions(cardId, month, year)
    } catch (error) {
        console.error('Failed to fetch monthly cashback details:', error)
        return []
    }
}

export async function fetchAccountCycleTransactions(accountId: string) {
    try {
        const results = await getCashbackProgress(0, [accountId], undefined, true);
        return results[0]?.transactions || [];
    } catch (error) {
        console.error('Failed to fetch account cycle transactions:', error)
        return []
    }
}
