'use server';

import { createClient } from '@/lib/supabase/server';
import { format, setDate, subMonths } from 'date-fns';
import { Database, Json } from '@/types/database.types';
import { syncTransactionToSheet } from '@/services/sheet.service';
import { REFUND_PENDING_ACCOUNT_ID } from '@/constants/refunds';
import { loadShopInfo, ShopRow, mapTransactionRow, parseMetadata, extractLineMetadata, TransactionRow as MapperTransactionRow } from '@/lib/transaction-mapper';
import { TransactionWithDetails } from '@/types/moneyflow.types';

export type CreateTransactionInput = {
  occurred_at: string;
  note: string;
  type: 'expense' | 'income' | 'debt' | 'transfer' | 'repayment';
  source_account_id: string;
  person_id?: string | null;
  destination_account_id?: string | null;
  category_id?: string | null;
  debt_account_id?: string | null;
  amount: number;
  tag: string;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  discount_category_id?: string | null;
  shop_id?: string | null;
};

async function resolveSystemCategory(
  supabase: ReturnType<typeof createClient>,
  name: string,
  type: 'income' | 'expense'
): Promise<string | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('name', name)
    .eq('type', type)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching system category "${name}":`, error);
    return null;
  }

  return (data as { id: string } | null)?.id ?? null;
}

async function resolveDiscountCategoryId(
  supabase: ReturnType<typeof createClient>,
  overrideCategoryId?: string
): Promise<string | null> {
  if (overrideCategoryId) {
    return overrideCategoryId;
  }

  // Chain of fallbacks
  const namesToTry = ['Chiết khấu / Quà tặng', 'Discount Given', 'Chi phí khác'];
  for (const name of namesToTry) {
    const id = await resolveSystemCategory(supabase, name, 'expense');
    if (id) return id;
  }

  // Final fallback if no named category found
  const { data: fallback, error: fallbackError } = await supabase
    .from('categories')
    .select('id')
    .eq('type', 'expense')
    .limit(1);

  if (fallbackError) {
    console.error('Error fetching any expense category for fallback:', fallbackError);
    return null;
  }

  const fallbackRows = (fallback ?? []) as { id: string }[];
  return fallbackRows[0]?.id ?? null;
}


function mergeMetadata(value: Json | null, extra: Record<string, unknown>): Json {
  const parsed = parseMetadata(value);
  const next = {
    ...parsed,
    ...extra,
  };
  return next as Json;
}

async function resolveCurrentUserId(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? '917455ba-16c0-42f9-9cea-264f81a3db66';
}

async function buildTransactionLines(
  supabase: ReturnType<typeof createClient>,
  input: CreateTransactionInput
) {
  const lines: any[] = [];
  const tag = input.tag;

  if (input.type === 'expense' && input.category_id) {
    lines.push({
      account_id: input.source_account_id,
      amount: -Math.abs(input.amount),
      type: 'credit',
    });
    lines.push({
      category_id: input.category_id,
      amount: Math.abs(input.amount),
      type: 'debit',
    });
  } else if (input.type === 'income' && input.category_id) {
    lines.push({
      account_id: input.source_account_id,
      amount: Math.abs(input.amount),
      type: 'debit',
    });
    lines.push({
      category_id: input.category_id,
      amount: -Math.abs(input.amount),
      type: 'credit',
    });
  } else if (input.type === 'repayment' && input.debt_account_id) {
    const repaymentCategoryId = await resolveSystemCategory(supabase, 'Repayment', 'income');
    if (!repaymentCategoryId) {
      console.error('FATAL: "Repayment" system category not found.');
    }

    lines.push({
      account_id: input.source_account_id,
      amount: Math.abs(input.amount),
      type: 'debit',
      category_id: repaymentCategoryId,
    });
    lines.push({
      account_id: input.debt_account_id,
      amount: -Math.abs(input.amount),
      type: 'credit',
      person_id: input.person_id ?? null,
    });

  } else if ((input.type === 'debt' || input.type === 'transfer') && input.debt_account_id) {
    const originalAmount = Math.abs(input.amount);
    const sharePercentEntry = Math.max(0, Number(input.cashback_share_percent ?? 0));
    const sharePercentCapped = Math.min(100, sharePercentEntry);
    const sharePercentRate = sharePercentCapped / 100;
    const shareFixed = Math.max(0, Number(input.cashback_share_fixed ?? 0));
    const percentContribution = sharePercentRate * originalAmount;
    const rawCashback = percentContribution + shareFixed;
    const cashbackGiven = Math.min(originalAmount, Math.max(0, rawCashback));
    const debtAmount = Math.max(0, originalAmount - cashbackGiven);

    lines.push({
      account_id: input.source_account_id,
      amount: -originalAmount,
      type: 'credit',
    });
    lines.push({
      account_id: input.debt_account_id,
      amount: debtAmount,
      type: 'debit',
      original_amount: originalAmount,
      cashback_share_percent: sharePercentRate,
      cashback_share_fixed: shareFixed,
      person_id: input.person_id ?? null,
    });

    if (cashbackGiven > 0) {
      const discountCategoryId = await resolveDiscountCategoryId(
        supabase,
        input.discount_category_id || undefined
      );
      if (!discountCategoryId) {
        console.error('No fallback category found for discount line');
        return null;
      }
      lines.push({
        category_id: discountCategoryId,
        amount: cashbackGiven,
        type: 'debit',
      });
    }
  } else {
    console.error('Invalid transaction type or missing data');
    return null;
  }

  return { lines, tag };
}

async function calculatePersistedCycleTag(
  supabase: ReturnType<typeof createClient>,
  accountId: string,
  transactionDate: Date
): Promise<string | null> {
  const { data, error } = await supabase
    .from('accounts')
    .select('type, cashback_config')
    .eq('id', accountId)
    .single();

  const account = data as { type: string; cashback_config: Json } | null;

  if (error || !account || account.type !== 'credit_card') {
    return null;
  }

  const config = account.cashback_config as { statement_day?: number } | null;
  if (!config?.statement_day) {
    return null;
  }

  const statementDay = config.statement_day;
  const transactionDay = transactionDate.getDate();

  let cycleStartDate: Date;
  if (transactionDay >= statementDay) {
    cycleStartDate = setDate(transactionDate, statementDay);
  } else {
    const previousMonth = subMonths(transactionDate, 1);
    cycleStartDate = setDate(previousMonth, statementDay);
  }

  return format(cycleStartDate, 'yyyy-MM-dd');
}

function buildSheetPayload(
  txn: { id: string; occurred_at: string; note?: string | null; tag?: string | null },
  line:
    | {
      amount: number
      original_amount?: number | null
      cashback_share_percent?: number | null
      cashback_share_fixed?: number | null
      metadata?: Json | null
    }
    | null
) {
  if (!line) return null;
  const meta = (line.metadata as Record<string, unknown> | null) ?? null;
  const cashbackAmount =
    typeof meta?.cashback_share_amount === 'number' ? meta.cashback_share_amount : undefined;

  return {
    id: txn.id,
    occurred_at: txn.occurred_at,
    note: txn.note ?? undefined,
    tag: txn.tag ?? undefined,
    amount: line.amount,
    original_amount:
      typeof line.original_amount === 'number' ? line.original_amount : Math.abs(line.amount),
    cashback_share_percent:
      typeof line.cashback_share_percent === 'number' ? line.cashback_share_percent : undefined,
    cashback_share_fixed:
      typeof line.cashback_share_fixed === 'number' ? line.cashback_share_fixed : undefined,
    cashback_share_amount: cashbackAmount,
  };
}

async function syncRepaymentTransaction(
  supabase: ReturnType<typeof createClient>,
  transactionId: string,
  input: CreateTransactionInput,
  lines: any[],
  shopInfo: ShopRow | null
) {
  try {
    const { data: destAccount } = await supabase
      .from('accounts')
      .select('name')
      .eq('id', input.debt_account_id ?? '')
      .single();

    for (const line of lines) {
      if (!line.person_id) continue;

      const originalAmount =
        typeof line.original_amount === 'number' ? line.original_amount : line.amount;
      const cashbackPercent =
        typeof line.cashback_share_percent === 'number' ? line.cashback_share_percent : undefined;
      const cashbackFixed =
        typeof line.cashback_share_fixed === 'number' ? line.cashback_share_fixed : undefined;

      void syncTransactionToSheet(
        line.person_id,
        {
          id: transactionId,
          occurred_at: input.occurred_at,
          note: input.note,
          tag: input.tag,
          shop_name: shopInfo?.name ?? (destAccount as any)?.name ?? null,
          amount: line.amount,
          original_amount: originalAmount,
          cashback_share_percent: cashbackPercent,
          cashback_share_fixed: cashbackFixed,
        },
        'create'
      ).then(() => {
        console.log(`[Sheet Sync] Triggered for Repayment to Person ${line.person_id}`);
      }).catch(err => {
        console.error('Sheet Sync Error (Repayment):', err);
      });
    }
  } catch (error) {
    console.error("Failed to sync repayment transaction:", error);
  }
}

export async function createTransaction(input: CreateTransactionInput): Promise<boolean> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || '917455ba-16c0-42f9-9cea-264f81a3db66';

  const built = await buildTransactionLines(supabase, input);
  if (!built) {
    return false;
  }
  const { tag } = built;

  const persistedCycleTag = await calculatePersistedCycleTag(
    supabase,
    input.source_account_id,
    new Date(input.occurred_at)
  );

  // Single Table Insertion Logic
  const originalAmount = Math.abs(input.amount);
  let finalAmount = originalAmount;
  let targetAccountId = input.destination_account_id ?? input.debt_account_id ?? null;
  let personId = input.person_id ?? null;
  let categoryId = input.category_id ?? null;

  // Debt Logic specific
  let sharePercent = null;
  let shareFixed = null;

  if (input.type === 'debt') {
    const sharePercentEntry = Math.max(0, Number(input.cashback_share_percent ?? 0));
    const sharePercentCapped = Math.min(100, sharePercentEntry);
    const sharePercentRate = sharePercentCapped / 100;
    const shareFixedVal = Math.max(0, Number(input.cashback_share_fixed ?? 0));
    const percentContribution = sharePercentRate * originalAmount;
    const rawCashback = percentContribution + shareFixedVal;
    const cashbackGiven = Math.min(originalAmount, Math.max(0, rawCashback));

    finalAmount = Math.max(0, originalAmount - cashbackGiven);
    sharePercent = sharePercentRate > 0 ? sharePercentRate : null;
    shareFixed = shareFixedVal > 0 ? shareFixedVal : null;
  }

  // Insert into transactions table directly
  const { data: txn, error: txnError } = await (supabase
    .from('transactions')
    .insert as any)({
      occurred_at: input.occurred_at,
      note: input.note,
      status: 'posted',
      tag: tag,
      persisted_cycle_tag: persistedCycleTag,
      shop_id: input.shop_id ?? null,
      created_by: userId,
      type: input.type,
      amount: finalAmount,
      account_id: input.source_account_id,
      target_account_id: targetAccountId,
      category_id: categoryId,
      person_id: personId,
      cashback_share_percent: sharePercent,
      cashback_share_fixed: shareFixed,
    })
    .select()
    .single();

  if (txnError || !txn) {
    console.error('Error creating transaction:', txnError);
    return false;
  }

  const shopInfo = await loadShopInfo(supabase, input.shop_id)

  // Sheet Sync Logic
  if (input.type === 'repayment' && personId && targetAccountId) {
    const { data: destAccount } = await supabase
      .from('accounts')
      .select('name')
      .eq('id', targetAccountId)
      .single();

    void syncTransactionToSheet(
      personId,
      {
        id: txn.id,
        occurred_at: input.occurred_at,
        note: input.note,
        tag: input.tag,
        shop_name: shopInfo?.name ?? (destAccount as any)?.name ?? null,
        amount: finalAmount, // Repayment amount
        original_amount: finalAmount,
        cashback_share_percent: undefined,
        cashback_share_fixed: undefined,
      },
      'create'
    ).then(() => {
      console.log(`[Sheet Sync] Triggered for Repayment to Person ${personId}`);
    }).catch(err => {
      console.error('Sheet Sync Error (Repayment):', err);
    });

  } else if ((input.type === 'debt' || input.type === 'transfer') && personId) {
    // Standard debt sync
    void syncTransactionToSheet(
      personId,
      {
        id: txn.id,
        occurred_at: input.occurred_at,
        note: input.note,
        tag,
        shop_name: shopInfo?.name ?? null,
        original_amount: originalAmount,
        cashback_share_percent: sharePercent,
        cashback_share_fixed: shareFixed,
        amount: finalAmount,
      },
      'create'
    )
      .then(() => {
        console.log(`[Sheet Sync] Triggered for Person ${personId}`);
      })
      .catch(err => {
        console.error('Sheet Sync Error (Background):', err);
      });
  }

  return true;
}

export async function voidTransactionAction(id: string): Promise<boolean> {
  const supabase = createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('transactions')
    .select(
      `
        id,
        occurred_at,
        note,
        tag,
        account_id,
        target_account_id,
        person_id
      `
    )
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error('Failed to load transaction for void:', fetchError);
    return false;
  }

  // GUARD: Check for child transactions before voiding
  // 1. Check linked_transaction_id column (GD3 -> GD2 link)
  const { data: linkedChildren } = await supabase
    .from('transactions')
    .select('id, status')
    .neq('status', 'void')
    .eq('linked_transaction_id', id)
    .limit(1);

  if (linkedChildren && linkedChildren.length > 0) {
    console.error('Cannot void: has child via linked_transaction_id', (linkedChildren as any)[0].id);
    throw new Error("Không thể hủy giao dịch này vì đã có giao dịch liên quan (VD: Đã xác nhận tiền về). Vui lòng hủy giao dịch nối tiếp trước.");
  }

  // 2. Check metadata fields (original_transaction_id, pending_refund_id)
  const { data: metaChildren } = await supabase
    .from('transactions')
    .select('id, status')
    .neq('status', 'void')
    .or(`metadata.cs.{"original_transaction_id":"${id}"},metadata.cs.{"pending_refund_id":"${id}"}`)
    .limit(1);

  if (metaChildren && metaChildren.length > 0) {
    console.error('Cannot void: has child via metadata', (metaChildren as any)[0].id);
    throw new Error("Không thể hủy giao dịch này vì đã có giao dịch liên quan (VD: Đã xác nhận tiền về). Vui lòng hủy giao dịch nối tiếp trước.");
  }

  // ROLLBACK LOGIC (Refund Chain)
  // Fetch full transaction with metadata for rollback
  const { data: fullTxn } = await supabase
    .from('transactions')
    .select('metadata')
    .eq('id', id)
    .single();

  const meta = parseMetadata((fullTxn as any)?.metadata);

  // Case A: Voiding Confirmation (GD3) -> Revert Pending Refund (GD2) to 'pending'
  // AND revert GD1's refund_status to 'waiting_refund' (no longer received)
  if (meta?.is_refund_confirmation && meta?.pending_refund_id) {
    await (supabase.from('transactions').update as any)({ status: 'pending' })
      .eq('id', meta.pending_refund_id as string);
    console.log('[Void Rollback] GD3 voided -> GD2 set to pending:', meta.pending_refund_id);

    // Also update GD1's metadata to reflect waiting status
    if (meta?.original_transaction_id) {
      const { data: gd1 } = await supabase
        .from('transactions')
        .select('metadata')
        .eq('id', meta.original_transaction_id as string)
        .single();

      if (gd1) {
        const gd1Meta = parseMetadata((gd1 as any)?.metadata) || {};
        gd1Meta.refund_status = 'waiting_refund'; // Change from 'refunded' to 'waiting'
        delete gd1Meta.refunded_amount; // Clear the received amount

        await (supabase.from('transactions').update as any)({
          status: 'posted', // Keep as posted but with waiting_refund metadata
          metadata: gd1Meta
        }).eq('id', meta.original_transaction_id as string);
        console.log('[Void Rollback] GD3 voided -> GD1 refund_status set to waiting_refund:', meta.original_transaction_id);
      }
    }
  }

  // Case B: Voiding Refund Request (GD2) -> Revert Original (GD1) to 'posted' & Clear Metadata
  if (meta?.original_transaction_id && !meta?.is_refund_confirmation) {
    const { data: gd1 } = await supabase
      .from('transactions')
      .select('metadata')
      .eq('id', meta.original_transaction_id as string)
      .single();

    if (gd1) {
      const gd1Meta = parseMetadata((gd1 as any)?.metadata) || {};
      // Clear refund-related fields
      delete gd1Meta.refund_status;
      delete gd1Meta.refunded_amount;
      delete gd1Meta.has_refund_request;
      delete gd1Meta.refund_request_id;

      await (supabase.from('transactions').update as any)({
        status: 'posted',
        metadata: gd1Meta
      }).eq('id', meta.original_transaction_id as string);
      console.log('[Void Rollback] GD2 voided -> GD1 set to posted:', meta.original_transaction_id);
    }
  }

  // Now safe to void
  const { error: updateError } = await (supabase.from('transactions').update as any)({ status: 'void' }).eq('id', id);

  if (updateError) {
    console.error('Failed to void transaction:', updateError);
    return false;
  }

  // Try to remove from sheet if it has person_id
  if ((existing as any).person_id) {
    const personId = (existing as any).person_id;
    const payload = {
      id: (existing as any).id,
      occurred_at: (existing as any).occurred_at,
      amount: 0 // Amount 0 for delete or handling in sync service implies check logic
    };
    // Actually buildSheetPayload usually needs line info.
    // But since lines might be gone or complex to fetch in single table (they ARE the txn now),
    // We can try to construct enough info.
    // However, for single table, we don't have separate lines.
    // WE should just pass what we have.

    // NOTE: The previous logic relied on transaction_lines join which was failing.
    // We will attempt to sync deletion but purely based on ID.
    void syncTransactionToSheet(personId, payload as any, 'delete').catch(err => {
      console.error('Sheet Sync Error (Void):', err);
    });
  }

  return true;
}

export async function confirmRefundAction(
  pendingTransactionId: string,
  targetAccountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { confirmRefund } = await import('@/services/transaction.service');
    const result = await confirmRefund(pendingTransactionId, targetAccountId);
    return { success: result.success, error: result.error };
  } catch (error: any) {
    console.error('Confirm Refund Action Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getOriginalAccount(refundRequestId: string): Promise<string | null> {
  const supabase = createClient();
  const { data: refundTxn } = await supabase.from('transactions').select('metadata').eq('id', refundRequestId).single();

  if (!refundTxn) return null;
  const meta: any = parseMetadata((refundTxn as any).metadata);
  const originalId = meta?.original_transaction_id || meta?.linked_transaction_id;

  if (!originalId) return null;

  // Try to get account_id directly from header first
  const { data: originalTxn } = await supabase
    .from('transactions')
    .select(`
      account_id,
      transaction_lines (
        account_id,
        type,
        amount
      )
    `)
    .eq('id', originalId)
    .single();

  if (!originalTxn) return null;
  if ((originalTxn as any).account_id) return (originalTxn as any).account_id;

  const lines = ((originalTxn as any).transaction_lines as any[]) || [];
  // For expense, source is usually the negative amount line (credit or just negative?)
  // In `createTransaction`: expense input has source_account_id -> lines pushed type='credit', amount = -abs(amount)
  const sourceLine = lines.find(l => l.amount < 0 && l.account_id);

  return sourceLine?.account_id ?? null;
}

export async function restoreTransaction(id: string): Promise<boolean> {
  const supabase = createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('transactions')
    .select(
      `
        id,
        occurred_at,
        note,
        tag,
        transaction_lines (
            amount,
            original_amount,
            cashback_share_percent,
            cashback_share_fixed,
            metadata,
            person_id
        )
        `
    )
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error('Failed to load transaction for restore:', fetchError);
    return false;
  }

  const { error: updateError } = await (supabase
    .from('transactions')
    .update as any)({ status: 'posted' })
    .eq('id', id);

  if (updateError) {
    console.error('Failed to restore transaction:', updateError);
    return false;
  }

  const lines = ((existing as any).transaction_lines as any[]) ?? [];

  for (const line of lines) {
    if (!line?.person_id) continue;
    const payload = buildSheetPayload(existing as any, line);
    if (!payload) continue;
    void syncTransactionToSheet(line.person_id, payload, 'create').catch(err => {
      console.error('Sheet Sync Error (Restore):', err);
    });
  }

  return true;
}

export async function updateTransaction(id: string, input: CreateTransactionInput): Promise<boolean> {
  const supabase = createClient();

  // GUARD: Block editing if this transaction has linked children (Void/Refund)
  // 1. Check linked_transaction_id column (GD3 -> GD2 link)
  const { data: linkedChildren, error: linkedError } = await supabase
    .from('transactions')
    .select('id, status')
    .neq('status', 'void')
    .eq('linked_transaction_id', id)
    .limit(1);

  if (linkedError) {
    console.error('Failed to check linked transactions:', linkedError);
    return false;
  }

  if (linkedChildren && linkedChildren.length > 0) {
    throw new Error('Cannot edit this transaction because it has linked Void/Refund transactions. Please delete the linked transactions first.');
  }

  // 2. Check metadata fields (original_transaction_id, pending_refund_id)
  const { data: metaChildren, error: metaError } = await supabase
    .from('transactions')
    .select('id, status')
    .neq('status', 'void')
    .or(`metadata.cs.{"original_transaction_id":"${id}"},metadata.cs.{"pending_refund_id":"${id}"}`)
    .limit(1);

  if (metaError) {
    console.error('Failed to check metadata-linked transactions:', metaError);
    return false;
  }

  if (metaChildren && metaChildren.length > 0) {
    throw new Error('Cannot edit this transaction because it has linked Void/Refund transactions. Please delete the linked transactions first.');
  }

  // Fetch existing transaction data (single-table: person_id is directly on transactions)
  const { data: existingData, error: existingError } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      note,
      tag,
      person_id,
      amount,
      cashback_share_percent,
      cashback_share_fixed
    `)
    .eq('id', id)
    .maybeSingle();

  if (existingError || !existingData) {
    console.error('Failed to fetch transaction before update:', existingError);
    return false;
  }

  const built = await buildTransactionLines(supabase, input);
  if (!built) {
    return false;
  }

  const { lines, tag } = built;
  const shopInfo = await loadShopInfo(supabase, input.shop_id);

  const persistedCycleTag = await calculatePersistedCycleTag(
    supabase,
    input.source_account_id,
    new Date(input.occurred_at)
  );

  // Calculate final amounts for single-table storage
  const originalAmount = Math.abs(input.amount);
  const sharePercentEntry = Math.max(0, Number(input.cashback_share_percent ?? 0));
  const sharePercentCapped = Math.min(100, sharePercentEntry);
  const sharePercentRate = sharePercentCapped / 100;
  const shareFixed = Math.max(0, Number(input.cashback_share_fixed ?? 0));
  const percentContribution = sharePercentRate * originalAmount;
  const rawCashback = percentContribution + shareFixed;
  const cashbackGiven = Math.min(originalAmount, Math.max(0, rawCashback));
  const finalAmount = input.type === 'debt'
    ? (originalAmount - cashbackGiven)  // Debt: final = amount - cashback
    : originalAmount;

  // Update transaction header with all fields (single-table architecture)
  const { error: headerError } = await (supabase
    .from('transactions')
    .update as any)({
      occurred_at: input.occurred_at,
      note: input.note,
      tag: tag,
      status: 'posted',
      type: input.type,
      amount: finalAmount,
      account_id: input.source_account_id,
      target_account_id: input.destination_account_id ?? input.debt_account_id ?? null,
      category_id: input.category_id ?? null,
      person_id: input.person_id ?? null,
      cashback_share_percent: input.cashback_share_percent ?? null,
      cashback_share_fixed: input.cashback_share_fixed ?? null,
      persisted_cycle_tag: persistedCycleTag,
      shop_id: input.shop_id ?? null,
    })
    .eq('id', id);

  if (headerError) {
    console.error('Failed to update transaction header:', headerError);
    return false;
  }

  // SHEET SYNC: Delete old entry if person existed
  const oldPersonId = (existingData as any).person_id;
  if (oldPersonId) {
    const deletePayload = {
      id: (existingData as any).id,
      occurred_at: (existingData as any).occurred_at,
      note: (existingData as any).note,
      tag: (existingData as any).tag,
      amount: (existingData as any).amount ?? 0,
    };
    void syncTransactionToSheet(oldPersonId, deletePayload as any, 'delete').catch(err => {
      console.error('Sheet Sync Error (Update/Delete):', err);
    });
  }

  // SHEET SYNC: Create new entry if person exists
  const newPersonId = input.person_id;
  if (newPersonId) {
    const syncPayload = {
      id,
      occurred_at: input.occurred_at,
      note: input.note,
      tag,
      shop_name: shopInfo?.name ?? null,
      amount: finalAmount,
      original_amount: originalAmount,
      cashback_share_percent: sharePercentRate,
      cashback_share_fixed: shareFixed,
      type: input.type === 'repayment' ? 'In' : 'Debt',
    };
    void syncTransactionToSheet(newPersonId, syncPayload as any, 'create').catch(err => {
      console.error('Sheet Sync Error (Update/Create):', err);
    });
  }

  return true;
}

type RefundTransactionLine = {
  id?: string
  amount: number
  type: 'debit' | 'credit'
  account_id?: string | null
  category_id?: string | null
  metadata?: Json | null
  categories?: {
    name?: string | null
  } | null
}

export async function requestRefund(
  transactionId: string,
  refundAmount: number,
  partial: boolean
): Promise<{ success: boolean; refundTransactionId?: string; error?: string }> {
  console.log('Requesting refund for:', transactionId);
  if (!transactionId) {
    return { success: false, error: 'Thiếu thông tin giao dịch cần hoàn tiền.' }
  }

  const supabase = createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('transactions')
    .select(`
        id,
        note,
        tag,
        shop_id,
        transaction_lines (
            id,
            amount,
            type,
            account_id,
            category_id,
            metadata,
            categories ( name )
        )
        `)
    .eq('id', transactionId)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error('Failed to load transaction for refund request:', fetchError)
    return { success: false, error: 'Không tìm thấy giao dịch hoặc đã xảy ra lỗi.' }
  }

  const existingMetadata = extractLineMetadata((existing as any).transaction_lines as Array<{ metadata?: Json | null }>)

  const lines = ((existing as any).transaction_lines as RefundTransactionLine[]) ?? []
  const categoryLine = lines.find(line => line?.category_id)
  if (!categoryLine) {
    return { success: false, error: 'Giao dịch không có danh mục phí để hoàn.' }
  }

  const maxAmount = Math.abs(categoryLine.amount ?? 0)
  if (maxAmount <= 0) {
    return { success: false, error: 'Không thể hoàn tiền cho giao dịch giá trị 0.' }
  }

  const requestedAmount = Number.isFinite(refundAmount) ? Math.abs(refundAmount) : maxAmount
  const safeAmount = Math.min(Math.max(requestedAmount, 0), maxAmount)
  if (safeAmount <= 0) {
    return { success: false, error: 'Số tiền hoàn không hợp lệ.' }
  }

  const userId = await resolveCurrentUserId(supabase)
  const requestNote = `Refund Request for ${(existing as any).note ?? transactionId}`
  const lineMetadata = {
    refund_status: 'requested',
    linked_transaction_id: transactionId,
    refund_amount: safeAmount,
    partial,
    original_note: (existing as any).note ?? null,
    original_category_id: categoryLine.category_id,
    original_category_name: categoryLine.categories?.name ?? null,
  }

  const refundCategoryId = await resolveSystemCategory(supabase, 'Refund', 'expense');
  if (!refundCategoryId) {
    console.error('FATAL: "Refund" system category not found.');
    return { success: false, error: 'Hệ thống chưa cấu hình danh mục Hoàn tiền.' }
  }

  // Single-table insert for Refund Request
  const { data: requestTxn, error: createError } = await (supabase
    .from('transactions')
    .insert as any)({
      occurred_at: new Date().toISOString(),
      note: requestNote,
      status: 'posted',
      tag: (existing as any).tag,
      created_by: userId,
      shop_id: (existing as any).shop_id ?? null,
      account_id: REFUND_PENDING_ACCOUNT_ID,
      category_id: refundCategoryId,
      amount: safeAmount,
      type: 'expense',
      metadata: lineMetadata
    })
    .select()
    .single()

  if (createError || !requestTxn) {
    console.error('Failed to insert refund request transaction:', createError)
    return { success: false, error: 'Không thể tạo giao dịch yêu cầu hoàn tiền.' }
  }

  // No lines to insert for single-table schema

  try {
    // Update original transaction metadata
    const mergedOriginalMeta = mergeMetadata(existingMetadata, {
      refund_request_id: requestTxn.id,
      refund_requested_at: new Date().toISOString(),
      has_refund_request: true,
    })

    // Update directly on transactions table
    await (supabase.from('transactions').update as any)({ metadata: mergedOriginalMeta }).eq(
      'id',
      transactionId
    )
  } catch (err) {
    console.error('Failed to tag original transaction with refund metadata:', err)
  }

  return { success: true, refundTransactionId: requestTxn.id }
}

export async function confirmRefund(
  pendingTransactionId: string,
  targetAccountId: string
): Promise<{ success: boolean; confirmTransactionId?: string; error?: string }> {
  if (!pendingTransactionId || !targetAccountId) {
    return { success: false, error: 'Thiếu thông tin xác nhận hoàn tiền.' }
  }

  const supabase = createClient()
  const { data: pending, error: pendingError } = await supabase
    .from('transactions')
    .select(`
        id,
        note,
        tag,
        transaction_lines (
            id,
            amount,
            type,
            account_id,
            metadata
        )
        `)
    .eq('id', pendingTransactionId)
    .maybeSingle();

  if (pendingError || !pending) {
    console.error('Failed to load pending refund transaction:', pendingError)
    return { success: false, error: 'Không tìm thấy giao dịch hoàn tiền hoặc đã xảy ra lỗi.' }
  }

  const pendingMetadata = extractLineMetadata((pending as any).transaction_lines as Array<{ metadata?: Json | null }>)

  const pendingLine = ((pending as any).transaction_lines as any[]).find(
    (line) => line?.account_id === REFUND_PENDING_ACCOUNT_ID && line.type === 'debit'
  )

  if (!pendingLine) {
    return { success: false, error: 'Không có dòng ghi sổ treo phù hợp để xác nhận.' }
  }

  const amountToConfirm = Math.abs(pendingLine.amount ?? 0)
  if (amountToConfirm <= 0) {
    return { success: false, error: 'Số tiền xác nhận không hợp lệ.' }
  }

  const userId = await resolveCurrentUserId(supabase)
  const confirmNote = `Confirmed refund for ${(pending as any).note ?? (pending as any).id}`
  const confirmationMetadata = {
    refund_status: 'confirmed',
    linked_transaction_id: pendingTransactionId,
  }

  const { data: confirmTxn, error: confirmError } = await (supabase
    .from('transactions')
    .insert as any)({
      occurred_at: new Date().toISOString(),
      note: confirmNote,
      status: 'posted',
      tag: (pending as any).tag,
      created_by: userId,
    })
    .select()
    .single()

  if (confirmError || !confirmTxn) {
    console.error('Failed to insert refund confirm transaction:', confirmError)
    return { success: false, error: 'Không thể tạo giao dịch xác nhận hoàn tiền.' }
  }

  const confirmLines: any[] = [
    {
      transaction_id: confirmTxn.id,
      account_id: targetAccountId,
      amount: amountToConfirm,
      type: 'debit',
      metadata: confirmationMetadata,
    },
    {
      transaction_id: confirmTxn.id,
      account_id: REFUND_PENDING_ACCOUNT_ID,
      amount: -amountToConfirm,
      type: 'credit',
      metadata: confirmationMetadata,
    },
  ]

  const { error: confirmLinesError } = await (supabase.from('transaction_lines').insert as any)(
    confirmLines
  )
  if (confirmLinesError) {
    console.error('Failed to insert refund confirmation lines:', confirmLinesError)
    return { success: false, error: 'Không thể ghi sổ dòng hoàn tiền.' }
  }

  try {
    const updatedPendingMeta = mergeMetadata(pendingMetadata, {
      refund_status: 'confirmed',
      refund_confirmed_transaction_id: confirmTxn.id,
      refunded_at: new Date().toISOString(),
    })
    const pendingLines = ((pending as any).transaction_lines as Array<{ id?: string, metadata?: Json | null }>) ?? []
    for (const line of pendingLines) {
      if (!line?.id) continue
      await (supabase.from('transaction_lines').update as any)({ metadata: updatedPendingMeta }).eq(
        'id',
        line.id
      )
    }
  } catch (err) {
    console.error('Failed to update pending refund metadata:', err)
  }

  const pendingMeta = parseMetadata(pendingMetadata)
  const originalTransactionId =
    typeof pendingMeta.linked_transaction_id === 'string' ? pendingMeta.linked_transaction_id : null

  if (originalTransactionId) {
    try {
      const { data: originalLines } = await supabase
        .from('transaction_lines')
        .select('id, metadata')
        .eq('transaction_id', originalTransactionId)

      const originalMeta = extractLineMetadata(originalLines as Array<{ metadata?: Json | null }>)
      const updatedOriginalMeta = mergeMetadata(originalMeta, {
        refund_status: 'confirmed',
        refund_confirmed_transaction_id: confirmTxn.id,
        refund_confirmed_at: new Date().toISOString(),
      })

      for (const line of (originalLines ?? []) as Array<{ id?: string }>) {
        if (!line?.id) continue
        await (supabase.from('transaction_lines').update as any)({ metadata: updatedOriginalMeta }).eq(
          'id',
          line.id
        )
      }
    } catch (err) {
      console.error('Failed to tag original transaction after refund confirmation:', err)
    }
  }

  return { success: true, confirmTransactionId: confirmTxn.id }
}

export async function getUnifiedTransactions(accountId?: string, limit: number = 50): Promise<TransactionWithDetails[]> {
  const supabase = createClient();

  let query = supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      note,
      tag,
      status,
      created_at,
      shop_id,
      shops ( id, name, logo_url ),
      transaction_lines (
        amount,
        type,
        account_id,
        metadata,
        category_id,
        person_id,
        original_amount,
        cashback_share_percent,
        cashback_share_fixed,
        profiles ( name, avatar_url ),
        accounts (name, type, logo_url),
        categories (name, logo_url, icon)
      )
    `)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (accountId) {
    query = query.eq('transaction_lines.account_id', accountId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching unified transactions:', error);
    return [];
  }

  return (data as MapperTransactionRow[]).map(txn => mapTransactionRow(txn, accountId));
}
