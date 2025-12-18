'use server';

import { createClient } from '@/lib/supabase/server';
import { TransactionWithDetails } from '@/types/moneyflow.types';
import { CashbackCard, AccountSpendingStats } from '@/types/cashback.types';
import { calculateBankCashback, parseCashbackConfig, getCashbackCycleRange } from '@/lib/cashback';

/**
 * Ensures a cashback cycle exists for the given account and tag.
 * Returns the cycle ID.
 */
async function ensureCycle(accountId: string, cycleTag: string, accountConfig: any) {
  const supabase = createClient();

  // 1. Try to fetch existing
  const { data: existing } = await supabase
    .from('cashback_cycles')
    .select('id')
    .eq('account_id', accountId)
    .eq('cycle_tag', cycleTag)
    .maybeSingle();

  if (existing) return existing.id;

  // 2. Create if not exists
  const config = parseCashbackConfig(accountConfig);
  // Default to null if not defined, allowing DB to store NULL.
  // When doing math later, we treat NULL as 0.
  const maxBudget = config.maxAmount ?? null;
  const minSpend = config.minSpend ?? null;

  const { data: newCycle, error } = await supabase
    .from('cashback_cycles')
    .insert({
      account_id: accountId,
      cycle_tag: cycleTag,
      max_budget: maxBudget,
      min_spend_target: minSpend,
      spent_amount: 0
    })
    .select('id')
    .single();

  if (error) {
    // Handle race condition
    const { data: retry } = await supabase
      .from('cashback_cycles')
      .select('id')
      .eq('account_id', accountId)
      .eq('cycle_tag', cycleTag)
      .maybeSingle();

    if (retry) return retry.id;
    throw error;
  }

  return newCycle.id;
}

/**
 * Main entry point to upsert cashback entries for a transaction.
 */
export async function upsertTransactionCashback(
  transaction: TransactionWithDetails
) {
  const supabase = createClient();

  if (!['expense', 'debt'].includes(transaction.type ?? '')) {
    await supabase.from('cashback_entries').delete().eq('transaction_id', transaction.id);
    return;
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id, type, cashback_config')
    .eq('id', transaction.account_id)
    .single();

  if (!account || account.type !== 'credit_card') {
    await supabase.from('cashback_entries').delete().eq('transaction_id', transaction.id);
    return;
  }

  const modePreference = transaction.cashback_mode || 'none_back';
  let mode: 'real' | 'virtual' | 'voluntary' = 'virtual';
  let amount = 0;
  let countsToBudget = false;

  const fixedInput = transaction.cashback_share_fixed ?? 0;
  const percentInput = transaction.cashback_share_percent ?? 0;

  switch (modePreference) {
    case 'real_fixed':
    case 'real_percent':
      mode = 'real';
      // Hybrid Calculation: Sum of % share and Fixed share
      const pAmount = (Math.abs(transaction.amount) * (percentInput || 0)) / 100;
      const fAmount = fixedInput || 0;
      amount = pAmount + fAmount;
      countsToBudget = true;
      break;

    case 'voluntary':
      mode = 'voluntary';
      amount = fixedInput;
      countsToBudget = false;
      break;

    case 'none_back':
    default:
      mode = 'virtual';
      const config = parseCashbackConfig(account.cashback_config);
      const calcParams = calculateBankCashback(
        config,
        Math.abs(transaction.amount),
        transaction.category_name ?? undefined,
        0
      );
      amount = calcParams.amount;
      // MF5.2 Rule: Virtual counts to budget initially, but is clamped during recompute
      countsToBudget = true;
      break;
  }

  let cycleTag = transaction.persisted_cycle_tag || transaction.tag;
  if (!cycleTag) {
    const date = new Date(transaction.occurred_at);
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = date.getFullYear().toString().slice(-2);
    cycleTag = `${month}${year}`;
  }

  const cycleId = await ensureCycle(account.id, cycleTag, account.cashback_config);

  const entryData = {
    cycle_id: cycleId,
    account_id: account.id,
    transaction_id: transaction.id,
    mode,
    amount,
    counts_to_budget: countsToBudget,
    note: mode === 'virtual' ? 'Predicted profit (None Back)' : null
  };

  const { data: existingEntry } = await supabase
    .from('cashback_entries')
    .select('id, cycle_id')
    .eq('transaction_id', transaction.id)
    .maybeSingle();

  if (existingEntry) {
    await supabase.from('cashback_entries').update(entryData).eq('id', existingEntry.id);

    // CASBACK CONSISTENCY: If moving between cycles (diff date) or accounts (re-assigned),
    // we must recompute the OLD cycle too.
    if (existingEntry.cycle_id && existingEntry.cycle_id !== cycleId) {
      await recomputeCashbackCycle(existingEntry.cycle_id);
    }
  } else {
    await supabase.from('cashback_entries').insert(entryData);
  }

  // Trigger TypeScript Recompute Engine for the CURRENT cycle
  await recomputeCashbackCycle(cycleId);
}

/**
 * MF5.2 Engine: Deterministic Recomputation
 */
export async function recomputeCashbackCycle(cycleId: string) {
  const supabase = createClient();

  // 1. Fetch Cycle & Parent Account Info
  const { data: cycle } = await supabase
    .from('cashback_cycles')
    .select('account_id, cycle_tag, max_budget, min_spend_target')
    .eq('id', cycleId)
    .single();

  if (!cycle) return;

  const { data: account } = await supabase
    .from('accounts')
    .select('cashback_config')
    .eq('id', cycle.account_id)
    .single();

  const config = parseCashbackConfig(account?.cashback_config);
  const maxBudget = config.maxAmount ?? 0;
  const minSpendTarget = config.minSpend ?? 0;

  // 2. Aggregate Spent Amount from Transactions
  const { data: txns } = await supabase
    .from('transactions')
    .select('amount')
    .eq('account_id', cycle.account_id)
    .eq('persisted_cycle_tag', cycle.cycle_tag)
    .neq('status', 'void');

  const spentAmount = (txns ?? []).reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
  const isMinSpendMet = spentAmount >= minSpendTarget;

  // 3. Aggregate Cashback Entries
  const { data: entries } = await supabase
    .from('cashback_entries')
    .select('mode, amount, counts_to_budget')
    .eq('cycle_id', cycleId);

  if (!entries) return;

  let realTotal = 0;
  let virtualTotalRaw = 0;
  let voluntaryTotal = 0;

  entries.forEach(e => {
    if (e.mode === 'real' && e.counts_to_budget) {
      realTotal += e.amount;
    } else if (e.mode === 'virtual') {
      virtualTotalRaw += e.amount;
    } else if (e.mode === 'voluntary' || !e.counts_to_budget) {
      voluntaryTotal += e.amount;
    }
  });

  // 4. Logic Application
  const capAfterReal = Math.max(0, maxBudget - realTotal);
  const virtualEffective = Math.min(virtualTotalRaw, capAfterReal);
  const virtualOverflow = Math.max(0, virtualTotalRaw - virtualEffective);
  const realOverflow = Math.max(0, realTotal - maxBudget);
  const overflowLoss = voluntaryTotal + virtualOverflow + realOverflow;
  const realEffective = Math.min(realTotal, maxBudget);

  const isExhausted = realTotal >= maxBudget || (realTotal + virtualEffective) >= maxBudget;

  // 5. Update Cycle
  await supabase.from('cashback_cycles').update({
    max_budget: maxBudget, // Sync with latest config
    min_spend_target: minSpendTarget, // Sync with latest config
    spent_amount: spentAmount,
    met_min_spend: isMinSpendMet,
    real_awarded: realEffective,
    virtual_profit: virtualEffective,
    overflow_loss: overflowLoss,
    is_exhausted: isExhausted,
    updated_at: new Date().toISOString()
  }).eq('id', cycleId);
}

/**
 * Removes cashback entry for a deleted/voided transaction
 */
export async function removeTransactionCashback(transactionId: string) {
  const supabase = createClient();

  const { data: entry } = await supabase
    .from('cashback_entries')
    .select('cycle_id')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (entry) {
    await supabase.from('cashback_entries').delete().eq('transaction_id', transactionId);
    if (entry.cycle_id) {
      await recomputeCashbackCycle(entry.cycle_id);
    }
  }
}

/**
 * Returns stats for a specific account/date context.
 */
export async function getAccountSpendingStats(accountId: string, date: Date, categoryId?: string): Promise<AccountSpendingStats | null> {
  const supabase = createClient();
  const { data: account } = await supabase.from('accounts').select('cashback_config, type').eq('id', accountId).single();
  if (!account || account.type !== 'credit_card') return null;

  const config = parseCashbackConfig(account.cashback_config);
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = date.getFullYear().toString().slice(-2);
  const cycleTag = `${month}${year}`;

  const { data: cycle } = await supabase.from('cashback_cycles').select('*').eq('account_id', accountId).eq('cycle_tag', cycleTag).maybeSingle();

  let categoryName = undefined;
  if (categoryId) {
    const { data: cat } = await supabase.from('categories').select('name').eq('id', categoryId).single();
    categoryName = cat?.name;
  }

  const dummyCalc = calculateBankCashback(config, 1000000, categoryName, cycle?.spent_amount ?? 0);

  const realAwarded = cycle?.real_awarded ?? 0;
  const virtualProfit = cycle?.virtual_profit ?? 0;
  const overflowLoss = cycle?.overflow_loss ?? 0;

  const sharedAmount = realAwarded;
  const earnedSoFar = realAwarded + virtualProfit;
  const netProfit = virtualProfit - overflowLoss;

  const cycleRange = getCashbackCycleRange(config, date);

  return {
    currentSpend: cycle?.spent_amount ?? 0,
    minSpend: config.minSpend ?? 0,
    maxCashback: config.maxAmount ?? 0,
    rate: dummyCalc.rate,
    earnedSoFar,
    sharedAmount,
    potentialProfit: virtualProfit,
    netProfit,
    potentialRate: dummyCalc.rate,
    cycle: {
      label: cycleTag,
      start: cycleRange.start.toISOString(),
      end: cycleRange.end.toISOString(),
    }
  };
}

export async function getCashbackProgress(monthOffset: number = 0, accountIds?: string[], referenceDate?: Date): Promise<CashbackCard[]> {
  const supabase = createClient();
  const date = referenceDate ? new Date(referenceDate) : new Date();
  if (!referenceDate) {
    date.setMonth(date.getMonth() + monthOffset);
  }

  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = date.getFullYear().toString().slice(-2);
  const cycleTag = `${month}${year}`;

  let query = supabase.from('accounts').select('id, name, type, cashback_config, logo_url').eq('type', 'credit_card');
  if (accountIds && accountIds.length > 0) {
    query = query.in('id', accountIds);
  }
  const { data: accounts } = await query;
  if (!accounts) return [];

  const results: CashbackCard[] = [];

  for (const acc of accounts) {
    if (!acc.cashback_config) continue;
    const config = parseCashbackConfig(acc.cashback_config);

    const { data: cycle } = await supabase.from('cashback_cycles')
      .select('*')
      .eq('account_id', acc.id)
      .eq('cycle_tag', cycleTag)
      .maybeSingle();

    const currentSpend = cycle?.spent_amount ?? 0;
    const realAwarded = cycle?.real_awarded ?? 0;
    const virtualProfit = cycle?.virtual_profit ?? 0;
    const earnedSoFar = realAwarded + virtualProfit;
    const minSpend = cycle?.min_spend_target ?? config.minSpend ?? 0;
    const maxCashback = cycle?.max_budget ?? config.maxAmount ?? 0;

    const remainingBudget = maxCashback > 0 ? (maxCashback - earnedSoFar) : null;
    const progress = minSpend > 0 ? Math.min(100, (currentSpend / minSpend) * 100) : 100;

    const cycleRange = getCashbackCycleRange(config, date);
    const metMinSpend = cycle?.met_min_spend ?? false;
    const missingMinSpend = minSpend > currentSpend ? minSpend - currentSpend : 0;

    results.push({
      accountId: acc.id,
      accountName: acc.name,
      accountLogoUrl: acc.logo_url,
      cycleLabel: cycleTag,
      cycleStart: cycleRange.start.toISOString(),
      cycleEnd: cycleRange.end.toISOString(),
      cycleType: config.cycleType,
      progress,
      currentSpend,
      minSpend,
      maxCashback,
      totalEarned: earnedSoFar,
      sharedAmount: cycle?.real_awarded ?? 0,
      netProfit: (cycle?.virtual_profit ?? 0) - (cycle?.overflow_loss ?? 0),
      spendTarget: minSpend,
      minSpendMet: metMinSpend,
      minSpendRemaining: missingMinSpend,
      cycleOffset: monthOffset,
      min_spend_required: minSpend,
      total_spend_eligible: currentSpend,
      is_min_spend_met: metMinSpend,
      missing_min_spend: missingMinSpend,
      potential_earned: cycle?.virtual_profit ?? 0,
      transactions: [],
      remainingBudget: remainingBudget,
      rate: config.rate ?? 0
    });
  }

  return results;
}
