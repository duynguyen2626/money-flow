
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
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

import { SYSTEM_ACCOUNTS, SYSTEM_CATEGORIES } from '@/lib/constants';
import { resolveMissingDebtAccountIds } from '@/lib/debt-account-links';

const REFUND_CATEGORY_ID = SYSTEM_CATEGORIES.REFUND;

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
  is_voluntary?: boolean;
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
  return user?.id ?? SYSTEM_ACCOUNTS.DEFAULT_USER_ID;
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
    // For income, the account receiving money is the destination
    const targetAccountId = input.destination_account_id || input.source_account_id;
    lines.push({
      account_id: targetAccountId,
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

  } else if (input.type === 'debt' && input.debt_account_id && input.category_id) {
    // DEBT TRANSACTION (Lending/Mua hộ)
    // Logic: User spends money, optionally shares cost with another person
    // Example: Buy 100k food, person owes 50k
    // Lines:
    // 1. Credit source account: -100k (money out)
    // 2. Debit category (Food): +100k (expense recorded)
    // 3. Track person_id and cashback in metadata on category line

    const originalAmount = Math.abs(input.amount);
    const sharePercentEntry = Math.max(0, Number(input.cashback_share_percent ?? 0));
    const sharePercentCapped = Math.min(100, sharePercentEntry);
    const sharePercentRate = sharePercentCapped / 100;
    const shareFixed = Math.max(0, Number(input.cashback_share_fixed ?? 0));

    // Line 1: Credit source account (money out)
    lines.push({
      account_id: input.source_account_id,
      amount: -originalAmount,
      type: 'credit',
    });

    // Line 2: Debit category (expense recorded with user-selected category!)
    // Line 2: Debit Debt Account (Asset) AND Category (Expense Classification)
    // We must set account_id for it to appear in the Debt Account history.
    // We also set category_id so the user sees what it was for (e.g. Food).
    lines.push({
      account_id: input.debt_account_id, // FIX: Use debt_account_id to link to Debt Account
      category_id: input.category_id,    // Keep category for classification
      amount: originalAmount,
      type: 'debit',
      original_amount: originalAmount,
      cashback_share_percent: sharePercentRate,
      cashback_share_fixed: shareFixed,
      person_id: input.person_id ?? null, // Track who owes money
      metadata: input.is_voluntary ? { is_voluntary: true } : undefined,
    });

  } else if (input.type === 'transfer' && input.debt_account_id) {
    // TRANSFER TRANSACTION (Money Transfer between accounts)
    const originalAmount = Math.abs(input.amount);

    lines.push({
      account_id: input.source_account_id,
      amount: -originalAmount,
      type: 'credit',
    });
    lines.push({
      account_id: input.debt_account_id,
      amount: originalAmount,
      type: 'debit',
    });
  } else {
    console.error('Invalid transaction type or missing data');
    return null;
  }

  await resolveMissingDebtAccountIds(supabase, lines);
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
  txn: { id: string; occurred_at: string; note?: string | null; tag?: string | null; shop_name?: string | null },
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
    shop_name: txn.shop_name ?? undefined,
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
    const { data: sourceAccountResult } = await supabase
      .from('accounts')
      .select('name')
      .eq('id', input.source_account_id ?? '')
      .single();
    const sourceAccount = sourceAccountResult as { name: string } | null;

    for (const line of lines) {
      if (!line.person_id) continue;

      const originalAmount =
        typeof line.original_amount === 'number' ? line.original_amount : line.amount;
      const cashbackPercent =
        typeof line.cashback_share_percent === 'number' ? line.cashback_share_percent : undefined;
      const cashbackFixed =
        typeof line.cashback_share_fixed === 'number' ? line.cashback_share_fixed : undefined;

      try {
        await syncTransactionToSheet(
          line.person_id,
          {
            id: transactionId,
            occurred_at: input.occurred_at,
            note: input.note,
            tag: input.tag,
            shop_name: shopInfo?.name ?? sourceAccount?.name ?? null,
            amount: line.amount,
            original_amount: originalAmount,
            cashback_share_percent: cashbackPercent,
            cashback_share_fixed: cashbackFixed,
            type: 'In',
          },
          'create'
        );
        console.log(`[Sheet Sync] Triggered for Repayment to Person ${line.person_id}`);
      } catch (err) {
        console.error('Sheet Sync Error (Repayment):', err);
      }
    }
  } catch (error) {
    console.error("Failed to sync repayment transaction:", error);
  }
}

export async function createTransaction(input: CreateTransactionInput): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || SYSTEM_ACCOUNTS.DEFAULT_USER_ID;

    // Ensure profile exists to satisfy FK constraint
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).single();
    if (!profile) {
      console.log(`[createTransaction] Profile missing for ${userId}, creating fallback profile.`);
      const { error: createProfileError } = await (supabase.from('profiles').insert as any)({
        id: userId,
        name: user?.email?.split('@')[0] ?? 'System User',
        email: user?.email ?? null,
      });
      if (createProfileError) {
        console.error('Failed to create fallback profile:', createProfileError);
        // If we can't create a profile, we might fail the transaction or try another ID.
        // For now, let's proceed and hope for the best or fail at the FK constraint.
      }
    }

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
    let shopName = shopInfo?.name ?? null;

    if (!shopName && input.source_account_id) {
      const { data: acc } = await supabase.from('accounts').select('name').eq('id', input.source_account_id).single();
      if (acc) shopName = (acc as any).name;
    }

    if (input.type === 'repayment') {
      await syncRepaymentTransaction(supabase, txn.id, input, linesWithId, shopInfo);
    } else {
      const syncBase = {
        id: txn.id,
        occurred_at: input.occurred_at,
        note: input.note,
        tag,
        shop_name: shopName,
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

        try {
          await syncTransactionToSheet(
            personId,
            {
              ...syncBase,
              original_amount: originalAmount,
              cashback_share_percent: cashbackPercent,
              cashback_share_fixed: cashbackFixed,
              amount: line.amount,
            },
            'create'
          );
          console.log(`[Sheet Sync] Triggered for Person ${personId}`);
        } catch (err) {
          console.error('Sheet Sync Error (Background):', err);
        }
      }
    }

    // Recalculate balances for all involved accounts
  const accountIds = new Set<string>();
  for (const line of lines) {
    if (line?.account_id) accountIds.add(line.account_id);
    if (line?.person_id && line?.account_id) {
      // If a person is involved in this line, also add their associated debt account for recalculation
      // assuming the debt account itself is one of the line's accounts.
      // Or we can fetch it explicitly if needed.
      accountIds.add(line.account_id);
    }
  }

  // Also gather original account IDs from the existing transaction (before voiding)
  // to ensure all affected accounts are re-calculated
  const originalAccountIds = new Set<string>();
  lines.forEach(l => {
    if (l.account_id) originalAccountIds.add(l.account_id);
  });

  if (accountIds.size > 0 || originalAccountIds.size > 0) {
    const { recalculateBalance } = await import('./account.service');
    const allUniqueAccountIds = new Set([...Array.from(accountIds), ...Array.from(originalAccountIds)]);
    await Promise.all(Array.from(allUniqueAccountIds).map(id => recalculateBalance(id)));
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
      shop_id,
      shops ( name ),
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
        type,
        accounts ( name )
      )
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error('Failed to load transaction for void:', fetchError);
    return false;
  }

  // --- VOID PROTECTION FOR REFUNDS ---
  // If voiding a transaction that has a linked 'money received' transaction (GD3),
  // we must block it to prevent data inconsistency.
  const lines = ((existing as any).transaction_lines as RefundTransactionLine[]) ?? [];
  const metadata = extractLineMetadata(lines) as Record<string, any> | null;

  if (metadata?.refund_confirmed_transaction_id) {
    const { data: gd3 } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('id', metadata.refund_confirmed_transaction_id)
      .maybeSingle();

    const gd3Typed = gd3 as { id: string; status: string } | null;

    if (gd3Typed && gd3Typed.status !== 'void') {
      // Throwing error to be caught by UI
      throw new Error('Cannot void this transaction because the refund has already been confirmed (GD3). Please void the confirmation transaction first.');
    }
  }

  // --- HANDLE VOIDING OF REFUND CONFIRMATION (GD3) ---
  // If this is a GD3 (has pending_refund_transaction_id), we need to revert GD2 and GD1.
  if (metadata?.pending_refund_transaction_id) {
    const gd2Id = metadata.pending_refund_transaction_id;
    const gd1Id = metadata.original_transaction_id || metadata.linked_transaction_id;
    const refundAmount = Number(metadata.refund_amount) || 0;

    // 1. Revert GD2 (Refund Request) to 'pending'
    // We also need to revert its metadata (remove confirmed status)
    const { data: gd2 } = await supabase
      .from('transactions')
      .select('*, transaction_lines(*)')
      .eq('id', gd2Id)
      .single();

    if (gd2) {
      const gd2Lines = (gd2 as any).transaction_lines ?? [];
      const gd2Meta = extractLineMetadata(gd2Lines) as Record<string, any> || {};
      const newGd2Meta = { ...gd2Meta, refund_status: 'pending', refund_confirmed_transaction_id: null, refund_confirmed_at: null };

      // Update GD2 status and metadata
      await (supabase.from('transactions').update as any)({ status: 'pending' }).eq('id', gd2Id);
      for (const line of gd2Lines) {
        await (supabase.from('transaction_lines').update as any)({ metadata: newGd2Meta }).eq('id', line.id);
      }
    }

    // 2. Update GD1 (Original) to 'waiting_refund' (or active/partial)
    // We need to decrease the refunded_amount in GD1 metadata
    if (gd1Id) {
      const { data: gd1 } = await supabase
        .from('transactions')
        .select('*, transaction_lines(*)')
        .eq('id', gd1Id)
        .single();

      if (gd1) {
        const gd1Lines = (gd1 as any).transaction_lines ?? [];
        const gd1Meta = extractLineMetadata(gd1Lines) as Record<string, any> || {};
        const currentRefunded = Number(gd1Meta.refunded_amount) || 0;
        const newRefunded = Math.max(0, currentRefunded - refundAmount);

        // Determine new refund status for GD1
        let newRefundStatus = 'pending'; // Default back to pending/waiting
        if (newRefunded <= 0) newRefundStatus = 'requested'; // Or 'pending'
        else newRefundStatus = 'partial';

        const newGd1Meta = { ...gd1Meta, refunded_amount: newRefunded, refund_status: newRefundStatus };

        // Update GD1 status to 'waiting_refund' (user requested "waiting")
        await (supabase.from('transactions').update as any)({ status: 'waiting_refund' }).eq('id', gd1Id);

        for (const line of gd1Lines) {
          await (supabase.from('transaction_lines').update as any)({ metadata: newGd1Meta }).eq('id', line.id);
        }
      }
    }
  }

  // --- HANDLE VOIDING OF REFUND REQUEST (GD2) ---
  // If this is a GD2 (has refund_status='requested' or 'pending' and links to GD1), we need to revert GD1.
  if (metadata?.refund_status === 'requested' || metadata?.refund_status === 'pending') {
    const gd1Id = metadata.original_transaction_id || metadata.linked_transaction_id;
    const refundAmount = Number(metadata.refund_amount) || 0;

    if (gd1Id) {
      const { data: gd1 } = await supabase
        .from('transactions')
        .select('*, transaction_lines(*)')
        .eq('id', gd1Id)
        .single();

      if (gd1) {
        const gd1Lines = (gd1 as any).transaction_lines ?? [];
        const gd1Meta = extractLineMetadata(gd1Lines) as Record<string, any> || {};
        const currentRefunded = Number(gd1Meta.refunded_amount) || 0;
        const newRefunded = Math.max(0, currentRefunded - refundAmount);

        // Determine new refund status for GD1
        let newRefundStatus = 'none';
        let newStatus = 'posted'; // Default to Active (posted)

        if (newRefunded > 0) {
          newRefundStatus = 'partial';
          newStatus = 'waiting_refund'; // Still waiting if partial? Or active? Usually waiting if incomplete.
        } else {
          // Fully reverted
          newRefundStatus = 'none';
          newStatus = 'posted';
        }

        const newGd1Meta = { ...gd1Meta, refunded_amount: newRefunded, refund_status: newRefundStatus };

        // Remove Refund ID from Note if fully reverted
        // Assuming Note format: "1.[ID] Note..."
        // We want to remove "[ID]" if it exists? Or just leave it?
        // User said: "Notes khi không còn giao dịch con nữa nên xóa luôn ID"
        // Let's try to remove the specific Group ID if newRefunded is 0.
        let newNote = (gd1 as any).note;
        if (newRefunded === 0) {
          // Regex to find [XXXX]
          // We should check if we can identify the specific ID.
          // Usually the ID is in the GD2 note too.
          // Let's assume the ID in the note is the one we want to remove.
          const groupTagMatch = (existing as any).note?.match(/\[[A-Z0-9]+\]/);
          if (groupTagMatch) {
            const tagToRemove = groupTagMatch[0];
            newNote = newNote.replace(tagToRemove, '').replace(/\s+/, ' ').trim();
            // Also remove "1." prefix if it was added?
            // The prefix "1." is usually added when creating the refund flow.
            // If we revert to original, maybe we should remove "1."?
            // Let's be safe and just remove the tag for now.
            // If the note becomes "1. Note", it's fine.
            if (newNote.startsWith('1. ')) {
              newNote = newNote.substring(3);
            }
          }
        }

        await (supabase.from('transactions').update as any)({ status: newStatus, note: newNote }).eq('id', gd1Id);

        for (const line of gd1Lines) {
          await (supabase.from('transaction_lines').update as any)({ metadata: newGd1Meta }).eq('id', line.id);
        }
      }
    }
  }

  const { error: updateError } = await (supabase.from('transactions').update as any)({ status: 'void' }).eq('id', id);

  if (updateError) {
    console.error('Failed to void transaction:', updateError);
    return false;
  }

  revalidatePath('/transactions');
  revalidatePath('/people');
  revalidatePath('/accounts');
  const personLine = lines.find((line) => line?.person_id);

  if (personLine?.person_id) {
    let shopName = (existing as any).shops?.name ?? null;
    if (!shopName) {
      const creditLine = lines.find(l => l.type === 'credit');
      if (creditLine?.accounts?.name) {
        shopName = creditLine.accounts.name;
      }
    }

    const payload = buildSheetPayload({ ...existing as any, shop_name: shopName }, personLine);
    if (payload) {
      try {
        await syncTransactionToSheet(personLine.person_id, payload, 'delete');
      } catch (err) {
        console.error('Sheet Sync Error (Void):', err);
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
      shop_id,
      shops ( name ),
      transaction_lines (
        amount,
        original_amount,
        cashback_share_percent,
        cashback_share_fixed,
        metadata,
        person_id,
        type,
        accounts ( name )
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
    let shopName = (existing as any).shops?.name ?? null;
    if (!shopName) {
      const creditLine = lines.find(l => l.type === 'credit');
      if (creditLine?.accounts?.name) {
        shopName = creditLine.accounts.name;
      }
    }
    const payload = buildSheetPayload({ ...existing as any, shop_name: shopName }, line);
    if (!payload) continue;
    try {
      await syncTransactionToSheet(line.person_id, payload, 'create');
    } catch (err) {
      console.error('Sheet Sync Error (Restore):', err);
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/people');
  revalidatePath('/accounts');

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
      shop_id,
      shops ( name ),
      transaction_lines (
        amount,
        original_amount,
        cashback_share_percent,
        cashback_share_fixed,
        metadata,
        person_id,
        type,
        accounts ( name )
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
    let shopName = (existingData as any).shops?.name ?? null;
    if (!shopName) {
      const creditLine = existingLines.find(l => l.type === 'credit');
      if (creditLine?.accounts?.name) {
        shopName = creditLine.accounts.name;
      }
    }
    const payload = buildSheetPayload({ ...existingData as any, shop_name: shopName }, line);
    if (!payload) continue;
    try {
      await syncTransactionToSheet(line.person_id, payload, 'delete');
    } catch (err) {
      console.error('Sheet Sync Error (Update/Delete):', err);
    }
  }

  if (input.type === 'repayment') {
    await syncRepaymentTransaction(supabase, id, input, linesWithId, shopInfo);
  } else {
    let shopName = shopInfo?.name ?? null;
    if (!shopName && input.source_account_id) {
      const { data: acc } = await supabase.from('accounts').select('name').eq('id', input.source_account_id).single();
      if (acc) shopName = (acc as any).name;
    }

    const syncBase = {
      id,
      occurred_at: input.occurred_at,
      note: input.note,
      tag,
      shop_name: shopName,
    };

    for (const line of linesWithId) {
      const personId = line.person_id;
      if (!personId) continue;

      const payload = buildSheetPayload(syncBase, line);
      if (!payload) continue;

      try {
        await syncTransactionToSheet(personId, payload, 'create');
      } catch (err) {
        console.error('Sheet Sync Error (Update/Create):', err);
      }
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
  accounts?: {
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
    line => line?.account_id === SYSTEM_ACCOUNTS.PENDING_REFUNDS
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

  // Generate Group ID (Short ID)
  // Generate Group ID (Short ID)
  const shortId = (existing as any).id.slice(0, 4).toUpperCase();
  const groupTag = `[${shortId}]`;

  // 0. Update Original Transaction Note with Sequence 1 if needed
  const originalNote = (existing as any).note ?? '';
  if (!originalNote.includes(groupTag)) {
    const newOriginalNote = `1.${groupTag} ${originalNote}`;
    await (supabase.from('transactions').update as any)({ note: newOriginalNote }).eq('id', transactionId);
  } else if (!originalNote.startsWith('1.')) {
    // If it has tag but no sequence, maybe add it? Or assume it's fine. 
    // Let's just prepend 1. if it's not there.
    const newOriginalNote = `1.${originalNote}`;
    await (supabase.from('transactions').update as any)({ note: newOriginalNote }).eq('id', transactionId);
  }

  const requestNote = options?.note
    ? `2.${groupTag} ${options.note}`
    : `2.${groupTag} Refund Request for ${originalNote}`

  const originalCashbackPercent = ((existing as any).transaction_lines as any[]).find((l: any) => typeof l.cashback_share_percent === 'number')?.cashback_share_percent;
  const originalCashbackFixed = ((existing as any).transaction_lines as any[]).find((l: any) => typeof l.cashback_share_fixed === 'number')?.cashback_share_fixed;

  // Prepare metadata for the new refund transaction lines
  const lineMetadata = {
    refund_status: 'requested',
    linked_transaction_id: transactionId,
    original_transaction_id: transactionId,
    refund_amount: requestedAmount,
    partial,
    original_note: (existing as any).note ?? null,
    cashback_share_percent: originalCashbackPercent,
    cashback_share_fixed: originalCashbackFixed,
  }

  const { data: requestTxn, error: createError } = await (supabase
    .from('transactions')
    .insert as any)({
      occurred_at: new Date().toISOString(),
      note: requestNote,
      status: 'pending',
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
    account_id: SYSTEM_ACCOUNTS.PENDING_REFUNDS,
    amount: requestedAmount, // Use Requested Amount (not Original Total) to balance the transaction
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
      refund_status: 'pending', // Force pending for request
      refund_flow_status: 'requested',
      status: 'waiting_refund', // Force waiting_refund for request
    })

    for (const line of originalLines) {
      if (!line?.id) continue
      await (supabase.from('transaction_lines').update as any)({ metadata: mergedOriginalMeta }).eq(
        'id',
        line.id
      )
    }

    // CRITICAL FIX: Update the HEADER status to 'waiting_refund' so the UI knows it's waiting.
    if (newRefundStatus === 'full' || newRefundStatus === 'partial') {
      await (supabase.from('transactions').update as any)({ status: 'waiting_refund' }).eq('id', transactionId);
    }

    // NEW LOGIC: Full Refund Cleanup - Unlink Person from Original Transaction
    if (newRefundStatus === 'full') {
      // Find person_id from original lines
      const personLine = lines.find(l => l.person_id);
      if (personLine?.person_id) {
        // Get person name for note
        const { data: personData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', personLine.person_id)
          .single();

        const personName = (personData as any)?.name || 'Unknown';

        // Update all lines to remove person_id
        for (const line of originalLines) {
          if (!line?.id) continue;
          await (supabase.from('transaction_lines').update as any)({
            person_id: null
          }).eq('id', line.id);
        }

        // Update transaction note to indicate debt was cancelled
        // Fetch the updated note (which now has "1.[ID]" prefix)
        const { data: updatedTxn } = await supabase
          .from('transactions')
          .select('note')
          .eq('id', transactionId)
          .single();

        const currentNote = (updatedTxn as any)?.note ?? (existing as any).note ?? '';
        const updatedNote = `${currentNote} [Cancelled Debt: ${personName}]`;
        await (supabase.from('transactions').update as any)({
          note: updatedNote
        }).eq('id', transactionId);
      }
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
    (line) => line?.account_id === SYSTEM_ACCOUNTS.PENDING_REFUNDS && line.type === 'debit'
  )

  console.log('ConfirmRefund Debug:', {
    pendingId: pendingTransactionId,
    pendingLines: (pending as any).transaction_lines,
    foundPendingLine: pendingLine,
    amountToConfirm: pendingLine ? Math.abs(pendingLine.amount) : 'N/A'
  });

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

  // Fetch original transaction to get shop_id
  let originalShopId = null;
  if (originalTransactionId) {
    const { data: originalTxn } = await supabase
      .from('transactions')
      .select('shop_id')
      .eq('id', originalTransactionId)
      .single();
    originalShopId = (originalTxn as any)?.shop_id ?? null;
  }

  // Extract Group ID from pending note if exists, or generate new one
  const pendingNote = (pending as any).note ?? '';
  const groupTagMatch = pendingNote.match(/\[[A-Z0-9]+\]/);
  const groupTag = groupTagMatch ? groupTagMatch[0] : `[${pendingTransactionId.slice(0, 4).toUpperCase()}]`;

  // Improved note format: "3.[ID] Confirmed Refund"
  const confirmNote = `3.${groupTag} Confirmed Refund`;

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
      status: 'completed', // Set to Completed as requested
      tag: (pending as any).tag,
      created_by: userId,
      shop_id: originalShopId ?? (pending as any).shop_id ?? null, // Use original shop_id if available
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
      category_id: REFUND_CATEGORY_ID, // Set Refund category
      amount: amountToConfirm,
      type: 'debit',
      metadata: confirmationMetadata,
    },
    {
      transaction_id: confirmTxn.id,
      account_id: SYSTEM_ACCOUNTS.PENDING_REFUNDS,
      category_id: REFUND_CATEGORY_ID, // Set Refund category
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

  // Update Pending Transaction Status to 'completed'
  const { error: updatePendingStatusError } = await (supabase
    .from('transactions')
    .update as any)({ status: 'completed' })
    .eq('id', pendingTransactionId)

  if (updatePendingStatusError) {
    console.error('Failed to update pending transaction status:', updatePendingStatusError)
  }

  // Update Original Transaction (GD1) Status to 'refunded' if fully refunded
  if (originalTransactionId) {
    const { data: gd1 } = await supabase
      .from('transactions')
      .select('transaction_lines')
      .eq('id', originalTransactionId)
      .single();

    if (gd1) {
      const gd1Lines = (gd1 as any).transaction_lines ?? [];
      const gd1Meta = extractLineMetadata(gd1Lines) as Record<string, any> || {};
      const currentRefunded = Number(gd1Meta.refunded_amount) || 0;
      // We just confirmed 'amountToConfirm'.
      // But wait, 'currentRefunded' in metadata might not be updated yet?
      // Actually, 'requestRefund' updates 'refunded_amount' immediately when requested.
      // So 'currentRefunded' should already include this amount (as requested).
      // We just need to check if it covers the full amount.
      // Let's check the original amount of GD1.

      // We need to fetch original amount.
      // We can sum up the lines of GD1.
      const originalTotal = gd1Lines.reduce((sum: number, line: any) => sum + Math.abs(line.original_amount || line.amount), 0);
      // Note: original_amount might be null if not set, fallback to amount.
      // But amount is signed. We want magnitude.
      // Actually, we should look for the expense/income lines.

      // Let's assume if refund_status is 'full' or if refunded_amount >= original_amount.
      // But we don't have original_amount easily here without calculation.

      // Simpler approach: If refund_status in metadata is 'full' or 'refunded', set status to 'refunded'.
      // But 'requestRefund' sets it to 'partial' or 'full' based on request.
      // If it was already 'waiting_refund', and now we confirm it...
      // The user wants GD1 to be 'refunded' (purple badge) if it's done.

      // Let's check if the refund status in metadata is 'full'.
      if (gd1Meta.refund_status === 'full' || gd1Meta.refund_status === 'refunded') {
        await (supabase.from('transactions').update as any)({ status: 'refunded' }).eq('id', originalTransactionId);
      } else {
        // If it's partial, maybe keep it as 'waiting_refund' or 'partial'?
        // User complained: "Refund 100%, giao dịch gốc sao lại Pending".
        // If 100%, it should be 'refunded'.

        // Let's force check amounts to be sure.
        // We need to fetch GD1 lines with amounts.
        const { data: gd1WithAmounts } = await supabase
          .from('transactions')
          .select('transaction_lines(amount, type)')
          .eq('id', originalTransactionId)
          .single();

        if (gd1WithAmounts) {
          const lines = (gd1WithAmounts as any).transaction_lines ?? [];
          // Sum of absolute amounts of all lines? No, that's double counting (debit+credit).
          // Just take the max amount? Or sum of debits?
          // For a normal expense, it's sum of credits (money leaving).
          // For income, sum of debits.
          const totalOriginal = lines.reduce((sum: number, l: any) => sum + Math.abs(l.amount), 0) / 2; // Rough estimate

          if (currentRefunded >= totalOriginal * 0.99) { // Tolerance for float
            await (supabase.from('transactions').update as any)({ status: 'refunded' }).eq('id', originalTransactionId);
          }
        }
      }
    }
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

      // Update Original Transaction Status
      // If full refund -> 'refunded'
      // If partial refund -> 'posted' (Active) - because it's still an active transaction, just partially refunded.
      // We do NOT want it to stay 'waiting_refund'.
      if (updatedStatus === 'full') {
        await (supabase.from('transactions').update as any)({ status: 'refunded' }).eq('id', originalTransactionId)
      } else {
        // For partial or none, revert to 'posted' so it shows as Active (with Partial tag if applicable)
        await (supabase.from('transactions').update as any)({ status: 'posted' }).eq('id', originalTransactionId)
      }

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
        (line: any) => line?.account_id === SYSTEM_ACCOUNTS.PENDING_REFUNDS && line.type === 'debit'
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
  personId?: string
  limit?: number
  context?: 'person' | 'account'
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
  const personId = parsed.personId
  const limit = parsed.limit ?? limitArg
  const context = parsed.context

  let accountInfo: { type: string; cashback_config: Json | null } | undefined
  if (accountId) {
    const { data: accData } = await supabase
      .from('accounts')
      .select('type, cashback_config')
      .eq('id', accountId)
      .maybeSingle()
    if (accData) {
      accountInfo = accData
    }
  }

  if (accountId || personId) {
    let query = supabase
      .from('transaction_lines')
      .select('transaction_id, transactions!inner(occurred_at, note)')

    if (context === 'person') {
      const conditions: string[] = []
      if (accountId) conditions.push(`account_id.eq.${accountId}`)
      if (accountId) conditions.push(`person_id.eq.${accountId}`)
      if (personId) conditions.push(`person_id.eq.${personId}`)
      // Also check if account_id matches personId (in case personId IS the debt account id, though unlikely if distinct)
      if (personId && personId !== accountId) conditions.push(`account_id.eq.${personId}`)

      if (conditions.length > 0) {
        query = query.or(conditions.join(','))
      }
    } else if (accountId) {
      query = query.eq('account_id', accountId)
    }

    const { data: txnIds, error: idsError } = await query
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

    return (data as any[]).map(txn =>
      mapTransactionRow(txn, accountId, { mode: context ?? 'account', accountInfo })
    )
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

export async function deleteTransaction(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('transactions').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete transaction:', error);
    return false;
  }
  return true;
}
