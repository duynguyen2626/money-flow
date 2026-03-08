'use server';

import { pocketbaseGetById, pocketbaseList, pocketbaseUpdate, pocketbaseCreate, pocketbaseDelete, toPocketBaseId } from './server';
import { resolveCashbackPolicy } from '../cashback/policy-resolver';
import { getCashbackCycleRange, parseCashbackConfig, formatIsoCycleTag } from '@/lib/cashback';

type PocketBaseRecord = Record<string, any>;

/**
 * Ensures a cashback cycle exists in PocketBase for the given account and tag.
 */
export async function ensurePocketBaseCycle(
    accountId: string,
    cycleTag: string,
    accountRecord: PocketBaseRecord
): Promise<PocketBaseRecord> {
    const pbAccountId = toPocketBaseId(accountId, 'accounts');

    // 1. Try to fetch existing
    const response = await pocketbaseList<PocketBaseRecord>('cashback_cycles', {
        filter: `account_id='${pbAccountId}' && cycle_tag='${cycleTag}'`,
        perPage: 1
    });

    if (response.items && response.items.length > 0) {
        return response.items[0];
    }

    // 2. Create if not exists
    // Values taken from account record's new columns
    const maxBudget = accountRecord.cb_max_budget ?? null;
    const minSpend = accountRecord.cb_min_spend ?? null;

    const newCycle = await pocketbaseCreate<PocketBaseRecord>('cashback_cycles', {
        account_id: pbAccountId,
        cycle_tag: cycleTag,
        max_budget: maxBudget,
        min_spend_target: minSpend,
        spent_amount: 0,
        real_awarded: 0,
        virtual_profit: 0
    });

    return newCycle;
}

/**
 * Recomputes a cashback cycle's totals and awards in PocketBase.
 * This is the "Pre-calculate" Part.
 */
export async function recomputePocketBaseCashbackCycle(cycleId: string) {
    const cycle = await pocketbaseGetById<PocketBaseRecord>('cashback_cycles', cycleId);
    if (!cycle) return;

    const account = await pocketbaseGetById<PocketBaseRecord>('accounts', cycle.account_id);
    if (!account) return;

    // 1. Get all eligible transactions for this cycle
    // Note: We use 'status' != 'void' and 'type' in ['expense', 'debt']
    const txnsResp = await pocketbaseList<PocketBaseRecord>('transactions', {
        filter: `account_id='${cycle.account_id}' && persisted_cycle_tag='${cycle.cycle_tag}' && status!='void' && (type='expense' || type='debt')`,
        perPage: 500, // Reasonable limit
        expand: 'category_id'
    });

    const txns = txnsResp.items || [];

    // 2. Calculate current cycle spent
    const totalSpent = txns.reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

    let realAwardedTotal = 0;
    let virtualProfitTotal = 0;
    let overflowLossTotal = 0;

    // Group by Rule/Tier for capping (Mirroring Supabase logic)
    const ruleGroupSums: Record<string, { total: number, max: number | null }> = {};

    for (const txn of txns) {
        const policy = resolveCashbackPolicy({
            account: {
                id: account.id,
                cb_type: account.cb_type,
                cb_base_rate: account.cb_base_rate,
                cb_max_budget: account.cb_max_budget,
                cb_is_unlimited: account.cb_is_unlimited,
                cb_rules_json: account.cb_rules_json,
                cb_min_spend: account.cb_min_spend,
                cashback_config: account.cashback_config
            },
            categoryId: txn.category_id,
            amount: Math.abs(txn.amount),
            cycleTotals: { spent: totalSpent },
            categoryName: txn.expand?.category_id?.name
        });

        const rate = policy.rate;
        const amount = Math.abs(txn.amount) * rate;

        // Use transaction mode if available, otherwise virtual
        // MF: For snapshot recompute, we treat re-resolved ones as virtual projections unless specifically marked real.
        const mode = txn.cashback_mode?.startsWith('real') ? 'real' : 'virtual';

        if (mode === 'real') {
            realAwardedTotal += amount;
        } else {
            const meta = policy.metadata || {};
            if (meta.ruleId) {
                if (!ruleGroupSums[meta.ruleId]) {
                    ruleGroupSums[meta.ruleId] = { total: 0, max: meta.ruleMaxReward ?? null };
                }
                ruleGroupSums[meta.ruleId].total += amount;
            } else {
                virtualProfitTotal += amount;
            }
        }
    }

    // Apply Rule Caps
    for (const ruleId in ruleGroupSums) {
        const group = ruleGroupSums[ruleId];
        if (group.max !== null && group.max > 0) {
            const capped = Math.min(group.total, group.max);
            virtualProfitTotal += capped;
            overflowLossTotal += (group.total - capped);
        } else {
            virtualProfitTotal += group.total;
        }
    }

    // Apply Global Max Budget
    const maxBudget = account.cb_max_budget ?? null;
    const isUnlimited = account.cb_is_unlimited === true;

    let finalReal = realAwardedTotal;
    let finalVirtual = virtualProfitTotal;

    if (!isUnlimited && maxBudget !== null) {
        const remainingTotalBudget = Math.max(0, maxBudget - finalReal);
        const virtualEffective = Math.min(finalVirtual, remainingTotalBudget);
        const virtualOverflow = Math.max(0, finalVirtual - virtualEffective);

        finalVirtual = virtualEffective;
        overflowLossTotal += virtualOverflow;
    }

    const metMinSpend = (account.cb_min_spend ?? 0) === 0 || totalSpent >= Number(account.cb_min_spend);
    const isExhausted = !isUnlimited && maxBudget !== null && (finalReal + finalVirtual) >= maxBudget;

    // 3. Update Cycle Snapshot
    await pocketbaseUpdate('cashback_cycles', cycle.id, {
        spent_amount: totalSpent,
        real_awarded: finalReal,
        virtual_profit: finalVirtual,
        overflow_loss: overflowLossTotal,
        met_min_spend: metMinSpend,
        is_exhausted: isExhausted,
        max_budget: maxBudget,
        min_spend_target: account.cb_min_spend
    });
}

/**
 * Mutation entry point for transactions from PocketBase
 */
export async function upsertPocketBaseTransactionCashback(transactionId: string) {
    // Use source ID mapping if necessary
    const pbTxnId = toPocketBaseId(transactionId, 'transactions');
    const txn = await pocketbaseGetById<PocketBaseRecord>('transactions', pbTxnId);
    if (!txn) return;

    const account = await pocketbaseGetById<PocketBaseRecord>('accounts', txn.account_id);
    if (!account || account.type !== 'credit_card') return;

    // Resolve Cycle Tag
    const date = new Date(txn.occurred_at || txn.date);
    const config = parseCashbackConfig(account.cashback_config, account.id);
    const cycleRange = getCashbackCycleRange(config, date);
    const cycleTag = formatIsoCycleTag(cycleRange?.end ?? date);

    const cycle = await ensurePocketBaseCycle(account.id, cycleTag, account);

    // Persist cycle tag to transaction if not already set
    if (txn.persisted_cycle_tag !== cycleTag) {
        await pocketbaseUpdate('transactions', txn.id, { persisted_cycle_tag: cycleTag });
    }

    // Trigger Recompute
    await recomputePocketBaseCashbackCycle(cycle.id);
}

export async function removePocketBaseTransactionCashback(sourceAccountId: string, cycleTag: string) {
    const pbAccountId = toPocketBaseId(sourceAccountId, 'accounts');

    const cycleResp = await pocketbaseList<PocketBaseRecord>('cashback_cycles', {
        filter: `account_id='${pbAccountId}' && cycle_tag='${cycleTag}'`,
        perPage: 1
    });

    if (cycleResp.items && cycleResp.items.length > 0) {
        await recomputePocketBaseCashbackCycle(cycleResp.items[0].id);
    }
}
