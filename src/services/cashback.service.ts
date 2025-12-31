'use server';

import { createClient } from '@/lib/supabase/server';
import { TransactionWithDetails } from '@/types/moneyflow.types';
import { CashbackCard, AccountSpendingStats, CashbackTransaction } from '@/types/cashback.types';
import { calculateBankCashback, parseCashbackConfig, getCashbackCycleRange, getCashbackCycleTag, formatIsoCycleTag, formatLegacyCycleTag, parseCycleTag } from '@/lib/cashback';
import { normalizePolicyMetadata } from '@/lib/cashback-policy';
import { mapUnifiedTransaction } from '@/lib/transaction-mapper';

/**
 * Ensures a cashback cycle exists for the given account and tag.
 * Returns the cycle ID.
 */

// DEBUG: Admin client creation
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function createAdminClient() {
  return createSupabaseClient(
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
    .maybeSingle();

  if (existing) return { id: existing.id, tag: cycleTag };

  if (fallbackTag && fallbackTag !== cycleTag) {
    const { data: fallback } = await supabase
      .from('cashback_cycles')
      .select('id')
      .eq('account_id', accountId)
      .eq('cycle_tag', fallbackTag)
      .maybeSingle();

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
      .maybeSingle();

    if (retry) return { id: retry.id, tag: cycleTag };
    throw error;
  }

  return { id: newCycle.id, tag: cycleTag };
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

  const { data: account } = await supabase
    .from('accounts')
    .select('id, type, cashback_config')
    .eq('id', transaction.account_id)
    .single();

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

  // Let's import the resolver
  const { resolveCashbackPolicy } = await import('./cashback/policy-resolver');

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
    metadata: policy.metadata,
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

  const previousCycleId = (existingEntries ?? [])
    .find((entry: any) => entry.account_id === account.id)?.cycle_id ?? null
  const staleEntries = (existingEntries ?? [])
    .filter((entry: any) => entry.account_id !== account.id)
  const staleCycleIds = Array.from(new Set(staleEntries.map((entry: any) => entry.cycle_id).filter(Boolean)))

  if (staleEntries.length > 0) {
    await supabase
      .from('cashback_entries')
      .delete()
      .eq('transaction_id', transaction.id)
      .neq('account_id', account.id);

    for (const oldCycleId of staleCycleIds) {
      await recomputeCashbackCycle(oldCycleId);
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
export async function recomputeCashbackCycle(cycleId: string) {
  const supabase = getCashbackClient();

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

  const config = parseCashbackConfig(account?.cashback_config, cycle.account_id);
  const maxBudget = config.maxAmount ?? 0;
  const minSpendTarget = config.minSpend ?? 0;

  // 2. Aggregate Spent Amount from Transactions
  // MF5.3.3 FIX: Include ONLY expense and debt (abs). Exclude transfer, repayment, lending.
  const { data: txns } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('account_id', cycle.account_id)
    .eq('persisted_cycle_tag', cycle.cycle_tag)
    .neq('status', 'void')
    .in('type', ['expense', 'debt']);

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

  const config = parseCashbackConfig(account.cashback_config, accountId);
  const cycleRange = getCashbackCycleRange(config, date);
  const tagDate = cycleRange?.end ?? date;
  const cycleTag = formatIsoCycleTag(tagDate);
  const legacyTag = formatLegacyCycleTag(tagDate);

  let cycle = (await supabase
    .from('cashback_cycles')
    .select('*')
    .eq('account_id', accountId)
    .eq('cycle_tag', cycleTag)
    .maybeSingle()).data ?? null;

  if (!cycle && legacyTag !== cycleTag) {
    cycle = (await supabase
      .from('cashback_cycles')
      .select('*')
      .eq('account_id', accountId)
      .eq('cycle_tag', legacyTag)
      .maybeSingle()).data ?? null;
  }

  console.log(`[getAccountSpendingStats] AID: ${accountId}, Tag: ${cycleTag}, Found: ${!!cycle}, Real: ${cycle?.real_awarded}`);

  let categoryName = undefined;
  if (categoryId) {
    const { data: cat } = await supabase.from('categories').select('name').eq('id', categoryId).single();
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

  const cycleMaxBudget = cycle?.max_budget ?? config.maxAmount ?? null;
  const minSpendTarget = cycle?.min_spend_target ?? config.minSpend ?? null;
  const currentSpend = cycle?.spent_amount ?? 0;
  const realAwarded = cycle?.real_awarded ?? 0;
  const virtualProfit = cycle?.virtual_profit ?? 0;
  const overflowLoss = cycle?.overflow_loss ?? 0;

  const sharedAmount = realAwarded;
  const earnedSoFar = realAwarded + virtualProfit;
  const netProfit = virtualProfit - overflowLoss;
  const remainingBudget = cycle && cycleMaxBudget !== null ? Math.max(0, cycleMaxBudget - earnedSoFar) : null;

  const policyMetadata = normalizePolicyMetadata(policy.metadata);
  const isMinSpendMet = cycle?.met_min_spend ?? (typeof minSpendTarget === 'number' ? currentSpend >= minSpendTarget : true);

  return {
    currentSpend,
    minSpend: minSpendTarget,
    maxCashback: cycleMaxBudget,
    rate: policy.rate,
    maxReward: policy.maxReward,
    earnedSoFar,
    sharedAmount,
    potentialProfit: virtualProfit,
    netProfit,
    remainingBudget,
    potentialRate: policy.rate,
    matchReason: policyMetadata?.policySource,
    policyMetadata: policyMetadata ?? undefined,
    is_min_spend_met: isMinSpendMet,
    cycle: cycleRange ? {
      label: cycleTag,
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

  let query = supabase.from('accounts').select('id, name, type, cashback_config, image_url').eq('type', 'credit_card');
  if (accountIds && accountIds.length > 0) {
    query = query.in('id', accountIds);
  }
  const { data: accounts } = await query;
  if (!accounts) return [];

  const results: CashbackCard[] = [];

  for (const acc of accounts) {
    if (!acc.cashback_config) continue;
    const config = parseCashbackConfig(acc.cashback_config, acc.id);
    const cycleRange = getCashbackCycleRange(config, date);
    const tagDate = cycleRange?.end ?? date;
    const cycleTag = formatIsoCycleTag(tagDate);
    const legacyTag = formatLegacyCycleTag(tagDate);

    let cycle = (await supabase.from('cashback_cycles')
      .select('*')
      .eq('account_id', acc.id)
      .eq('cycle_tag', cycleTag)
      .maybeSingle()).data ?? null;

    if (!cycle && legacyTag !== cycleTag) {
      cycle = (await supabase.from('cashback_cycles')
        .select('*')
        .eq('account_id', acc.id)
        .eq('cycle_tag', legacyTag)
        .maybeSingle()).data ?? null;
    }

    const currentSpend = cycle?.spent_amount ?? 0;
    const realAwarded = cycle?.real_awarded ?? 0;
    const virtualProfit = cycle?.virtual_profit ?? 0;
    const earnedSoFar = realAwarded + virtualProfit;
    const minSpend = cycle?.min_spend_target ?? config.minSpend ?? null;
    const maxCashback = cycle?.max_budget ?? config.maxAmount ?? null;
    const overflowLoss = cycle?.overflow_loss ?? 0;

    // MF5.3.3 FIX: Budget Left must come from cycle if exists, else fallback to config.maxAmount
    const remainingBudget = maxCashback !== null ? Math.max(0, maxCashback - earnedSoFar) : null;

    // Fix: Progress should track Budget Usage (Cap), not Min Spend
    const progress = (maxCashback !== null && maxCashback > 0)
      ? Math.min(100, (earnedSoFar / maxCashback) * 100)
      : 0;

    const metMinSpend = cycle?.met_min_spend ?? (typeof minSpend === 'number' ? currentSpend >= minSpend : true);
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
      const { data: entries, error: entriesError } = await supabase
        .from('cashback_entries')
        .select(`
          mode, amount, metadata, transaction_id,
          transaction:transactions!inner (
            id, occurred_at, note, amount, account_id,
            cashback_share_percent, cashback_share_fixed,
            category:categories(name, icon),
            shop:shops(name, image_url),
            person:profiles!transactions_person_id_fkey(name)
          )
        `)
        .eq('cycle_id', cycle.id)
        .eq('transaction.account_id', acc.id);

      if (entriesError) {
        console.error('[getCashbackProgress] Failed to load entries:', entriesError);
      }

      if (entries && entries.length > 0) {
        transactions = entries.map((e: any) => {
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
        }).filter((t: any): t is CashbackTransaction => t !== null)
          .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
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
      rate: policy.rate
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
    .maybeSingle();

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
    .single();

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
      .maybeSingle()).data ?? null;

    if (!cycle && legacyCycleTag !== cycleTag) {
      cycle = (await supabase
        .from('cashback_cycles')
        .select('spent_amount')
        .eq('account_id', accountId)
        .eq('cycle_tag', legacyCycleTag)
        .maybeSingle()).data ?? null;
    }

    spentSoFar = cycle?.spent_amount ?? 0;
  }

  // 3. Resolve Policy
  const { resolveCashbackPolicy } = await import('./cashback/policy-resolver');

  // Fetch Category Name if ID provided (for pretty reason text)
  let categoryName: string | undefined = undefined;
  if (categoryId) {
    const { data: cat } = await supabase.from('categories').select('name').eq('id', categoryId).single();
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
  // DEBUG: Use Admin Client
  const supabase = createAdminClient();

  // 1. Get Account
  const { data: account } = await supabase.from('accounts').select('id, name, image_url, cashback_config').eq('id', accountId).single();
  if (!account) return null;

  console.log(`[getAllCashbackHistory] Raw Config for ${accountId}:`, JSON.stringify(account.cashback_config));
  const config = parseCashbackConfig(account.cashback_config, accountId);
  console.log(`[getAllCashbackHistory] Parsed Config: rate=${config.rate}, maxAmount=${config.maxAmount}`);

  // 2. Aggregate ALL stats from cycles
  const { data: cycles } = await supabase
    .from('cashback_cycles')
    .select('*')
    .eq('account_id', accountId);

  console.log(`[getAllCashbackHistory] Fetched ${cycles?.length} cycles for aggregation.`);
  if (cycles?.length === 0) console.log('[getAllCashbackHistory] WARNING: No cycles found despite transactions existing?');

  const totalEarned = (cycles ?? []).reduce((sum, c) => sum + (c.real_awarded ?? 0) + (c.virtual_profit ?? 0), 0);
  const totalShared = (cycles ?? []).reduce((sum, c) => sum + (c.real_awarded ?? 0), 0);
  const totalNet = (cycles ?? []).reduce((sum, c) => sum + (c.virtual_profit ?? 0) - (c.overflow_loss ?? 0), 0);
  const sumMaxBudget = (cycles ?? []).reduce((sum, c) => sum + (c.max_budget ?? 0), 0);

  // 3. Fetch ALL entries
  let transactions: CashbackTransaction[] = [];
    // Use direct relations instead of legacy line items to fix missing relation error
  const { data: entries, error: entriesError } = await supabase
    .from('cashback_entries')
    .select(`
          mode, amount, metadata, transaction_id, cycle_id,
          cycle:cashback_cycles(cycle_tag),
          transaction:transactions!inner (
            id, occurred_at, note, amount, account_id,
            cashback_share_percent, cashback_share_fixed,
            category:categories(name, icon),
            shop:shops(name, image_url),
            person:profiles!transactions_person_id_fkey(name)
          )
        `)
    .eq('transaction.account_id', accountId)


  if (entriesError) {
    console.error('[getAllCashbackHistory] Failed to load entries:', entriesError);
  }

  if (entries && entries.length > 0) {
    console.log(`[getAllCashbackHistory] Found ${entries.length} entries for account ${accountId}`);
    transactions = entries.map((e: any) => {
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
        cycleTag: (e.cycle as any)?.cycle_tag
      } as CashbackTransaction;
    }).filter((t: any): t is CashbackTransaction => t !== null)
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  } else {
    console.log(`[getAllCashbackHistory] No entries found for account ${accountId}`);
  }

  // Construct a "Virtual" Card
  return {
    accountId: account.id,
    accountName: account.name,
    accountLogoUrl: account.image_url,
    cycleLabel: 'ALL TIME',
    cycleStart: null,
    cycleEnd: null,
    cycleType: null,
    progress: ((totalEarned / (sumMaxBudget || 1)) * 100),
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
    rate: 0
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

  const { data: txns, error: txError } = await query;

  if (txError || !txns) {
    console.error('[recomputeAccountCashback] Failed to fetch transactions:', txError);
    return;
  }

  console.log(`[recomputeAccountCashback] Re-processing ${txns.length} transactions for account ${accountId} (monthsBack: ${monthsBack ?? 'ALL'})`);

  // 2. Re-process each transaction
  // Sequential processing to ensure cycle totals are updated correctly
  for (const rawTxn of txns) {
    const txn = mapUnifiedTransaction(rawTxn, accountId);
    // Force clear the tag to trigger recalculation in upsertTransactionCashback
    const cleanTxn = { ...txn, persisted_cycle_tag: null };
    await upsertTransactionCashback(cleanTxn);
  }

  console.log(`[recomputeAccountCashback] Completed re-processing for account ${accountId}`);
}

export async function getCashbackCycleOptions(accountId: string, limit: number = 12) {
  // DEBUG: Use Admin Client to bypass RLS
  const supabase = createAdminClient();
  const { data: cycles } = await supabase
    .from('cashback_cycles')
    .select('cycle_tag')
    .eq('account_id', accountId)
    .limit(48); // Increased limit to show more past cycles

  const { data: account } = await supabase
    .from('accounts')
    .select('cashback_config')
    .eq('id', accountId)
    .single();

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
    if (!tag) return 0;
    const parsed = parseCycleTag(tag);
    if (!parsed) return 0;
    return parsed.year * 100 + parsed.month;
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

        const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = `${fmt(start)} - ${fmt(end)}`;
      } else {
        const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
        label = fmt.format(new Date(year, monthIdx, 1));
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


