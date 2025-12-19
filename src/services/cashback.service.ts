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
  // const percentInput = transaction.cashback_share_percent ?? 0; // Unused in favor of Resolver logic unless overridden?
  // User Rule: "real_percent" transaction calculates from input OR policy?
  // Current logic used input. Let's see...
  // "real_percent creates entry with amount = computed real cashback or stored fixed equivalent"
  // If mode is real_percent, we usually trust the policy? 
  // No, if it's "real_percent", it implies we are using the % stored in the transaction?
  // Actually, MF5.2.2 requirements say: "Load: decimal -> percent, Save: percent -> decimal".
  // transaction.cashback_share_percent IS already the source of truth if set.
  // But wait, "resolveCashbackPolicy" is the new way.

  // Let's import the resolver
  const { resolveCashbackPolicy } = await import('./cashback/policy-resolver');

  let cycleTag = transaction.persisted_cycle_tag || transaction.tag;
  if (!cycleTag) {
    const date = new Date(transaction.occurred_at);
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = date.getFullYear().toString().slice(-2);
    cycleTag = `${month}${year}`;
  }

  const cycleId = await ensureCycle(account.id, cycleTag, account.cashback_config);

  // MF5.2 FIX: Persist the cycle tag to the transaction so recompute (summing logic) works!
  if (transaction.persisted_cycle_tag !== cycleTag) {
    await supabase.from('transactions').update({ persisted_cycle_tag: cycleTag }).eq('id', transaction.id);
  }

  // Get Cycle Totals for Policy Resolution (MF5.3 preparation)
  // We need spent_amount so far.
  const { data: cycle } = await supabase.from('cashback_cycles').select('spent_amount').eq('id', cycleId).single();
  const cycleTotals = { spent: cycle?.spent_amount ?? 0 };

  const policy = resolveCashbackPolicy({
    account,
    categoryId: transaction.category_id,
    amount: Math.abs(transaction.amount),
    cycleTotals,
    categoryName: transaction.category_name ?? undefined
  });

  switch (modePreference) {
    case 'real_fixed':
      mode = 'real';
      amount = fixedInput;
      countsToBudget = true;
      break;

    case 'real_percent':
      mode = 'real';
      // Hybrid: If user set a specific percent in Transaction Form, use it?
      // Or use Policy?
      // Usually "real_percent" means "Use the Standard Rate".
      // But if user overrode it in form?
      // Transaction form seems to save to `cashback_share_percent`.
      // Let's prefer the explicitly saved percent if non-zero, else policy.
      const usedRate = transaction.cashback_share_percent ? transaction.cashback_share_percent : policy.rate;
      amount = Math.abs(transaction.amount) * usedRate + fixedInput;
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
      // Use Policy for virtual
      amount = Math.abs(transaction.amount) * policy.rate;
      countsToBudget = true;
      break;
  }

  const entryData = {
    cycle_id: cycleId,
    account_id: account.id,
    transaction_id: transaction.id,
    mode,
    amount, // This is the total value
    counts_to_budget: countsToBudget,
    note: mode === 'virtual' ? 'Predicted profit (None Back)' : null
  };

  // Safe Upsert with Strict Constraint Handling
  // We used to do check-then-update/insert.
  // Now we have a unique index. Upsert is safer.
  const { error: upsertError } = await supabase
    .from('cashback_entries')
    .upsert(entryData, { onConflict: 'account_id, transaction_id' });

  if (upsertError) {
    console.error('Cashback Upsert Error:', upsertError);
    // Fallback? No, this is critical.
    throw upsertError;
  }

  // Handle Cycle Migration (Old Cycle Cleanup)
  // If transaction MOVED to a new cycle (date change) or account, we must recompute the OLD cycle.
  // BUT we don't know the old cycle ID here easily without querying BEFORE mutation.
  // However, `normalizeInput` handles account change.
  // If we just updated, the OLD entry is overwritten if account same.
  // If account CHANGED, the OLD entry (with old account_id) needs explicit deletion.
  // `updateTransaction` in transaction.service calls upsert.
  // But wait! If account_id changed, the unique constraint (account_id, txn_id) doesn't catch the OLD account_id row.
  // So we still might have a stale row if account changed?
  // Ah! `updateTransaction` logic: 
  // We need to ensure we clean up entries for this txnID on OTHER accounts.
  // Let's add that safety check.

  // Clean up any entries for this txn that do NOT match current account
  await supabase.from('cashback_entries')
    .delete()
    .eq('transaction_id', transaction.id)
    .neq('account_id', account.id);

  // Trigger Recompute Engine for CURRENT cycle
  await recomputeCashbackCycle(cycleId);

  // Also, since we don't know the ID of the "Old Cycle" from the "Other Account" we just deleted from,
  // we should find which cycles were affected.
  // But `delete` doesn't return the deleted rows' cycle_ids easily without select first.
  // In `updateTransaction` we can handle this, but better here if we can.
  // Let's rely on the fact that `recomputeCashbackCycle` runs on `cycleId`.
  // For the OLD cycle, if we deleted a row, its total will be wrong until recomputed.
  // Refinement: Query entries to delete first, get their cycle_ids, delete them, then recompute those cycles.

  // Optimization: This cleanup is rare (only on account change).
  // Query "other entries"
  const { data: staleEntries } = await supabase
    .from('cashback_entries')
    .select('cycle_id')
    .eq('transaction_id', transaction.id)
    .neq('account_id', account.id);

  if (staleEntries && staleEntries.length > 0) {
    const staleCycleIds = Array.from(new Set(staleEntries.map(e => e.cycle_id).filter(Boolean)));
    await supabase.from('cashback_entries').delete().eq('transaction_id', transaction.id).neq('account_id', account.id);
    for (const oldCid of staleCycleIds) {
      if (oldCid) await recomputeCashbackCycle(oldCid);
    }
  }
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
