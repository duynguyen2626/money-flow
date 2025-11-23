
'use server';

import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { Json } from '@/types/database.types';
import { TransactionLine, TransactionWithDetails, TransactionWithLineRelations } from '@/types/moneyflow.types';
import { syncTransactionToSheet } from './sheet.service';

export type CreateTransactionInput = {
  occurred_at: string;
  note: string;
  type: 'expense' | 'income' | 'debt' | 'transfer';
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
};

async function resolveDiscountCategoryId(
  supabase: ReturnType<typeof createClient>,
  overrideCategoryId?: string
): Promise<string | null> {
  if (overrideCategoryId) {
    return overrideCategoryId;
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'Discount Given')
    .eq('type', 'expense')
    .limit(1);

  if (error) {
    console.error('Error fetching Discount Given category:', error);
    return null;
  }

  const rows = (data ?? []) as { id: string }[];
  return rows[0]?.id ?? null;
}

function generateTag(date: Date): string {
  return format(date, 'MMMyy').toUpperCase();
}

export async function createTransaction(input: CreateTransactionInput): Promise<boolean> {
  const supabase = createClient();

  const tag = input.tag;

  const lines: any[] = [];

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
      lines.push({
        category_id: discountCategoryId ?? undefined,
        amount: cashbackGiven,
        type: 'debit',
      });
    }
  } else {
    console.error('Invalid transaction type or missing data');
    return false;
  }

  const { data: txn, error: txnError } = await (supabase
    .from('transactions')
    .insert as any)({
      occurred_at: input.occurred_at,
      note: input.note,
      status: 'posted',
      tag: tag,
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

  const syncBase = {
    id: txn.id,
    occurred_at: input.occurred_at,
    note: input.note,
    tag,
  };

  for (const line of linesWithId) {
    const personId = (line as { person_id?: string | null }).person_id;
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

  return true;
}

type TransactionRow = {
  id: string
  occurred_at: string
  note: string
  tag: string | null
  cashback_share_percent?: number | null
  cashback_share_fixed?: number | null
  cashback_share_amount?: number | null
  transaction_lines?: Array<{
    amount: number
    type: 'debit' | 'credit'
    account_id?: string | null
    category_id?: string | null
    person_id?: string | null
    original_amount?: number | null
    cashback_share_percent?: number | null
    cashback_share_fixed?: number | null
    profiles?: { name?: string | null } | null
    accounts?: {
      name: string
    } | null
    categories?: {
      name: string
    } | null
    metadata?: Json | null
  } | null>
}

function extractCashbackFromLines(lines: TransactionRow['transaction_lines']): {
  cashback_share_percent?: number
  cashback_share_fixed?: number
  cashback_share_amount?: number
  original_amount?: number
} {
  for (const line of lines ?? []) {
    const meta = (line?.metadata as Record<string, unknown> | null) ?? null
    const readMetaNumber = (key: string) => {
      if (!meta) return undefined
      const value = meta[key]
      return typeof value === 'number' ? value : undefined
    }
    const percent =
      typeof line?.cashback_share_percent === 'number'
        ? line.cashback_share_percent
        : readMetaNumber('cashback_share_percent')
    const fixed =
      typeof line?.cashback_share_fixed === 'number'
        ? line.cashback_share_fixed
        : readMetaNumber('cashback_share_fixed')
    const amount = readMetaNumber('cashback_share_amount')
    const original_amount = typeof line?.original_amount === 'number' ? line.original_amount : undefined
    if (percent !== undefined || fixed !== undefined || amount !== undefined || original_amount !== undefined) {
      return { cashback_share_percent: percent, cashback_share_fixed: fixed, cashback_share_amount: amount, original_amount }
    }
  }
  return {}
}

function mapTransactionRow(txn: TransactionRow, accountId?: string): TransactionWithDetails {
  const lines = txn.transaction_lines ?? []
  const cashbackFromLines = extractCashbackFromLines(lines)

  // Prioritize finding the line with debt/cashback info (original_amount is a good marker)
  let accountLine = lines.find(line => line && typeof line.original_amount === 'number');

  // If no specific debt line, fall back to the original logic
  if (!accountLine) {
      accountLine = accountId
      ? lines.find(line => line && line.account_id === accountId)
      : lines.find(line => line && line.type === 'credit') // Assume the credit line is the source account for general transactions
  }
  
  const displayAmount =
    typeof accountLine?.amount === 'number'
      ? accountLine.amount
      : lines.reduce((sum, line) => sum + (line ? Math.abs(line.amount) : 0), 0) / 2

  let type: 'income' | 'expense' | 'transfer' = 'transfer'
  let categoryName: string | undefined
  let accountName: string | undefined

  const categoryLine = lines.find(line => line && Boolean(line.category_id))
  const creditAccountLine = lines.find(
    line => line && line.account_id && line.type === 'credit'
  ) as (typeof lines)[0] | undefined
  const debitAccountLine = lines.find(
    line => line && line.account_id && line.type === 'debit'
  ) as (typeof lines)[0] | undefined

  if (categoryLine) {
    categoryName = categoryLine.categories?.name
    if (categoryLine.type === 'debit') {
      type = 'expense'
      accountName = creditAccountLine?.accounts?.name
    } else {
      type = 'income'
      accountName = debitAccountLine?.accounts?.name
    }
  } else {
    // For transfers, show the other account
    if (accountId) {
        const otherLine = lines.find(line => line && line.account_id !== accountId)
        accountName = otherLine?.accounts?.name
    } else {
        accountName = debitAccountLine?.accounts?.name ?? creditAccountLine?.accounts?.name
    }
  }

  if (accountLine?.amount !== undefined) {
    type = accountLine.amount >= 0 ? 'income' : 'expense'
  }

  const percentRaw = txn.cashback_share_percent ?? cashbackFromLines.cashback_share_percent
  const cashbackAmount = txn.cashback_share_amount ?? cashbackFromLines.cashback_share_amount
  const personLine = lines.find(line => line && line.person_id)
  const categoryId = categoryLine?.category_id ?? null

  return {
    id: txn.id,
    occurred_at: txn.occurred_at,
    note: txn.note || null,
    status: (txn as any).status as 'posted' | 'pending' | 'void',
    tag: txn.tag || null,
    created_at: (txn as any).created_at,
    amount: displayAmount,
    type: type,
    category_name: categoryLine?.categories?.name,
    account_name: accountName,
    category_id: categoryId,
    cashback_share_percent: percentRaw ?? null,
    cashback_share_fixed: txn.cashback_share_fixed ?? cashbackFromLines.cashback_share_fixed ?? null,
    cashback_share_amount: cashbackAmount ?? null,
    original_amount: accountLine?.original_amount ?? null,
    person_id: personLine?.person_id ?? null,
    person_name: (personLine as any)?.people?.name ?? null,
    persisted_cycle_tag: (txn as any).metadata?.persisted_cycle_tag ?? null,
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
        profiles ( name ),
        accounts (name),
        categories (name)
      )
    `)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent transactions:', error);
    return [];
  }

  const rows = (data ?? []) as TransactionRow[];

  return rows.map(txn => mapTransactionRow(txn));
}
