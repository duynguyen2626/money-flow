'use server';

import { createClient } from '@/lib/supabase/server';
import { TransactionWithDetails } from '@/types/moneyflow.types';
import { CashbackCard, AccountSpendingStats, CashbackTransaction, RuleProgress } from '@/types/cashback.types';
import { calculateBankCashback, parseCashbackConfig, getCashbackCycleRange, getCashbackCycleTag, formatIsoCycleTag, formatLegacyCycleTag, parseCycleTag } from '@/lib/cashback';
import { normalizePolicyMetadata } from '@/lib/cashback-policy';
import { mapUnifiedTransaction } from '@/lib/transaction-mapper';
import { format } from 'date-fns';

import { resolveCashbackPolicy } from './cashback/policy-resolver'
/**
 * Ensures a cashback cycle exists for the given account and tag.
 * Returns the cycle ID.
 */

// DEBUG: Admin client creation
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { Database } from '@/types/database.types';

function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Ensures a cashback cycle exists for the given account and tag.
 * Returns the cycle ID.
 */
const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const getCashbackClient = () => (hasServiceRole ? createAdminClient() : createClient());

async function ensureCycle(
  accountId: string,
  cycleTag: string,
  accountConfig: any,
  fallbackTag?: string,
  client = getCashbackClient(),
) {
  const supabase = client;

  // 1. Try to fetch existing
  const { data: existing } = await supabase
    .from('cashback_cycles')
    .select('id')
    .eq('account_id', accountId)
    .eq('cycle_tag', cycleTag)
    .maybeSingle() as any;

  if (existing) return { id: existing.id, tag: cycleTag };

  if (fallbackTag && fallbackTag !== cycleTag) {
    const { data: fallback } = await supabase
      .from('cashback_cycles')
      .select('id')
      .eq('account_id', accountId)
      .eq('cycle_tag', fallbackTag)
      .maybeSingle() as any;

    if (fallback) return { id: fallback.id, tag: fallbackTag };
  }

  // 2. Create if not exists
  const config = parseCashbackConfig(accountConfig, accountId);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .maybeSingle() as any;

    if (retry) return { id: retry.id, tag: cycleTag };
    throw error;
  }

  return { id: (newCycle as any).id, tag: cycleTag };
}

/**
 * Main entry point to upsert cashback entries for a transaction.
 */
export async function upsertTransactionCashback(
  transaction: TransactionWithDetails
) {
  const supabase = getCashbackClient();
  const { data: existingEntries } = await supabase
    .from('cashback_entries')
    .select('cycle_id, account_id')
    .eq('transaction_id', transaction.id);

  const existingCycleIds = Array.from(new Set((existingEntries ?? [])
    .map((entry: any) => entry.cycle_id)
    .filter(Boolean)));

  if (!['expense', 'debt'].includes(transaction.type ?? '')) {
    if (existingEntries && existingEntries.length > 0) {
      await supabase.from('cashback_entries').delete().eq('transaction_id', transaction.id);
      for (const cycleId of existingCycleIds) {
        await recomputeCashbackCycle(cycleId);
      }
    }
    return;
  }

  // MF16: Strict Note-based Exclusion for Cashback
  const note = String(transaction.note || '').toLowerCase();
  const isExcluded = note.includes('create initial') ||
    note.includes('số dư đầu') ||
    note.includes('opening balance') ||
    note.includes('rollover') ||
    String(transaction.status).toLowerCase() === 'void';

  if (isExcluded) {
    if (existingEntries && existingEntries.length > 0) {
      await supabase.from('cashback_entries').delete().eq('transaction_id', transaction.id);
      for (const cycleId of existingCycleIds) {
        await recomputeCashbackCycle(cycleId);
      }
    }
    return;
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id, type, cashback_config')
    .eq('id', transaction.account_id)
    .single() as any;

  if (!account || account.type !== 'credit_card') {
    if (existingEntries && existingEntries.length > 0) {
      await supabase.from('cashback_entries').delete().eq('transaction_id', transaction.id);
      for (const cycleId of existingCycleIds) {
        await recomputeCashbackCycle(cycleId);
      }
    }
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


  const config = parseCashbackConfig(account.cashback_config, account.id);
  const date = new Date(transaction.occurred_at);
  const cycleRange = getCashbackCycleRange(config, date);
  const tagDate = cycleRange?.end ?? date;
  const cycleTag = formatIsoCycleTag(tagDate);
  const legacyCycleTag = formatLegacyCycleTag(tagDate);

  const { id: cycleId, tag: resolvedTag } = await ensureCycle(
    account.id,
    cycleTag,
    account.cashback_config,
    legacyCycleTag,
    supabase
  );

  // Persist the resolved tag to the transaction so recompute (summing logic) works.
  if (transaction.persisted_cycle_tag !== resolvedTag) {
    await supabase
      .from('transactions')
      .update({ persisted_cycle_tag: resolvedTag })
      .eq('id', transaction.id);
  }

  // Get Cycle Totals for Policy Resolution (MF5.3 preparation)
  // We need spent_amount so far.
  const { data: cycle } = await supabase.from('cashback_cycles').select('spent_amount').eq('id', cycleId).single() as any;
  const cycleTotals = { spent: cycle?.spent_amount ?? 0 };

  const policy = resolveCashbackPolicy({
    account,
    categoryId: transaction.category_id,
    amount: Math.abs(transaction.amount),
    cycleTotals,
    categoryName: transaction.category_name ?? undefined
  });

  let effectiveRate = policy.rate;

  switch (modePreference) {
    case 'real_fixed':
      mode = 'real';
      amount = fixedInput;
      countsToBudget = true;
      break;

    case 'real_percent':
      mode = 'real';
      effectiveRate = transaction.cashback_share_percent !== undefined && transaction.cashback_share_percent !== null
        ? transaction.cashback_share_percent
        : policy.rate;
      amount = Math.abs(transaction.amount) * effectiveRate + fixedInput;
      countsToBudget = true;
      break;

    case 'percent':
      mode = 'virtual';
      effectiveRate = transaction.cashback_share_percent !== undefined && transaction.cashback_share_percent !== null
        ? transaction.cashback_share_percent
        : policy.rate;
      amount = Math.abs(transaction.amount) * effectiveRate + fixedInput;
      countsToBudget = true;
      break;

    case 'fixed':
      mode = 'virtual';
      amount = fixedInput;
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
      amount = Math.abs(transaction.amount) * policy.rate;
      countsToBudget = true;
      break;
  }

  if (!policy.metadata) {
    throw new Error(`Critical: Cashback policy resolution failed to return metadata for transaction ${transaction.id}`);
  }

  const entryData = {
    cycle_id: cycleId,
    account_id: account.id,
    transaction_id: transaction.id,
    mode,
    amount, // This is the total value
    counts_to_budget: countsToBudget,
    metadata: {
      ...policy.metadata,
      rate: effectiveRate
    },
    note: mode === 'virtual'
      ? `Projected: ${policy.metadata.reason}`
      : (transaction.note || `Manual: ${policy.metadata.reason}`)
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

  const previousCycleId = (existingEntries as any ?? [])
    .find((entry: any) => (entry as any).account_id === (account as any).id)?.cycle_id ?? null
  const staleEntries = (existingEntries as any ?? [])
    .filter((entry: any) => (entry as any).account_id !== (account as any).id)
  const staleCycleIds = Array.from(new Set(staleEntries.map((entry: any) => (entry as any).cycle_id).filter(Boolean)))

  if (staleEntries.length > 0) {
    await supabase
      .from('cashback_entries')
      .delete()
      .eq('transaction_id', transaction.id)
      .neq('account_id', (account as any).id);

    for (const oldCycleId of staleCycleIds) {
      await recomputeCashbackCycle(oldCycleId as any);
    }
  }

  if (previousCycleId && previousCycleId !== cycleId) {
    await recomputeCashbackCycle(previousCycleId);
  }

  // Trigger recompute for the current cycle.
  await recomputeCashbackCycle(cycleId);
}

/**
 * MF5.2 Engine: Deterministic Recomputation
 */
import { SupabaseClient } from '@supabase/supabase-js'

export async function recomputeCashbackCycle(cycleId: string, supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient ?? getCashbackClient();

  // 1. Fetch Cycle & Parent Account Info
  const { data: cycle } = await supabase
    .from('cashback_cycles')
    .select('account_id, cycle_tag, max_budget, min_spend_target')
    .eq('id', cycleId)
    .single() as any;

  if (!cycle) return;

  const { data: account } = await supabase
    .from('accounts')
    .select('cashback_config')
    .eq('id', (cycle as any).account_id)
    .single() as any;

  const config = parseCashbackConfig(account?.cashback_config, (cycle as any).account_id);
  const maxBudget = config.maxAmount ?? null;
  const minSpendTarget = config.minSpend ?? null;

  // 2. Aggregate Spent Amount from Transactions
  // MF5.3.3 FIX: Include ONLY expense and debt (abs). Exclude transfer, repayment, lending.
  const { data: rawTxns } = await supabase
    .from('transactions')
    .select('id, amount, type, note, category_id, categories(name)')
    .eq('account_id', (cycle as any).account_id)
    .eq('persisted_cycle_tag', (cycle as any).cycle_tag)
    .neq('status', 'void')
    .in('type', ['expense', 'debt']) as any;

  // MF16: Filter out Initial/Rollover transactions in recompute
  const txns = (rawTxns as any[] ?? []).filter(t => {
    const note = String(t.note || '').toLowerCase();
    return !(
      note.includes('create initial') ||
      note.includes('số dư đầu') ||
      note.includes('opening balance') ||
      note.includes('rollover')
    );
  });

  const spentAmount = txns.reduce((sum, t) => sum + Math.abs((t as any).amount || 0), 0);
  const isMinSpendMet = minSpendTarget !== null ? spentAmount >= minSpendTarget : true;

  // 3. Re-resolve all entries for this cycle to handle tier jumps and ensure consistency
  // This is the "Deterministic" part: we recalculate based on the final spentAmount.
  const { resolveCashbackPolicy } = await import('./cashback/policy-resolver');

  const entriesToUpsert = [];
  for (const txn of txns) {
    const policy = resolveCashbackPolicy({
      account,
      categoryId: txn.category_id,
      amount: Math.abs(txn.amount),
      cycleTotals: { spent: spentAmount },
      categoryName: txn.categories?.name
    });

    // Determine mode and countsToBudget based on standard resolver logic
    // We assume 'virtual' for recompute unless specifically overridden in future.
    // However, if we want to preserve 'real' status of existing entries, we'd need to fetch them.
    // For simplicity and deterministic truth, we use 'virtual' as the baseline for recomputed projections.
    // Wait, if we overwrite 'real' entries with 'virtual', that's bad.
    // Let's fetch existing entry modes first.
    entriesToUpsert.push({
      cycle_id: cycleId,
      account_id: cycle.account_id,
      transaction_id: txn.id,
      amount: Math.abs(txn.amount) * policy.rate,
      mode: 'virtual', // Recompute updates the PROJECTION
      counts_to_budget: true,
      metadata: {
        ...policy.metadata,
        rate: policy.rate
      },
      note: `Recomputed: ${policy.metadata.reason}`
    });
  }

  // Bulk upsert entries (only metadata and amount update if txn exists)
  if (entriesToUpsert.length > 0) {
    await supabase.from('cashback_entries').upsert(entriesToUpsert, {
      onConflict: 'account_id, transaction_id'
    });
  }

  // 4. Aggregate and apply Caps (Tier Cap and Rule Cap)
  const { data: updatedEntries } = await supabase
    .from('cashback_entries')
    .select('mode, amount, counts_to_budget, metadata')
    .eq('cycle_id', cycleId) as any;

  let realTotal = 0;
  let virtualTotalRaw = 0;
  let voluntaryTotal = 0;

  // Group by Rule for Rule-level capping
  const ruleGroupSums: Record<string, { total: number, max: number | null }> = {};
  // Group by Tier for Tier-level capping
  const tierGroupSums: Record<string, { total: number, max: number | null }> = {};

  (updatedEntries as any ?? []).forEach((e: any) => {
    const meta = e.metadata || {};
    const amount = Number(e.amount || 0);

    if (e.mode === 'real' && e.counts_to_budget) {
      realTotal += amount;
    } else if (e.mode === 'virtual') {
      // Rule Capping logic
      if (meta.ruleId) {
        if (!ruleGroupSums[meta.ruleId]) {
          ruleGroupSums[meta.ruleId] = { total: 0, max: meta.ruleMaxReward ?? null };
        }
        ruleGroupSums[meta.ruleId].total += amount;
      } else {
        virtualTotalRaw += amount;
      }

      // Tier Capping logic (MF16)
      if (meta.levelId) {
        // Try to find if the tier itself has a cap (max_reward at tier level)
        // We'd need to know the tier config here. 
        // For now, rule caps are most important.
      }
    } else if (e.mode === 'voluntary' || !e.counts_to_budget) {
      voluntaryTotal += amount;
    }
  });

  // Apply Rule Caps
  for (const ruleId in ruleGroupSums) {
    const group = ruleGroupSums[ruleId];
    if (group.max !== null && group.max > 0) {
      const capped = Math.min(group.total, group.max);
      virtualTotalRaw += capped;
      voluntaryTotal += (group.total - capped); // The part that hit the cap is "loss"
    } else {
      virtualTotalRaw += group.total;
    }
  }

  // 5. Final Logic Application (Overall Budget)
  const capAfterReal = maxBudget !== null ? Math.max(0, maxBudget - realTotal) : Infinity;
  const virtualEffective = Math.min(virtualTotalRaw, capAfterReal);
  const virtualOverflow = Math.max(0, virtualTotalRaw - virtualEffective);
  const realOverflow = maxBudget !== null ? Math.max(0, realTotal - maxBudget) : 0;
  const totalOverflowLoss = voluntaryTotal + virtualOverflow + realOverflow;
  const realEffective = maxBudget !== null ? Math.min(realTotal, maxBudget) : realTotal;

  const isExhausted = maxBudget !== null && (realTotal >= maxBudget || (realTotal + virtualEffective) >= maxBudget);

  // 6. Update Cycle Record
  await supabase.from('cashback_cycles').update({
    max_budget: maxBudget,
    min_spend_target: minSpendTarget,
    spent_amount: spentAmount,
    met_min_spend: isMinSpendMet,
    real_awarded: realEffective,
    virtual_profit: virtualEffective,
    overflow_loss: totalOverflowLoss,
    is_exhausted: isExhausted,
    updated_at: new Date().toISOString()
  }).eq('id', cycleId);
}

/**
 * Removes cashback entry for a deleted/voided transaction
 */
export async function removeTransactionCashback(transactionId: string) {
  const supabase = createClient();

  // Get all cashback entries for this transaction (not just one)
  const { data: entries, error: selectError } = await supabase
    .from('cashback_entries')
    .select('cycle_id')
    .eq('transaction_id', transactionId);

  if (selectError) {
    console.error('Error fetching cashback entries for deletion:', selectError);
    throw selectError;
  }

  if (entries && entries.length > 0) {
    // Delete all cashback entries for this transaction
    const { error: deleteError } = await supabase
      .from('cashback_entries')
      .delete()
      .eq('transaction_id', transactionId);

    if (deleteError) {
      console.error('Error deleting cashback entries:', deleteError);
      throw deleteError;
    }

    // Recompute affected cycles
    const uniqueCycleIds = new Set(entries.map(e => (e as any).cycle_id).filter(Boolean));
    for (const cycleId of uniqueCycleIds) {
      try {
        await recomputeCashbackCycle(cycleId as string);
      } catch (err) {
        console.error(`Failed to recompute cashback cycle ${cycleId}:`, err);
      }
    }
  }
}

/**
 * Returns stats for a specific account/date context.
 */
export async function getAccountSpendingStats(accountId: string, date: Date, categoryId?: string, cycleTag?: string): Promise<AccountSpendingStats | null> {
  const supabase = createClient();
  const { data: account } = await (supabase
    .from('accounts')
    .select('cashback_config, type, cb_type, cb_base_rate, cb_max_budget, cb_is_unlimited, cb_rules_json')
    .eq('id', accountId)
    .single() as any);
  if (!account || account.type !== 'credit_card') return null;

  const config = parseCashbackConfig(account.cashback_config, accountId);
  
  // If cycleTag is provided explicitly, use it directly; otherwise derive from date
  let resolvedCycleTag: string;
  let cycleRange: { start: Date; end: Date } | null;
  
  if (cycleTag) {
    // Use the provided cycleTag directly
    resolvedCycleTag = cycleTag;
    // Try to derive cycleRange from the cycleTag for display purposes
    // For statement cycles like "2026-01", we can reconstruct the range
    try {
      const [yearStr, monthStr] = cycleTag.split('-');
      if (yearStr && monthStr) {
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        if (!isNaN(year) && !isNaN(month)) {
          // Use the end day of the tag month as reference to get proper cycle range
          const refDate = new Date(year, month - 1, 25); // Use day 25 to fall within statement cycle
          cycleRange = getCashbackCycleRange(config, refDate);
        } else {
          cycleRange = getCashbackCycleRange(config, date);
        }
      } else {
        cycleRange = getCashbackCycleRange(config, date);
      }
    } catch (e) {
      cycleRange = getCashbackCycleRange(config, date);
    }
  } else {
    // Derive from date (original behavior)
    cycleRange = getCashbackCycleRange(config, date);
    const tagDate = cycleRange?.end ?? date;
    resolvedCycleTag = formatIsoCycleTag(tagDate);
  }
  
  const legacyTag = formatLegacyCycleTag(cycleRange?.end ?? date);

  let cycle = (await supabase
    .from('cashback_cycles')
    .select('*')
    .eq('account_id', accountId)
    .eq('cycle_tag', resolvedCycleTag)
    .maybeSingle()).data as any ?? null;

  if (!cycle && legacyTag !== resolvedCycleTag) {
    cycle = (await supabase
      .from('cashback_cycles')
      .select('*')
      .eq('account_id', accountId)
      .eq('cycle_tag', legacyTag)
      .maybeSingle()).data as any ?? null;
  }

  console.log(`[getAccountSpendingStats] AID: ${accountId}, Tag: ${resolvedCycleTag}, Found: ${!!cycle}, Real: ${cycle?.real_awarded}`);

  let categoryName = undefined;
  if (categoryId) {
    const { data: cat } = await supabase.from('categories').select('name').eq('id', categoryId).single() as any;
    categoryName = cat?.name;
  }

  const { resolveCashbackPolicy } = await import('./cashback/policy-resolver');
  const policy = resolveCashbackPolicy({
    account,
    categoryId,
    amount: 1000000,
    cycleTotals: { spent: cycle?.spent_amount ?? 0 },
    categoryName
  });

  // MF6.1 FIX: Helper to aggregate cycle stats in real-time for accuracy
  // 1. Calculate Spent Amount & Eligible Transactions
  let txnsQuery = supabase
    .from('transactions')
    .select(`
      id, amount, type, occurred_at, note,
      cashback_share_percent, cashback_share_fixed,
      est_cashback, cashback_shared_amount,
      category:categories(id, name, icon, kind),
      shop:shops(name, image_url)
    `)
    .eq('account_id', accountId)
    .neq('status', 'void')
    .in('type', ['expense', 'debt']);

  // MF17: Robust cycle matching - try persisted_cycle_tag first, then 'tag' column, then date range
  const { data: tagTxns } = await txnsQuery.eq('persisted_cycle_tag', resolvedCycleTag);

  // Also try matching by 'tag' column (some transactions use this legacy approach)
  const { data: legacyTagTxns } = await (supabase
    .from('transactions')
    .select(`
      id, amount, type, occurred_at, note,
      cashback_share_percent, cashback_share_fixed,
      est_cashback, cashback_shared_amount,
      category:categories(id, name, icon, kind),
      shop:shops(name, image_url)
    `)
    .eq('account_id', accountId)
    .neq('status', 'void')
    .in('type', ['expense', 'debt'])
    .eq('tag', resolvedCycleTag) as any);

  // Merge both result sets, deduplicating by ID
  const mergedMap = new Map<string, any>();
  (tagTxns || []).forEach((t: any) => mergedMap.set(t.id, t));
  (legacyTagTxns || []).forEach((t: any) => mergedMap.set(t.id, t));

  let rawTxns = Array.from(mergedMap.values());

  if (rawTxns.length === 0 && cycleRange) {
    const { data: dateTxns } = await supabase
      .from('transactions')
      .select(`
            id, amount, type, occurred_at, note,
            cashback_share_percent, cashback_share_fixed,
            est_cashback, cashback_shared_amount,
            category:categories(id, name, icon, kind),
            shop:shops(name, image_url)
        `)
      .eq('account_id', accountId)
      .neq('status', 'void')
      .in('type', ['expense', 'debt'])
      .gte('occurred_at', cycleRange.start.toISOString())
      .lte('occurred_at', cycleRange.end.toISOString());
    rawTxns = dateTxns || [];
  }

  // MF16: Aggregate only non-initial/rollover/internal transactions
  const txns = (rawTxns as any[] ?? []).filter(t => {
    const note = String(t.note || '').toLowerCase();
    const isInitial = note.includes('create initial') ||
      note.includes('số dư đầu') ||
      note.includes('opening balance') ||
      note.includes('rollover');

    const categoryKind = t.category?.kind;
    const isInternal = categoryKind === 'internal';

    return !isInitial && !isInternal;
  });

  const currentSpend = txns.reduce((sum, t) => sum + Math.abs((t as any).amount || 0), 0);
  const minSpendTarget = cycle?.min_spend_target ?? config.minSpend ?? null;
  const cycleMaxBudget = cycle?.max_budget ?? config.maxAmount ?? null;

  // 2. Aggregate from Persisted Entries (Deterministic Source of Truth)
  // MF16 FIX: Instead of real-time estimation, we fetch the actual calculated entries
  // joined with the transactions in this cycle.
  const txnIds = txns.map(t => t.id);
  let earnedSoFarFromTxns = 0;
  let sharedSoFarFromTxns = 0;

  if (txnIds.length > 0) {
    const { data: entries } = await supabase
      .from('cashback_entries')
      .select('amount, mode, transaction_id')
      .in('transaction_id', txnIds)
      .eq('account_id', accountId);

    if (entries && entries.length > 0) {
      entries.forEach(entry => {
        const txn = txns.find(t => t.id === entry.transaction_id);
        const txnAmount = Math.abs(txn?.amount || 0);

        if (entry.mode === 'virtual' || entry.mode === 'real') {
          earnedSoFarFromTxns += (entry.amount || 0);

          const sharePercent = txn?.cashback_share_percent ?? 0;
          const shareFixed = txn?.cashback_share_fixed ?? 0;
          const shared = shareFixed > 0 ? shareFixed : (txnAmount * sharePercent);

          sharedSoFarFromTxns += shared;
        }
      });
    } else {
      // FALLBACK: User Stored or Real-time Estimation
      for (const t of txns as any[]) {
        const category = t.category;
        const txnAmount = Math.abs(t.amount);

        // PRIORITY: If transaction has explicit values from DB trigger, use them!
        if (typeof t.est_cashback === 'number' && t.est_cashback > 0) {
          earnedSoFarFromTxns += t.est_cashback;
          sharedSoFarFromTxns += (t.cashback_shared_amount || 0);
          continue;
        }

        const resolvedPolicy = resolveCashbackPolicy({
          account,
          categoryId: category?.id,
          amount: txnAmount,
          cycleTotals: { spent: currentSpend },
          categoryName: category?.name
        });

        const policyRate = resolvedPolicy.rate ?? 0;
        const sharePercent = t.cashback_share_percent ?? policyRate;
        const shareFixed = t.cashback_share_fixed ?? 0;

        let bankBack = txnAmount * policyRate;
        if (resolvedPolicy.maxReward && resolvedPolicy.maxReward > 0) {
          bankBack = Math.min(bankBack, resolvedPolicy.maxReward);
        }

        const peopleBack = shareFixed > 0 ? shareFixed : (txnAmount * sharePercent);

        earnedSoFarFromTxns += bankBack;
        sharedSoFarFromTxns += peopleBack;
      }
    }
  }

  // MF16: Rule Performance Breakdown
  const activeRules: RuleProgress[] = [];
  const rules = account.cb_type === 'tiered'
    ? (account.cb_rules_json?.tiers || account.cb_rules_json || [])
    : (account.cb_rules_json || []);

  // Identify tiers vs rules
  const allSubRules: { name: string, rate: number, max: number | null, cat_ids: string[], ruleId?: string }[] = [];
  if (account.cb_type === 'tiered' && account.cb_rules_json?.tiers) {
    // Show next tier or current tier?
    // User expects to see the premium rules even if not qualified yet.
    account.cb_rules_json.tiers.forEach((tier: any) => {
      tier.policies?.forEach((p: any) => {
        allSubRules.push({
          name: `${tier.name}: ${p.rate}% Bonus`,
          rate: p.rate,
          max: p.max,
          cat_ids: p.cat_ids || p.categoryIds || [],
          ruleId: `tier-${tier.min_spend}-${p.rate}`
        });
      });
    });
  } else if (Array.isArray(rules)) {
    rules.forEach((r: any, idx: number) => {
      allSubRules.push({
        name: r.name || `Rule ${idx + 1}`,
        rate: r.rate,
        max: r.max || r.maxReward,
        cat_ids: r.cat_ids || r.categoryIds || [],
        ruleId: r.id || `rule-${idx}`
      });
    });
  }

  // MF16 FIX: Fetch category names for rule labels
  const allCatIds = Array.from(new Set(allSubRules.flatMap(r => r.cat_ids)));
  const { data: catNames } = (allCatIds.length > 0
    ? await supabase.from('categories').select('id, name').in('id', allCatIds)
    : { data: [] }) as { data: { id: string, name: string }[] | null };
  const catMap = Object.fromEntries((catNames || []).map(c => [c.id, c.name]));

  // Calculate execution for each subRule
  allSubRules.forEach(rule => {
    const matchingTxns = txns.filter(t => rule.cat_ids.includes(t.category?.id));
    const spent = matchingTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // MF16.2: Normalize rate. If rate is 0.2 but logic uses /100, it becomes 0.002 (0.2%).
    // If user provided 0.2, it likely means 20% (0.2).
    const normalizedRate = (rule.rate > 0 && rule.rate < 1) ? rule.rate * 100 : rule.rate;

    let earned = matchingTxns.reduce((sum, t) => {
      const bankBack = Math.abs(t.amount) * (normalizedRate / 100);
      return sum + (rule.max ? Math.min(bankBack, rule.max) : bankBack);
    }, 0);

    // Apply rule cap if exists (though usually it's per transaction or per cycle)
    if (rule.max) earned = Math.min(earned, rule.max);

    // Build descriptive name if generic
    let displayName = rule.name;
    if (displayName.startsWith('Rule') || displayName.includes('% Bonus')) {
      const catLabels = rule.cat_ids.map(id => catMap[id]).filter(Boolean);
      if (catLabels.length > 0) {
        displayName = `${normalizedRate}% ${catLabels.slice(0, 2).join('/')}${catLabels.length > 2 ? '...' : ''}`;
      }
    }

    activeRules.push({
      ruleId: rule.ruleId || 'unknown',
      name: displayName,
      rate: normalizedRate, // Store normalized rate
      spent,
      earned,
      max: rule.max,
      isMain: normalizedRate > (account.cb_base_rate || 0)
    });
  });

  // Sort: Main (higher rate) first
  activeRules.sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0) || b.rate - a.rate);

  // Handle Cap Capping
  const isUnlimited = account.cb_is_unlimited === true || account.cb_type === 'none';

  if (!isUnlimited && cycleMaxBudget !== null && cycleMaxBudget > 0) {
    // If we exceed max budget, the overflow is loss
    const rawTotal = earnedSoFarFromTxns;
    earnedSoFarFromTxns = Math.min(rawTotal, cycleMaxBudget);
  }

  // Values for UI
  const earnedSoFar = earnedSoFarFromTxns;
  const sharedAmount = sharedSoFarFromTxns;
  const netProfit = earnedSoFar - sharedAmount;

  const isUnlimitedBudget = account.cb_is_unlimited === true;
  const remainingBudget = (isUnlimitedBudget || cycleMaxBudget === null) ? null : Math.max(0, cycleMaxBudget - earnedSoFar);
  const isMinSpendMet = currentSpend >= (minSpendTarget ?? 0);

  // Calculate Est Yearly Total (earnedSoFar scaled to year, simplified for now)
  // or use a more sophisticated projection if needed.
  // For now, let's at least sum what we have.
  const estYearlyTotal = earnedSoFar * 12; // Simplified projection

  return {
    currentSpend,
    minSpend: minSpendTarget,
    maxCashback: cycleMaxBudget,
    rate: policy.rate,
    maxReward: policy.maxReward,
    earnedSoFar,
    sharedAmount,
    potentialProfit: netProfit, // For backward compatibility
    netProfit,
    remainingBudget,
    potentialRate: policy.rate,
    matchReason: normalizePolicyMetadata(policy.metadata)?.policySource,
    policyMetadata: normalizePolicyMetadata(policy.metadata) ?? undefined,
    is_min_spend_met: isMinSpendMet,
    activeRules,
    estYearlyTotal,
    cycle: cycleRange ? {
      tag: resolvedCycleTag,
      label: config.cycleType === 'statement_cycle'
        ? `${format(cycleRange.start, 'dd.MM')} - ${format(cycleRange.end, 'dd.MM')}`
        : resolvedCycleTag,
      start: cycleRange.start.toISOString(),
      end: cycleRange.end.toISOString(),
    } : null
  };
}

export async function getCashbackProgress(monthOffset: number = 0, accountIds?: string[], referenceDate?: Date, includeTransactions: boolean = false): Promise<CashbackCard[]> {
  // DEBUG: Use Admin Client
  const supabase = createAdminClient();
  const date = referenceDate ? new Date(referenceDate) : new Date();
  if (!referenceDate) {
    date.setMonth(date.getMonth() + monthOffset);
  }

  let query = supabase
    .from('accounts')
    .select('id, name, type, cashback_config, image_url, cb_type, cb_base_rate, cb_max_budget, cb_is_unlimited, cb_rules_json')
    .in('type', ['credit_card', 'debt']);
  if (accountIds && accountIds.length > 0) {
    query = query.in('id', accountIds);
  }
  const { data: accounts } = await query as any;
  if (!accounts) return [];

  const results: CashbackCard[] = [];

  for (const acc of accounts) {
    if (!acc.cashback_config) {
      // Return basic info for accounts without cashback config (e.g. Volunteer/Debt)
      results.push({
        accountId: acc.id,
        accountName: acc.name,
        accountLogoUrl: acc.image_url,
        currentSpend: 0,
        totalEarned: 0,
        sharedAmount: 0,
        netProfit: 0,
        maxCashback: null,
        progress: 0,
        rate: 0,
        spendTarget: null,
        cycleStart: null,
        cycleEnd: null,
        cycleLabel: 'N/A',
        cycleType: 'calendar_month',
        transactions: [],
        minSpend: null,
        minSpendMet: true,
        minSpendRemaining: null,
        remainingBudget: null,
        cycleOffset: 0,
        min_spend_required: null,
        total_spend_eligible: 0,
        is_min_spend_met: true,
        missing_min_spend: null,
        potential_earned: 0,
        totalGivenAway: 0
      });
      continue;
    }
    const config = parseCashbackConfig(acc.cashback_config, acc.id);
    const cycleRange = getCashbackCycleRange(config, date);
    const tagDate = cycleRange?.end ?? date;
    const cycleTag = formatIsoCycleTag(tagDate);
    const legacyTag = formatLegacyCycleTag(tagDate);

    let cycle = (await supabase.from('cashback_cycles')
      .select('*')
      .eq('account_id', acc.id)
      .eq('cycle_tag', cycleTag)
      .maybeSingle()).data as any ?? null;

    if (!cycle && legacyTag !== cycleTag) {
      cycle = (await supabase.from('cashback_cycles')
        .select('*')
        .eq('account_id', acc.id)
        .eq('cycle_tag', legacyTag)
        .maybeSingle()).data as any ?? null;
    }

    const currentSpend = (cycle as any)?.spent_amount ?? 0;
    const realAwarded = (cycle as any)?.real_awarded ?? 0;
    const virtualProfit = (cycle as any)?.virtual_profit ?? 0;
    const earnedSoFar = realAwarded + virtualProfit;
    const minSpend = (cycle as any)?.min_spend_target ?? config.minSpend ?? null;
    const maxCashback = (cycle as any)?.max_budget ?? config.maxAmount ?? null;
    const overflowLoss = (cycle as any)?.overflow_loss ?? 0;

    // MF5.3.3 FIX: Budget Left must come from cycle if exists, else fallback to config.maxAmount
    const remainingBudget = maxCashback !== null ? Math.max(0, maxCashback - earnedSoFar) : null;

    // Fix: Progress should track Budget Usage (Cap), not Min Spend
    const progress = (maxCashback !== null && maxCashback > 0)
      ? Math.min(100, (earnedSoFar / maxCashback) * 100)
      : 0;

    const metMinSpend = (cycle as any)?.met_min_spend ?? (typeof minSpend === 'number' ? currentSpend >= minSpend : true);
    const missingMinSpend = typeof minSpend === 'number' && minSpend > currentSpend ? minSpend - currentSpend : null;

    const { resolveCashbackPolicy } = await import('./cashback/policy-resolver');
    const policy = resolveCashbackPolicy({
      account: acc,
      amount: 1000000,
      cycleTotals: { spent: currentSpend }
    });

    let transactions: CashbackTransaction[] = [];
    if (includeTransactions && cycle) {
      // Use direct relations instead of legacy line items to fix missing relation error
      const { data: entries, error: entriesError } = await (supabase
        .from('cashback_entries')
        .select(`
          mode, amount, metadata, transaction_id,
          transaction:transactions!inner (
            id, occurred_at, note, amount, account_id,
            cashback_share_percent, cashback_share_fixed,
            category:categories(id, name, icon),
            shop:shops(name, image_url),
            person:people!transactions_person_id_fkey(name)
          )
        `)
        .eq('cycle_id', (cycle as any).id)
        .eq('transaction.account_id', acc.id)
        .neq('transaction.status', 'void') as any);

      if (entriesError) {
        console.error('[getCashbackProgress] Failed to load entries:', entriesError);
      }

      if (entries && (entries as any).length > 0) {
        transactions = (entries as any).map((e: any) => {
          const t = e.transaction;
          if (!t) return null;

          const category = t.category;
          const shop = t.shop;
          const person = t.person;

          const txnAmount = Math.abs(t.amount);
          // Use the spent amount from THIS cycle being viewed, not current cycle
          const cycleSpentForPolicy = (cycle as any)?.spent_amount ?? 0;

          const resolvedPolicy = resolveCashbackPolicy({
            account: acc,
            categoryId: category?.id,
            amount: txnAmount,
            cycleTotals: { spent: cycleSpentForPolicy },
            categoryName: category?.name
          });

          const resolvedMetadata = normalizePolicyMetadata(resolvedPolicy.metadata);
          // Always prefer fresh resolved metadata for display to fix stale policySource/rate issues
          const policyMetadata = resolvedMetadata ?? normalizePolicyMetadata(e.metadata);

          const policyRate = policyMetadata?.rate ?? 0; // Default rate from policy (e.g., 10%)
          const sharePercent = t.cashback_share_percent ?? policyRate; // User's customized share (e.g., 8%)
          const shareFixed = t.cashback_share_fixed ?? 0;

          // Bank Back: What the bank gives back (policy rate), capped by rule maxReward or cycle maxBudget
          let bankBack = txnAmount * policyRate;
          const ruleMaxReward = policyMetadata?.ruleMaxReward ?? resolvedPolicy.maxReward ?? null;
          const cycleMaxBudget = (cycle as any)?.max_budget ?? null;

          // Apply cap from rule first, then from cycle budget
          if (ruleMaxReward !== null && ruleMaxReward > 0) {
            bankBack = Math.min(bankBack, ruleMaxReward);
          }
          if (cycleMaxBudget !== null && cycleMaxBudget > 0) {
            // Note: In a multi-transaction scenario, this would need cumulative tracking.
            // For now, we cap individual transaction to avoid exceeding cycle budget per transaction.
            bankBack = Math.min(bankBack, cycleMaxBudget);
          }

          // People CB: What was shared with others
          // If shareFixed is set, use it; otherwise calculate from sharePercent
          const peopleBack = shareFixed > 0 ? shareFixed : (txnAmount * sharePercent);

          // Profit: Your profit (capped bank back minus share)
          const profit = bankBack - peopleBack;

          return {
            id: t.id,
            occurred_at: t.occurred_at,
            note: t.note,
            amount: t.amount,
            earned: bankBack, // For backwards compatibility
            bankBack,
            peopleBack,
            profit,
            effectiveRate: policyRate,
            sharePercent: t.cashback_share_percent,
            shareFixed: t.cashback_share_fixed,
            shopName: shop?.name,
            shopLogoUrl: shop?.image_url,
            categoryName: category?.name,
            categoryIcon: category?.icon,
            categoryLogoUrl: category?.image_url,
            personName: person?.name,
            policyMetadata,
          } as CashbackTransaction;
        }).filter((t: any): t is CashbackTransaction => t !== null)
          .sort((a: any, b: any) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
      }
    }

    // fallback logic for stats if cycle value is 0 but transactions exist
    let finalEarned = earnedSoFar;
    let finalShared = realAwarded;
    let finalNetProfit = virtualProfit - overflowLoss;

    if (transactions.length > 0 && finalEarned === 0 && finalNetProfit === 0) {
      // Aggregation seems to be missing, sum from transactions
      // Note: transactions array items have: earned, peopleBack, profit
      const sumEarned = transactions.reduce((acc, t) => acc + (t.earned || 0), 0);
      const sumProfit = transactions.reduce((acc, t) => acc + (t.profit || 0), 0);
      const sumShared = transactions.reduce((acc, t) => acc + (t.peopleBack || 0), 0);

      if (sumEarned > 0) {
        finalEarned = sumEarned;
        finalShared = sumShared;
        finalNetProfit = sumProfit - overflowLoss;
      }
    }

    // Calculate totalGivenAway (Sum of (percent * amount) + fixed)
    const totalGivenAway = transactions.reduce((sum, t) => {
      const sharePercent = parseFloat((t.sharePercent as any) || '0'); // sharePercent in CashbackTransaction might be number | string? defined as number but data might be string from DB
      const shareFixed = parseFloat((t.shareFixed as any) || '0');
      const txnAmount = Math.abs(t.amount);
      return sum + (sharePercent * txnAmount) + shareFixed;
    }, 0);

    results.push({
      accountId: acc.id,
      accountName: acc.name,
      accountLogoUrl: acc.image_url,
      cycleLabel: cycleTag,
      cycleStart: cycleRange?.start.toISOString() ?? null,
      cycleEnd: cycleRange?.end.toISOString() ?? null,
      cycleType: config.cycleType,
      progress,
      currentSpend,
      minSpend,
      maxCashback,
      totalEarned: finalEarned,
      sharedAmount: finalShared,
      netProfit: finalNetProfit,
      spendTarget: minSpend,
      minSpendMet: metMinSpend,
      minSpendRemaining: missingMinSpend,
      cycleOffset: monthOffset,
      min_spend_required: minSpend,
      total_spend_eligible: currentSpend,
      is_min_spend_met: metMinSpend,
      missing_min_spend: missingMinSpend,
      potential_earned: finalNetProfit, // Use final calculation here too? Yes implies cycle.virtual_profit
      transactions,
      remainingBudget: remainingBudget,
      rate: policy.rate,
      totalGivenAway
    });

  }
  return results;
}

/**
 * Fetches the cashback policy explanation (metadata) for a specific transaction.
 */
export async function getTransactionCashbackPolicyExplanation(transactionId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cashback_entries')
    .select('metadata')
    .eq('transaction_id', transactionId)
    .maybeSingle() as any;

  if (error) {
    console.error('Error fetching cashback policy explanation:', error);
    return null;
  }

  return normalizePolicyMetadata(data?.metadata) ?? null;
}

/**
 * MF7.3: Simulates cashback for a potential transaction (Preview Mode).
 * Does not persist any data.
 */
export async function simulateCashback(params: {
  accountId: string
  amount: number
  categoryId?: string
  occurredAt?: string
}) {
  const supabase = createClient();
  const { accountId, amount, categoryId, occurredAt } = params;
  const date = occurredAt ? new Date(occurredAt) : new Date();

  // 1. Get Account Config
  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, cashback_config, type')
    .eq('id', accountId)
    .eq('id', accountId)
    .single() as any;

  if (!account || account.type !== 'credit_card') {
    return {
      rate: 0,
      estimatedReward: 0,
      metadata: null
    };
  }

  const config = parseCashbackConfig(account.cashback_config, accountId);
  const cycleRange = getCashbackCycleRange(config, date);
  const tagDate = cycleRange?.end ?? date;
  const cycleTag = formatIsoCycleTag(tagDate);
  const legacyCycleTag = formatLegacyCycleTag(tagDate);

  // 2. Get Current Cycle Totals (Read-Only)
  // We need to find the correct cycle to know the 'spent_amount' so far.
  let spentSoFar = 0;
  if (cycleTag) {
    let cycle = (await supabase
      .from('cashback_cycles')
      .select('spent_amount')
      .eq('account_id', accountId)
      .eq('cycle_tag', cycleTag)
      .maybeSingle()).data as any ?? null;

    if (!cycle && legacyCycleTag !== cycleTag) {
      cycle = (await supabase
        .from('cashback_cycles')
        .select('spent_amount')
        .eq('account_id', accountId)
        .eq('cycle_tag', legacyCycleTag)
        .maybeSingle()).data as any ?? null;
    }

    spentSoFar = cycle?.spent_amount ?? 0;
  }

  // 3. Resolve Policy
  const { resolveCashbackPolicy } = await import('./cashback/policy-resolver');

  // Fetch Category Name if ID provided (for pretty reason text)
  let categoryName: string | undefined = undefined;
  if (categoryId) {
    const { data: cat } = await supabase.from('categories').select('name').eq('id', categoryId).single() as any;
    categoryName = cat?.name;
  }

  const policy = resolveCashbackPolicy({
    account,
    categoryId,
    amount,
    cycleTotals: { spent: spentSoFar },
    categoryName
  });

  const estimatedReward = amount * policy.rate;
  // Apply Rule Max Reward Cap if exists
  const finalReward = (policy.maxReward !== undefined && policy.maxReward !== null)
    ? Math.min(estimatedReward, policy.maxReward)
    : estimatedReward;

  return {
    rate: policy.rate,
    estimatedReward: finalReward,
    metadata: normalizePolicyMetadata(policy.metadata),
    maxReward: policy.maxReward,
    isCapped: finalReward < estimatedReward
  };
}

/**
 * Fetches all cashback history for an account (debugging/analysis usage).
 */
export async function getAllCashbackHistory(accountId: string): Promise<CashbackCard | null> {
  const supabase = createAdminClient();
  const { data: account } = await (supabase.from('accounts').select('id, name, image_url, cashback_config').eq('id', accountId).single() as any);
  if (!account) return null;

  const config = parseCashbackConfig(account.cashback_config, accountId);
  const { data: cycles } = await (supabase
    .from('cashback_cycles')
    .select('*')
    .eq('account_id', accountId) as any);

  const totalEarned = (cycles ?? []).reduce((sum: number, c: any) => sum + (c.real_awarded ?? 0) + (c.virtual_profit ?? 0), 0);
  const totalShared = (cycles ?? []).reduce((sum: number, c: any) => sum + (c.real_awarded ?? 0), 0);
  const totalNet = (cycles ?? []).reduce((sum: number, c: any) => sum + (c.virtual_profit ?? 0) - (c.overflow_loss ?? 0), 0);
  const sumMaxBudget = (cycles ?? []).reduce((sum: number, c: any) => sum + (c.max_budget ?? 0), 0);

  let transactions: CashbackTransaction[] = [];
  const { data: entries, error: entriesError } = await (supabase
    .from('cashback_entries')
    .select('mode, amount, metadata, transaction_id, cycle_id, cycle:cashback_cycles(cycle_tag), transaction:transactions!inner(id, occurred_at, note, amount, account_id, cashback_share_percent, cashback_share_fixed, category:categories(name, icon), shop:shops(name, image_url), person:people!transactions_person_id_fkey(name))')
    .eq('transaction.account_id', accountId)
    .neq('transaction.status', 'void') as any);

  if (!entriesError && entries && (entries as any).length > 0) {
    transactions = (entries as any).map((e: any) => {
      const t = e.transaction;
      if (!t) return null;
      return {
        id: t.id,
        occurred_at: t.occurred_at,
        note: t.note,
        amount: t.amount,
        earned: e.amount,
        bankBack: e.amount,
        peopleBack: e.mode === 'real' ? e.amount : 0,
        profit: e.mode === 'virtual' ? e.amount : 0,
        effectiveRate: normalizePolicyMetadata(e.metadata)?.rate ?? 0,
        sharePercent: t.cashback_share_percent,
        shareFixed: t.cashback_share_fixed,
        shopName: t.shop?.name,
        shopLogoUrl: t.shop?.image_url,
        categoryName: t.category?.name,
        categoryIcon: t.category?.icon,
        categoryLogoUrl: t.category?.image_url,
        personName: t.person?.name,
        policyMetadata: normalizePolicyMetadata(e.metadata),
        cycleTag: e.cycle?.cycle_tag
      } as CashbackTransaction;
    }).filter((t: any): t is CashbackTransaction => t !== null)
      .sort((a: any, b: any) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  }

  // Calculate totalGivenAway (Sum of (percent * amount) + fixed)
  const totalGivenAway = transactions.reduce((sum, t) => {
    const sharePercent = parseFloat((t.sharePercent as any) || '0');
    const shareFixed = parseFloat((t.shareFixed as any) || '0');
    const txnAmount = Math.abs(t.amount);
    return sum + (sharePercent * txnAmount) + shareFixed;
  }, 0);

  return {
    accountId: account.id,
    accountName: account.name,
    accountLogoUrl: account.image_url,
    cycleLabel: 'ALL TIME',
    cycleStart: null,
    cycleEnd: null,
    cycleType: null,
    progress: sumMaxBudget > 0 ? ((totalEarned / sumMaxBudget) * 100) : 0,
    currentSpend: 0,
    minSpend: 0,
    maxCashback: sumMaxBudget > 0 ? sumMaxBudget : null,
    totalEarned,
    sharedAmount: totalShared,
    netProfit: totalNet,
    spendTarget: 0,
    minSpendMet: true,
    minSpendRemaining: 0,
    cycleOffset: 0,
    min_spend_required: 0,
    total_spend_eligible: 0,
    is_min_spend_met: true,
    missing_min_spend: 0,
    potential_earned: totalNet,
    transactions,
    remainingBudget: sumMaxBudget > 0 ? Math.max(0, sumMaxBudget - totalEarned) : null,
    rate: 0,
    totalGivenAway
  };
}

/**
 * Recomputes cycles and entries for an account.
 * Used when statementDay, cycleType, or cashback_config_version changes.
 * Idempotent: deletes existing entries and recreates them.
 * @param monthsBack Number of full months to look back. If undefined, recomputes ALL.
 */
export async function recomputeAccountCashback(accountId: string, monthsBack?: number) {
  const supabase = createClient();

  // 1. Fetch posted expense/debt transactions for this account
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('account_id', accountId)
    .neq('status', 'void')
    .in('type', ['expense', 'debt']);

  if (typeof monthsBack === 'number') {
    const cutOff = new Date();
    cutOff.setMonth(cutOff.getMonth() - monthsBack);
    cutOff.setDate(1);
    cutOff.setHours(0, 0, 0, 0);
    query = query.gte('occurred_at', cutOff.toISOString());
  }

  const { data: txns } = await query;

  if (!txns) {
    return;
  }

  // 2. Re-process each transaction
  // Sequential processing to ensure cycle totals are updated correctly
  for (const rawTxn of txns) {
    const txn = mapUnifiedTransaction(rawTxn, accountId) as any;
    // Force clear the tag to trigger recalculation in upsertTransactionCashback
    const cleanTxn = { ...txn, persisted_cycle_tag: null };
    await upsertTransactionCashback(cleanTxn);
  }
}

export async function getCashbackCycleOptions(accountId: string, limit: number = 12) {
  const supabase = createAdminClient();
  const { data: cycles } = await (supabase
    .from('cashback_cycles')
    .select('cycle_tag')
    .eq('account_id', accountId)
    .limit(48) as any);

  const { data: account } = await (supabase
    .from('accounts')
    .select('cashback_config')
    .eq('id', accountId)
    .single() as any);

  const config = parseCashbackConfig(account?.cashback_config, accountId);
  const currentCycleTag = getCashbackCycleTag(new Date(), {
    statementDay: config.statementDay,
    cycleType: config.cycleType,
  } as any);

  const existingTags = new Set((cycles ?? []).map((c: any) => c.cycle_tag));
  const options = [...(cycles ?? [])];

  // Inject current cycle if missing
  if (currentCycleTag && !existingTags.has(currentCycleTag)) {
    options.unshift({ cycle_tag: currentCycleTag });
  }

  // Helper to get sortable value from tag
  const getSortValue = (tag: string) => {
    const parsed = parseCycleTag(tag);
    return parsed ? (parsed.year * 100 + parsed.month) : 0;
  };

  // Sort chronologically (descending)
  options.sort((a, b) => getSortValue(b.cycle_tag) - getSortValue(a.cycle_tag));

  return options.map((c: any) => {
    const tag: string = c.cycle_tag;
    let label = tag;

    // Reverse engineer date from tag to build label
    const parsed = parseCycleTag(tag);
    if (parsed) {
      const monthIdx = parsed.month - 1;
      const year = parsed.year;

      if (config.cycleType === 'statement_cycle' && config.statementDay) {
        const end = new Date(year, monthIdx, config.statementDay - 1);
        const start = new Date(year, monthIdx - 1, config.statementDay);

        const fmt = (val: Date) => `${String(val.getDate()).padStart(2, '0')}.${String(val.getMonth() + 1).padStart(2, '0')}`;
        label = `${fmt(start)} - ${fmt(end)}`;
      } else {
        label = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(year, monthIdx, 1));
      }
    }

    return {
      tag,
      label,
      cycleType: config.cycleType,
      statementDay: config.statementDay,
    };
  });
}

/**
 * MF7.4: Aggregates cashback analytics for a specific year.
 * Focuses on Calendar Month aggregation for Spend & Share.
 */
export async function getCashbackYearAnalytics(year: number): Promise<import('@/types/cashback.types').CashbackYearSummary[]> {
  const supabase = createAdminClient() as any;

  // 1. Get credit cards and debt accounts (for volunteer/loans)
  const { data: cards, error: cardError } = await supabase
    .from('accounts')
    .select('id, name, annual_fee, type')
    .eq('type', 'credit_card')
    .eq('is_active', true);

  if (cardError || !cards) {
    console.error('[getCashbackYearAnalytics] Failed to fetch cards:', cardError);
    return [];
  }

  const cardIds = cards.map((c: any) => c.id);
  console.log(`[getCashbackYearAnalytics] Found ${cardIds.length} cards/debt-accounts:`, cards.map((c: any) => `${c.name} (${c.type})`).join(', '));

  if (cardIds.length === 0) return [];

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31T23:59:59`;

  // 2. Batch Fetch Transactions (Single Query)
  const { data: allTxns } = await supabase
    .from('transactions')
    .select(`
        id, amount, occurred_at, type, category_id, account_id, cashback_mode,
        cashback_entries ( amount )
      `)
    .in('account_id', cardIds)
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate)
    .neq('status', 'void') as any;

  // 3. Batch Fetch Redeemed (Income 'Hoàn tiền (Cashback)')
  const { data: allRedeemed } = await supabase
    .from('transactions')
    .select('amount, account_id')
    .in('account_id', cardIds)
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate)
    .neq('status', 'void')
    .eq('type', 'income')
    .eq('category_id', 'e0000000-0000-0000-0000-000000000092');

  const results: import('@/types/cashback.types').CashbackYearSummary[] = [];
  const { computeCardCashbackProfit } = await import('@/lib/analytics-utils');

  for (const card of cards) {
    // A. Filter Data in Memory
    const cardTxns = (allTxns || []).filter((t: any) => t.account_id === card.id);
    const cardRedeemedTxns = (allRedeemed || []).filter((t: any) => t.account_id === card.id);

    const monthsData: { [key: number]: { spend: number, given: number } } = {};
    for (let m = 1; m <= 12; m++) monthsData[m] = { spend: 0, given: 0 };

    cardTxns.forEach((t: any) => {


      const date = new Date(t.occurred_at);
      const month = date.getMonth() + 1;

      // DEBUG: Log transaction processing
      // if (t.type === 'debt') console.log(`[CashbackAnalytics] Processing DEBT txn: ${t.id} Amount: ${t.amount} Account: ${t.account_id}`);

      // Track cashback GIVEN AWAY to people (not the lent amount itself)
      // Calculate: (cashback_share_percent * amount) + cashback_share_fixed
      if (t.type === 'debt') {
        const sharePercent = parseFloat(t.cashback_share_percent || '0');
        const shareFixed = parseFloat(t.cashback_share_fixed || '0');
        const txnAmount = Math.abs(t.amount);
        const cashbackGivenAway = (sharePercent * txnAmount) + shareFixed;
        monthsData[month].spend += cashbackGivenAway;
      }

      // Sum cashback entries for this transaction
      if (t.cashback_entries && t.cashback_entries.length > 0) {
        // Fix: Shared Return should ONLY count Voluntary (Shared) cashback.
        // Previously it summed ALL cashback (including real/bank).
        const given = t.cashback_entries
          .filter((e: any) => e.mode === 'voluntary')
          .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
        monthsData[month].given += given;
      }
    });

    const monthsArray = Object.entries(monthsData).map(([m, val]) => ({
      month: Number(m),
      totalGivenAway: val.spend, // Total cashback given away (percent + fixed)
      cashbackGiven: val.given
    }));

    const cashbackGivenYearTotal = monthsArray.reduce((sum, m) => sum + m.cashbackGiven, 0);
    const cashbackRedeemedYearTotal = cardRedeemedTxns.reduce((sum: any, t: any) => sum + Math.abs(t.amount || 0), 0);
    const annualFeeYearTotal = card.annual_fee || 0;
    const interestYearTotal = 0;

    const netProfit = computeCardCashbackProfit({
      cashbackRedeemed: cashbackRedeemedYearTotal,
      cashbackGiven: cashbackGivenYearTotal,
      annualFee: annualFeeYearTotal,
      interest: interestYearTotal
    });

    results.push({
      cardId: card.id,
      cardType: card.type, // Include type for UI filtering
      year,
      months: monthsArray,
      cashbackRedeemedYearTotal,
      annualFeeYearTotal,
      interestYearTotal,
      cashbackGivenYearTotal,
      netProfit
    });
  }

  return results.sort((a, b) => b.netProfit - a.netProfit);
}

/**
 * Fetches detailed transactions for a specific card/month/year for drill-down.
 * Logic: Track money GIVEN to people (debt/lend), NOT personal expenses
 */
export async function getMonthlyCashbackTransactions(cardId: string, month: number, year: number) {
  const supabase = createAdminClient();

  // Construct start/end dates for the month
  const startDate = new Date(year, month - 1, 1).toISOString();
  // End date is start of next month (handling Dec rollover)
  const endDate = new Date(year, month, 1).toISOString();

  // Fetch transactions with cashback entries
  const { data: txns, error } = await supabase
    .from('transactions')
    .select(`
      id, occurred_at, note, amount, type, 
      cashback_share_percent, cashback_share_fixed,
      category:categories(name, icon),
      cashback_entries ( amount, mode, metadata )
    `)
    .eq('account_id', cardId)
    .gte('occurred_at', startDate)
    .lt('occurred_at', endDate)
    .neq('status', 'void') // Exclude void
    .in('type', ['debt']) // Track money given to people (debt), not personal expenses
    .order('occurred_at', { ascending: false }) as any;

  if (error) {
    console.error('getMonthlyCashbackTransactions error:', error);
    return [];
  }

  return (txns || []).map((t: any) => {
    const given = (t.cashback_entries || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    return {
      ...t,
      cashbackGiven: given
    };
  });
}

/**
 * Fetches all cashback cycles for a specific account.
 */
export async function getAccountCycles(accountId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from('cashback_cycles')
    .select('id, cycle_tag, spent_amount, real_awarded, virtual_profit, min_spend_target, max_budget, is_exhausted, met_min_spend')
    .eq('account_id', accountId)
    .order('cycle_tag', { ascending: false });

  if (error) {
    console.error('Error fetching account cycles:', error);
  }
  return data || [];
}

/**
 * Fetches detailed transactions for a specific cashback cycle.
 */
export async function getTransactionsForCycle(cycleId: string) {
  const supabase = createClient();

  // Use direct relations instead of legacy line items to fix missing relation error
  // Explicitly select person name
  const { data: entries, error: entriesError } = await (supabase
    .from('cashback_entries')
    .select(`
      mode, amount, metadata, transaction_id,
      transaction:transactions!inner (
        id, occurred_at, note, amount, account_id,
        cashback_share_percent, cashback_share_fixed,
        category:categories(name, icon),
        shop:shops(name, image_url),
        person:people!transactions_person_id_fkey(name)
      )
    `)
    .eq('cycle_id', cycleId)
    .neq('transaction.status', 'void') as any);

  if (entriesError || !entries) {
    console.error('[getTransactionsForCycle] Failed to load entries:', entriesError);
    return [];
  }

  const { resolveCashbackPolicy } = await import('./cashback/policy-resolver');

  return (entries as any).map((e: any) => {
    const t = e.transaction;
    if (!t) return null;

    const category = t.category;
    const shop = t.shop;
    const person = t.person;

    const bankBack = e.amount;
    const peopleBack = e.mode === 'real' ? e.amount : 0;
    const profit = e.mode === 'virtual' ? e.amount : 0;
    const policyMetadata = normalizePolicyMetadata(e.metadata);
    const effectiveRate = policyMetadata?.rate ?? 0;

    return {
      id: t.id,
      occurred_at: t.occurred_at,
      note: t.note,
      amount: t.amount,
      earned: bankBack,
      bankBack,
      peopleBack,
      profit,
      effectiveRate,
      sharePercent: t.cashback_share_percent,
      shareFixed: t.cashback_share_fixed,
      shopName: shop?.name,
      shopLogoUrl: shop?.image_url,
      categoryName: category?.name,
      categoryIcon: category?.icon,
      categoryLogoUrl: category?.image_url,
      personName: person?.name,
      policyMetadata,
    } as CashbackTransaction;
  }).filter((t: any): t is CashbackTransaction => t !== null);
}
