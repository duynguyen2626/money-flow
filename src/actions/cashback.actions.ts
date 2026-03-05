'use server'

import {
    getMonthlyCashbackTransactions,
    getCashbackProgress
} from '@/services/cashback.service'
import {
    getPocketBaseAccountCycleOptions,
    getPocketBaseCycleTransactions,
    getPocketBaseAccountSpendingStatsSnapshot,
} from '@/services/pocketbase/account-details.service'
import { parseCycleTag } from '@/lib/cashback'

export async function fetchMonthlyCashbackDetails(cardId: string, month: number, year: number) {
    try {
        return await getMonthlyCashbackTransactions(cardId, month, year)
    } catch (error) {
        console.error('Failed to fetch monthly cashback details:', error)
        return []
    }
}

export async function fetchAccountCycleTransactions(
    accountId: string,
    cycleId?: string,
    cycleTag?: string,
    statementDay?: number | null,
    cycleType?: string | null
) {
    try {
        if (cycleTag) {
            return await getPocketBaseCycleTransactions(accountId, cycleTag)
        }

        if (cycleId) {
            const options = await getPocketBaseAccountCycleOptions(accountId, 48)
            const matched = options.find((option) => option.cycleId === cycleId)
            if (matched?.tag) {
                return await getPocketBaseCycleTransactions(accountId, matched.tag)
            }
        }

        return []
    } catch (error) {
        console.error('Failed to fetch account cycle transactions:', error)
        return []
    }
}

export async function fetchAccountCyclesAction(accountId: string): Promise<any[]> {
    try {
        return await getPocketBaseAccountCycleOptions(accountId, 48)
    } catch (error) {
        console.error('Failed to fetch account cycles:', error)
        return []
    }
}

export async function fetchAccountCycleOptionsAction(accountId: string) {
    try {
        const options = await getPocketBaseAccountCycleOptions(accountId);

        return (options as any[]).map(opt => {
            return {
                tag: opt.tag,
                label: opt.label,
                cycleType: opt.cycleType ?? null,
                statementDay: opt.statementDay ?? null,
                cycleId: opt.cycleId ?? null,
                stats: opt.stats
                    ? {
                        spent_amount: opt.stats.spent_amount,
                        real_awarded: opt.stats.real_awarded,
                        virtual_profit: opt.stats.virtual_profit,
                    }
                    : undefined,
            };
        });
    } catch (error) {
        console.error('Failed to fetch account cycle options:', error);
        return [];
    }
}
