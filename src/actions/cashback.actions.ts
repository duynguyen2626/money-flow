'use server'

import { getMonthlyCashbackTransactions } from '@/services/cashback.service'

export async function fetchMonthlyCashbackDetails(cardId: string, month: number, year: number) {
    try {
        return await getMonthlyCashbackTransactions(cardId, month, year)
    } catch (error) {
        console.error('Failed to fetch monthly cashback details:', error)
        return []
    }
}
