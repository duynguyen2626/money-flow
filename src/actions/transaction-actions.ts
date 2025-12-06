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
  const { lines, tag } = built;

  const persistedCycleTag = await calculatePersistedCycleTag(
    supabase,
    input.source_account_id,
    new Date(input.occurred_at)
  );

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
    })
    .select()
    .single();

  if (txnError || !txn) {
    console.error('Error creating transaction header:', txnError);
    return false;
  }

  const linesWithId = lines.map(l => ({ ...l, transaction_id: txn.id }));
  const { error: linesError } = await (supabase.from('transaction_lines').insert as any)(linesWithId);

  if (linesError) {
    console.error('Error creating transaction lines:', linesError);
    return false;
  }

  const shopInfo = await loadShopInfo(supabase, input.shop_id)

  if (input.type === 'repayment') {
    await syncRepaymentTransaction(supabase, txn.id, input, linesWithId, shopInfo);
  } else {
    const syncBase = {
      id: txn.id,
      occurred_at: input.occurred_at,
      note: input.note,
      tag,
      shop_name: shopInfo?.name ?? null,
    };

    for (const line of linesWithId) {
      const personId = line.person_id;
      if (!personId) continue;

      const originalAmount =
        typeof line.original_amount === 'number' ? line.original_amount : line.amount;
      const cashbackPercent =
        typeof line.cashback_share_percent === 'number' ? line.cashback_share_percent : undefined;
      const cashbackFixed =
        typeof line.cashback_share_fixed === 'number' ? line.cashback_share_fixed : undefined;

      void syncTransactionToSheet(
        personId,
        {
          ...syncBase,
          original_amount: originalAmount,
          cashback_share_percent: cashbackPercent,
          cashback_share_fixed: cashbackFixed,
          amount: line.amount,
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
        person_id,
        metadata,
        status
      `
    )
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error('Failed to load transaction for void:', fetchError);
    return false;
  }

  // --- Strict Void Order Logic (3-2-1) ---
  const meta = parseMetadata((existing as any).metadata);
  const currentStatus = (existing as any).status;

  // 1. Check if this is GD2 (Pending Refund)
  if (meta?.refund_confirmed_transaction_id) {
    const gd3Id = meta.refund_confirmed_transaction_id as string;
    const { data: gd3 } = await supabase
      .from('transactions')
      .select('status')
      .eq('id', gd3Id)
      .single();

    if (gd3 && gd3.status !== 'void') {
      throw new Error(`Cannot void Pending Refund (GD2) because Confirmation (GD3) exists. Please void the confirmation first.`);
    }
  }

  // 2. Check if this is GD1 (Original Transaction)
  // GD1 has 'refund_request_id' pointing to GD2
  if (meta?.refund_request_id) {
    const gd2Id = meta.refund_request_id as string;
    const { data: gd2 } = await supabase
      .from('transactions')
      .select('status')
      .eq('id', gd2Id)
      .single();

    if (gd2 && gd2.status !== 'void') {
      throw new Error(`Cannot void Original Transaction (GD1) because Refund Request (GD2) exists. Please void the refund request first.`);
    }
  }
  // --- End Strict Void Order Logic ---


  // Simplified Void: Just update status.
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

  const { data: existingData, error: existingError } = await supabase
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

  const { error: headerError } = await (supabase
    .from('transactions')
    .update as any)({
      occurred_at: input.occurred_at,
      note: input.note,
      tag: tag,
      status: 'posted',
      persisted_cycle_tag: persistedCycleTag,
      shop_id: input.shop_id ?? null,
    })
    .eq('id', id);

  if (headerError) {
    console.error('Failed to update transaction header:', headerError);
    return false;
  }

  const { error: deleteError } = await supabase.from('transaction_lines').delete().eq('transaction_id', id);
  if (deleteError) {
    console.error('Failed to clear old transaction lines:', deleteError);
    return false;
  }

  const linesWithId = lines.map(line => ({ ...line, transaction_id: id }));
  const { error: insertError } = await (supabase.from('transaction_lines').insert as any)(linesWithId);
  if (insertError) {
    console.error('Failed to insert new transaction lines:', insertError);
    return false;
  }

  const existingLines = ((existingData as any).transaction_lines as any[]) ?? [];

  for (const line of existingLines) {
    if (!line.person_id) continue;
    const payload = buildSheetPayload(existingData as any, line);
    if (!payload) continue;
    void syncTransactionToSheet(line.person_id, payload, 'delete').catch(err => {
      console.error('Sheet Sync Error (Update/Delete):', err);
    });
  }

  if (input.type === 'repayment') {
    await syncRepaymentTransaction(supabase, id, input, linesWithId, shopInfo);
  } else {
    const syncBase = {
      id,
      occurred_at: input.occurred_at,
      note: input.note,
      tag,
      shop_name: shopInfo?.name ?? null,
    };

    for (const line of linesWithId) {
      const personId = line.person_id;
      if (!personId) continue;

      const payload = buildSheetPayload(syncBase, line);
      if (!payload) continue;

      void syncTransactionToSheet(personId, payload, 'create').catch(err => {
        console.error('Sheet Sync Error (Update/Create):', err);
      });
    }
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

  const { data: requestTxn, error: createError } = await (supabase
    .from('transactions')
    .insert as any)({
      occurred_at: new Date().toISOString(),
      note: requestNote,
      status: 'posted',
      tag: (existing as any).tag,
      created_by: userId,
      shop_id: (existing as any).shop_id ?? null,
    })
    .select()
    .single()

  if (createError || !requestTxn) {
    console.error('Failed to insert refund request transaction:', createError)
    return { success: false, error: 'Không thể tạo giao dịch yêu cầu hoàn tiền.' }
  }

  const refundCategoryId = await resolveSystemCategory(supabase, 'Refund', 'expense');
  if (!refundCategoryId) {
    console.error('FATAL: "Refund" system category not found.');
    return { success: false, error: 'Hệ thống chưa cấu hình danh mục Hoàn tiền.' }
  }

  const linesToInsert: any[] = [
    {
      transaction_id: requestTxn.id,
      account_id: REFUND_PENDING_ACCOUNT_ID,
      amount: safeAmount,
      type: 'debit',
      metadata: lineMetadata,
    },
    {
      transaction_id: requestTxn.id,
      category_id: refundCategoryId,
      amount: -safeAmount,
      type: 'credit',
      metadata: lineMetadata,
    },
  ]

  const { error: linesError } = await (supabase.from('transaction_lines').insert as any)(linesToInsert)
  if (linesError) {
    console.error('Failed to insert refund request lines:', linesError)
    return { success: false, error: 'Không thể tạo dòng ghi sổ hoàn tiền.' }
  }

  try {
    const originalLines = ((existing as any).transaction_lines as Array<{ id?: string, metadata?: Json | null }>) ?? []
    const mergedOriginalMeta = mergeMetadata(existingMetadata, {
      refund_request_id: requestTxn.id,
      refund_requested_at: new Date().toISOString(),
      has_refund_request: true,
    })
    for (const line of originalLines) {
      if (!line?.id) continue
      await (supabase.from('transaction_lines').update as any)({ metadata: mergedOriginalMeta }).eq(
        'id',
        line.id
      )
    }
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
