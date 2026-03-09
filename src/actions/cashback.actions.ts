'use server'

import {
    getPocketBaseAccountCycleOptions,
    getPocketBaseCycleTransactions,
} from '@/services/pocketbase/account-details.service'
import { pocketbaseList, toPocketBaseId } from '@/services/pocketbase/server'

export async function fetchMonthlyCashbackDetails(cardId: string, month: number, year: number) {
    try {
        const pbAccountId = toPocketBaseId(cardId, 'accounts')
        const startDate = new Date(year, month - 1, 1).toISOString()
        const endDate = new Date(year, month, 1).toISOString()

        const response = await pocketbaseList<Record<string, unknown>>('transactions', {
            perPage: 500,
            sort: '-occurred_at',
            filter: `account_id='${pbAccountId}' && occurred_at>='${startDate}' && occurred_at<'${endDate}' && type='debt' && status!='void'`,
            expand: 'category_id',
            fields: 'id,occurred_at,note,amount,type,cashback_amount,cashback_share_percent,cashback_share_fixed,expand',
        })

        return (response.items || []).map((t: Record<string, unknown>) => {
            const expanded = t.expand as Record<string, unknown> | undefined
            const category = expanded?.category_id as Record<string, unknown> | undefined
            return {
                id: t.id,
                occurred_at: t.occurred_at,
                note: t.note,
                amount: Number(t.amount || 0),
                type: t.type,
                cashback_share_percent: t.cashback_share_percent ?? null,
                cashback_share_fixed: t.cashback_share_fixed ?? null,
                cashbackGiven: Number(t.cashback_amount || 0),
                category: category ? { name: category.name, icon: category.icon } : null,
                cashback_entries: [],
            }
        })
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
