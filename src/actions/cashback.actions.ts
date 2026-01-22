'use server'

import { getMonthlyCashbackTransactions, getCashbackProgress, getAccountCycles, getTransactionsForCycle } from '@/services/cashback.service'

export async function fetchMonthlyCashbackDetails(cardId: string, month: number, year: number) {
    try {
        return await getMonthlyCashbackTransactions(cardId, month, year)
    } catch (error) {
        console.error('Failed to fetch monthly cashback details:', error)
        return []
    }
}

export async function fetchAccountCycleTransactions(accountId: string, cycleId?: string) {
    try {
        if (cycleId) {
            return await getTransactionsForCycle(cycleId);
        }
        const results = await getCashbackProgress(0, [accountId], undefined, true);
        return results[0]?.transactions || [];
    } catch (error) {
        console.error('Failed to fetch account cycle transactions:', error)
        return []
    }
}

export async function fetchAccountCyclesAction(accountId: string): Promise<any[]> {
    try {
        const result = await getAccountCycles(accountId);
        return result;
    } catch (error) {
        console.error('Failed to fetch account cycles:', error)
        return []
    }
}
