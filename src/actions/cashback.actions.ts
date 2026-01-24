'use server'

import {
    getMonthlyCashbackTransactions,
    getCashbackProgress,
    getAccountCycles,
    getTransactionsForCycle,
    getCashbackCycleOptions
} from '@/services/cashback.service'
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
        if (cycleId) {
            return await getTransactionsForCycle(cycleId);
        }

        let referenceDate: Date | undefined;
        if (cycleTag) {
            const parsed = parseCycleTag(cycleTag);
            if (parsed) {
                const monthIdx = parsed.month - 1;
                if (cycleType === 'statement_cycle') {
                    referenceDate = new Date(parsed.year, monthIdx, 1);
                } else {
                    referenceDate = new Date(parsed.year, monthIdx, (statementDay ?? 1));
                }
            }
        }

        const results = await getCashbackProgress(0, [accountId], referenceDate, true);
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

export async function fetchAccountCycleOptionsAction(accountId: string) {
    try {
        const [options, cycles] = await Promise.all([
            getCashbackCycleOptions(accountId),
            getAccountCycles(accountId)
        ]);

        const byTag = new Map(
            (cycles || []).map((c: any) => [c.cycle_tag, c])
        );

        return (options as any[]).map(opt => {
            const match = byTag.get(opt.tag);
            return {
                tag: opt.tag,
                label: opt.label,
                cycleType: opt.cycleType ?? null,
                statementDay: opt.statementDay ?? null,
                cycleId: match?.id ?? null,
                stats: match
                    ? {
                        spent_amount: match.spent_amount,
                        real_awarded: match.real_awarded,
                        virtual_profit: match.virtual_profit,
                    }
                    : undefined,
            };
        });
    } catch (error) {
        console.error('Failed to fetch account cycle options:', error);
        return [];
    }
}
