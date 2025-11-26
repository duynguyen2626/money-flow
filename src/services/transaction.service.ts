
'use server';

import { createClient } from '@/lib/supabase/server';
import { format, setDate, subMonths } from 'date-fns';
import { Database, Json } from '@/types/database.types';
import { TransactionWithDetails, TransactionWithLineRelations } from '@/types/moneyflow.types';
import { syncTransactionToSheet } from './sheet.service';
import {
  ShopRow,
  TransactionRow,
  parseMetadata,
  extractLineMetadata,
  loadShopInfo,
  mapTransactionRow
} from '@/lib/transaction-mapper';

import { REFUND_PENDING_ACCOUNT_ID } from '@/constants/refunds';

const REFUND_CATEGORY_ID = 'e0000000-0000-0000-0000-000000000095';

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
    const { data: destAccountResult } = await supabase
      .from('accounts')
      .select('name')
      .eq('id', input.debt_account_id ?? '')
      .single();
    const destAccount = destAccountResult as { name: string } | null;

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
          shop_name: shopInfo?.name ?? destAccount?.name ?? null,
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
  try {
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
  } catch (error) {
    console.error('Unhandled error in createTransaction:', error);
    return false;
  }
}









export async function getRecentTransactions(limit: number = 10): Promise<TransactionWithDetails[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      note,
      tag,
      status,
      created_at,
      shop_id,
      shops ( id, name, logo_url, default_category_id, categories ( id, name, type, image_url, icon ) ),
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
        categories (name, type, image_url, icon)
      )
    `)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent transactions:', error);
    return [];
  }

  return (data as TransactionRow[]).map(txn => mapTransactionRow(txn));
}

export async function getTransactionsByShop(shopId: string, limit: number = 50): Promise<TransactionWithDetails[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      note,
      tag,
      status,
      created_at,
      shop_id,
      shops ( id, name, logo_url, default_category_id, categories ( id, name, type, image_url, icon ) ),
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
        categories (name, type, image_url, icon)
      )
    `)
    .eq('shop_id', shopId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching transactions for shop:', error);
    return [];
  }

  return (data as TransactionRow[]).map(txn => mapTransactionRow(txn));
}

export async function voidTransaction(id: string): Promise<boolean> {
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
        id,
        amount,
        original_amount,
        cashback_share_percent,
        cashback_share_fixed,
        metadata,
        person_id,
        account_id,
        category_id,
        type
      )
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error('Failed to load transaction for void:', fetchError);
    return false;
  }

  const { error: updateError } = await (supabase.from('transactions').update as any)({ status: 'void' }).eq('id', id);

  if (updateError) {
    console.error('Failed to void transaction:', updateError);
    return false;
  }

  const lines = ((existing as any).transaction_lines as RefundTransactionLine[]) ?? [];
  const personLine = lines.find((line) => line?.person_id);

  if (personLine?.person_id) {
    const payload = buildSheetPayload(existing as any, personLine);
    if (payload) {
      void syncTransactionToSheet(personLine.person_id, payload, 'delete').catch(err => {
        console.error('Sheet Sync Error (Void):', err);
      });
    }
  }

  // --- ROLLBACK LOGIC FOR REFUNDS ---
  const metadata = extractLineMetadata(lines) as Record<string, any> | null;
  const metaRecord = metadata as Record<string, unknown> | null;
  let targetOriginalId =
    typeof metaRecord?.original_transaction_id === 'string'
      ? metaRecord.original_transaction_id
      : typeof metaRecord?.linked_transaction_id === 'string'
        ? metaRecord.linked_transaction_id
        : null;
  const pendingRefundId =
    typeof metaRecord?.pending_refund_transaction_id === 'string'
      ? metaRecord.pending_refund_transaction_id
      : null;

  let refundAmount =
    typeof metaRecord?.refund_amount === 'number' ? Math.abs(metaRecord.refund_amount) : null;

  if (!refundAmount) {
    const derivedAmount = deriveRefundAmountFromLines(lines);
    if (derivedAmount !== null) {
      refundAmount = derivedAmount;
    }
  }

  if (!targetOriginalId && pendingRefundId) {
    const { data: pendingTx, error: pendingError } = await supabase
      .from('transactions')
      .select('id, transaction_lines(id, amount, original_amount, type, metadata)')
      .eq('id', pendingRefundId)
      .maybeSingle();

    if (!pendingError && pendingTx) {
      const pendingLines = ((pendingTx as any)?.transaction_lines as RefundTransactionLine[]) ?? [];
      const pendingMeta = extractLineMetadata(pendingLines as Array<{ metadata?: Json | null }>) as Record<string, any> | null;

      if (!refundAmount) {
        const pendingAmount =
          typeof pendingMeta?.refund_amount === 'number' ? Math.abs(pendingMeta.refund_amount) : null;
        refundAmount = pendingAmount ?? deriveRefundAmountFromLines(pendingLines);
      }

      if (!targetOriginalId) {
        targetOriginalId =
          typeof pendingMeta?.original_transaction_id === 'string'
            ? pendingMeta.original_transaction_id
            : typeof pendingMeta?.linked_transaction_id === 'string'
              ? pendingMeta.linked_transaction_id
              : null;
      }
    }
  }

  if (targetOriginalId && refundAmount && refundAmount > 0) {
    console.log(`Rollback: Voiding a refund transaction. Restoring original transaction ${targetOriginalId}`);

    const { data: original, error: originalError } = await supabase
      .from('transactions')
      .select('id, transaction_lines(id, metadata, amount, original_amount, type)')
      .eq('id', targetOriginalId)
      .maybeSingle();

    if (original && !originalError) {
      let originalLines = ((original as any).transaction_lines as RefundTransactionLine[]) ?? [];
      let originalMetadata = extractLineMetadata(originalLines as Array<{ metadata?: Json | null }>) as Record<string, any> | null;

      if (
        typeof originalMetadata?.linked_transaction_id === 'string' &&
        originalMetadata.linked_transaction_id !== targetOriginalId
      ) {
        const fallbackOriginalId = originalMetadata.linked_transaction_id as string;
        if (!refundAmount && typeof originalMetadata?.refund_amount === 'number') {
          refundAmount = Math.abs(originalMetadata.refund_amount);
        }
        const { data: parentTx, error: parentError } = await supabase
          .from('transactions')
          .select('id, transaction_lines(id, metadata, amount, original_amount, type)')
          .eq('id', fallbackOriginalId)
          .maybeSingle();

        if (!parentError && parentTx) {
          targetOriginalId = fallbackOriginalId;
          originalLines = ((parentTx as any).transaction_lines as RefundTransactionLine[]) ?? [];
          originalMetadata = extractLineMetadata(originalLines as Array<{ metadata?: Json | null }>) as Record<string, any> | null;
        }
      }

      const currentRefunded =
        typeof originalMetadata?.refunded_amount === 'number' ? originalMetadata.refunded_amount : 0;
      const originalTotal = calculateOriginalAmountTotal(originalLines);
      const newRefunded = Math.max(0, currentRefunded - refundAmount);
      const newStatus = deriveRefundStatus(originalTotal, newRefunded);
      const priorFlowStatus =
        typeof (originalMetadata as Record<string, unknown> | null)?.refund_flow_status === 'string'
          ? (originalMetadata as Record<string, unknown>).refund_flow_status
          : undefined;

      const updatedMeta = mergeMetadata(originalMetadata, {
        refunded_amount: newRefunded,
        refund_status: newStatus,
        refund_flow_status: newStatus === 'none' ? 'voided' : priorFlowStatus,
      });

      for (const line of originalLines) {
        if (!line?.id) continue;
        await (supabase.from('transaction_lines').update as any)({ metadata: updatedMeta }).eq('id', line.id);
      }
    }
  }

  return true;
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
  original_amount?: number | null
  metadata?: Json | null
  categories?: {
    name?: string | null
  } | null
  person_id?: string | null
}

type RefundTransactionRow = {
  id: string
  note: string | null
  tag: string | null
  occurred_at: string
  metadata?: Json | null
  transaction_lines?: RefundTransactionLine[]
}

export type PendingRefundItem = {
  id: string
  occurred_at: string
  note: string | null
  tag: string | null
  amount: number
  original_note: string | null
  original_category: string | null
  linked_transaction_id?: string
}

function calculateOriginalAmountTotal(lines: RefundTransactionLine[]): number {
  return lines
    .filter(line => line.type === 'debit')
    .reduce((sum, line) => {
      const raw = typeof line.original_amount === 'number' ? line.original_amount : line.amount ?? 0
      return sum + Math.abs(raw)
    }, 0)
}

function deriveRefundStatus(total: number, refunded: number): 'none' | 'partial' | 'full' {
  if (total <= 0 || refunded <= 0) return 'none'
  if (refunded >= total) return 'full'
  return 'partial'
}

function deriveRefundAmountFromLines(lines: RefundTransactionLine[]): number | null {
  const pendingLine = lines.find(
    line => line?.account_id === REFUND_PENDING_ACCOUNT_ID
  )
  if (pendingLine) {
    return Math.abs(pendingLine.amount ?? 0)
  }

  const refundCategoryTotal = lines
    .filter(line => line?.category_id === REFUND_CATEGORY_ID)
    .reduce((sum, line) => sum + Math.abs(line.amount ?? 0), 0)

  return refundCategoryTotal > 0 ? refundCategoryTotal : null
}

export async function requestRefund(
  transactionId: string,
  refundAmount: number,
  partial: boolean,
  options?: { note?: string | null; shop_id?: string | null }
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
        original_amount,
        person_id,
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
  const currentRefundedAmount =
    typeof (existingMetadata as any)?.refunded_amount === 'number'
      ? (existingMetadata as any).refunded_amount
      : 0

  const lines = ((existing as any).transaction_lines as RefundTransactionLine[]) ?? []

  // Find the "Debit" lines that represent the expense or debt given
  // We exclude the source account (Credit) usually.
  const debitLines = lines.filter(l => l.type === 'debit');

  if (debitLines.length === 0) {
    return { success: false, error: 'Giao dich khong co dong ghi de hoan.' };
  }

  // Calculate total original amount from debit lines (use original_amount when available)
  const totalOriginalAmount = calculateOriginalAmountTotal(debitLines);

  if (totalOriginalAmount <= 0) {
    return { success: false, error: 'Khong the hoan tien cho giao dich co gia tri 0.' }
  }

  const requestedAmountRaw = Number.isFinite(refundAmount) ? Math.abs(refundAmount) : totalOriginalAmount
  const requestedAmount = Math.max(0, requestedAmountRaw)

  if (requestedAmount === 0) {
    return { success: false, error: 'So tien hoan khong hop le.' }
  }

  // Validation: Check if refund exceeds original amount (considering previous refunds)
  if (currentRefundedAmount + requestedAmount > totalOriginalAmount) {
    return {
      success: false,
      error: `Refund amount (${requestedAmount}) plus refunded (${currentRefundedAmount}) exceeds original total (${totalOriginalAmount}).`,
    }
  }

  const userId = await resolveCurrentUserId(supabase)
  const requestNote = options?.note ?? `Refund Request for ${(existing as any).note ?? transactionId}`

  // Prepare metadata for the new refund transaction lines
  const lineMetadata = {
    refund_status: 'requested',
    linked_transaction_id: transactionId,
    original_transaction_id: transactionId,
    refund_amount: requestedAmount,
    partial,
    original_note: (existing as any).note ?? null,
  }

  const { data: requestTxn, error: createError } = await (supabase
    .from('transactions')
    .insert as any)({
      occurred_at: new Date().toISOString(),
      note: requestNote,
      status: 'posted',
      tag: (existing as any).tag,
      created_by: userId,
      shop_id: options?.shop_id ?? (existing as any).shop_id ?? null,
    })
    .select()
    .single()

  if (createError || !requestTxn) {
    console.error('Failed to insert refund request transaction:', createError)
    return { success: false, error: 'Không thể tạo giao dịch yêu cầu hoàn tiền.' }
  }

  const refundCategoryId = REFUND_CATEGORY_ID
  const linesToInsert: any[] = [];

  // 1. Debit the Pending Account (Money coming back is pending)
  linesToInsert.push({
    transaction_id: requestTxn.id,
    account_id: REFUND_PENDING_ACCOUNT_ID,
    amount: requestedAmount,
    type: 'debit',
    metadata: lineMetadata,
  });

  // 2. Credit the original destination (Category or Debt Account)
  // We need to distribute the refund amount across the debit lines if there are multiple.
  // For simplicity, if there's 1 line, we use it. If multiple, we might need logic.
  // Current logic: We iterate and try to match.

  let remainingRefund = requestedAmount;

  for (const line of debitLines) {
    if (remainingRefund <= 0) break;

    const lineAmount = Math.abs(line.amount);
    const refundForLine = Math.min(lineAmount, remainingRefund);

    // If it's a Debt line (has person_id), we credit the Debt Account
    if (line.person_id && line.account_id) {
      linesToInsert.push({
        transaction_id: requestTxn.id,
        account_id: line.account_id,
        amount: -refundForLine,
        type: 'credit',
        person_id: line.person_id,
        metadata: { ...lineMetadata, original_category_id: line.category_id },
      });
    } else if (line.category_id) {
      // If it's an Expense line, we credit the Refund Category (or the original category? Usually Refund Category for tracking)
      // The original code used REFUND_CATEGORY_ID.
      // If we want to reverse the expense exactly, we might credit the original category?
      // But usually "Refund" is a separate income or contra-expense.
      // Using REFUND_CATEGORY_ID is safer for now to avoid messing up reports unless requested.
      linesToInsert.push({
        transaction_id: requestTxn.id,
        category_id: refundCategoryId, // Keep using Refund Category for expenses
        amount: -refundForLine,
        type: 'credit',
        metadata: { ...lineMetadata, original_category_id: line.category_id },
      });
    }

    remainingRefund -= refundForLine;
  }

  // If we still have remaining refund (e.g. rounding or logic error), dump it to Refund Category
  if (remainingRefund > 0) {
    linesToInsert.push({
      transaction_id: requestTxn.id,
      category_id: refundCategoryId,
      amount: -remainingRefund,
      type: 'credit',
      metadata: lineMetadata,
    });
  }

  const { error: linesError } = await (supabase.from('transaction_lines').insert as any)(linesToInsert)
  if (linesError) {
    console.error('Failed to insert refund request lines:', linesError)
    return { success: false, error: 'Không thể tạo dòng ghi sổ hoàn tiền.' }
  }

  // 3. Update Original Transaction Metadata
  try {
    const newRefundedTotal = currentRefundedAmount + requestedAmount;
    const newRefundStatus = deriveRefundStatus(totalOriginalAmount, newRefundedTotal);

    const originalLines = ((existing as any).transaction_lines as Array<{ id?: string, metadata?: Json | null }>) ?? []
    const mergedOriginalMeta = mergeMetadata(existingMetadata, {
      refund_request_id: requestTxn.id,
      refund_requested_at: new Date().toISOString(),
      has_refund_request: true,
      refunded_amount: newRefundedTotal,
      refund_status: newRefundStatus,
      refund_flow_status: 'requested',
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
  const pendingMeta = parseMetadata(pendingMetadata)

  const pendingLine = ((pending as any).transaction_lines as any[]).find(
    (line) => line?.account_id === REFUND_PENDING_ACCOUNT_ID && line.type === 'debit'
  )

  if (!pendingLine) {
    return { success: false, error: 'Khong co dong ghi treo hop le de xac nhan.' }
  }

  const amountToConfirm = Math.abs(pendingLine.amount ?? 0)
  if (amountToConfirm <= 0) {
    return { success: false, error: 'So tien xac nhan khong hop le.' }
  }

  const originalTransactionId =
    typeof pendingMeta?.linked_transaction_id === 'string' ? pendingMeta.linked_transaction_id : null

  const userId = await resolveCurrentUserId(supabase)
  const confirmNote = `Confirmed refund for ${(pending as any).note ?? (pending as any).id}`
  const confirmationMetadata = {
    refund_status: 'confirmed',
    linked_transaction_id: originalTransactionId ?? pendingTransactionId,
    pending_refund_transaction_id: pendingTransactionId,
    refund_amount: amountToConfirm,
    ...(originalTransactionId ? { original_transaction_id: originalTransactionId } : {}),
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
      refund_amount: amountToConfirm,
      refund_flow_status: 'confirmed',
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

  if (originalTransactionId) {
    try {
      const { data: originalLines } = await supabase
        .from('transaction_lines')
        .select('id, metadata, amount, original_amount, type')
        .eq('transaction_id', originalTransactionId)

      const originalLinesTyped = (originalLines ?? []) as RefundTransactionLine[]
      const originalMeta = extractLineMetadata(originalLinesTyped as Array<{ metadata?: Json | null }>)
      const originalTotal = calculateOriginalAmountTotal(originalLinesTyped)
      const existingRefunded =
        typeof (originalMeta as Record<string, unknown> | null)?.refunded_amount === 'number'
          ? (originalMeta as any).refunded_amount
          : 0
      const updatedStatus = deriveRefundStatus(originalTotal, existingRefunded)
      const updatedOriginalMeta = mergeMetadata(originalMeta, {
        refund_status: updatedStatus,
        refund_flow_status: 'confirmed',
        refund_confirmed_transaction_id: confirmTxn.id,
        refund_confirmed_at: new Date().toISOString(),
      })

      for (const line of originalLinesTyped as Array<{ id?: string }>) {
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

export async function getPendingRefunds(): Promise<PendingRefundItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      note,
      tag,
      transaction_lines!inner (
        amount,
        type,
        account_id,
        category_id,
        metadata,
        categories ( name )
      )
    `)
    .filter('transaction_lines.metadata->>refund_status', 'eq', 'requested')
    .order('occurred_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch pending refunds:', error)
    return []
  }

  return (data as any[])
    .map(row => {
      const pendingLine = (row.transaction_lines ?? []).find(
        (line: any) => line?.account_id === REFUND_PENDING_ACCOUNT_ID && line.type === 'debit'
      )

      if (!pendingLine) {
        return null
      }

      const metadata = parseMetadata(extractLineMetadata(row.transaction_lines))
      const categoryLine = (row.transaction_lines ?? []).find((line: any) => line?.category_id)
      const amount = Math.abs(pendingLine.amount ?? 0)
      const originalCategory =
        (metadata.original_category_name as string) ??
        categoryLine?.categories?.name ??
        null

      return {
        id: row.id,
        occurred_at: row.occurred_at,
        note: row.note,
        tag: row.tag,
        amount,
        original_note: (metadata.original_note as string) ?? null,
        original_category: originalCategory,
        linked_transaction_id:
          typeof metadata.linked_transaction_id === 'string' ? metadata.linked_transaction_id : undefined,
      } as PendingRefundItem
    })
    .filter((item): item is PendingRefundItem => Boolean(item))
}

type UnifiedTransactionParams = {
  accountId?: string
  limit?: number
  context?: 'person'
}

export async function getUnifiedTransactions(
  accountOrOptions?: string | UnifiedTransactionParams,
  limitArg: number = 50
): Promise<TransactionWithDetails[]> {
  const supabase = createClient()
  const selection = `
      id,
      occurred_at,
      note,
      tag,
      status,
      created_at,
      shop_id,
      shops ( id, name, logo_url, default_category_id, categories ( id, name, type, image_url, icon ) ),
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
        categories (name, type, image_url, icon)
      )
    `

  const parsed =
    typeof accountOrOptions === 'object' && accountOrOptions !== null
      ? accountOrOptions
      : { accountId: accountOrOptions as string | undefined, limit: limitArg }

  const accountId = parsed.accountId
  const limit = parsed.limit ?? limitArg
  const context = parsed.context

  if (accountId) {
    const { data: txnIds, error: idsError } = await supabase
      .from('transaction_lines')
      .select('transaction_id, transactions!inner(occurred_at)')
      .eq('account_id', accountId)
      .order('transactions(occurred_at)', { ascending: false })
      .limit(limit)

    if (idsError) {
      console.error('Error fetching transaction ids for unified view:', idsError)
      return []
    }

    const uniqueIds = Array.from(
      new Set(
        ((txnIds ?? []) as Array<{ transaction_id: string | null }>).map(row => row.transaction_id).filter(Boolean)
      )
    ) as string[]
    if (uniqueIds.length === 0) {
      return []
    }

    const { data, error } = await supabase
      .from('transactions')
      .select(selection)
      .in('id', uniqueIds)
      .order('occurred_at', { ascending: false })

    if (error) {
      console.error('Error fetching unified transactions:', error)
      return []
    }

    return (data as any[]).map(txn => mapTransactionRow(txn, accountId, { mode: context }))
  }

  const { data, error } = await supabase
    .from('transactions')
    .select(selection)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching unified transactions:', error)
    return []
  }

  return (data as any[]).map(txn => mapTransactionRow(txn, accountId, { mode: context }))
}
