
'use server';

import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { TransactionInsert, TransactionLineInsert, TransactionRow as DatabaseTransactionRow } from '@/types/database.types';
import { TransactionLine, TransactionWithDetails, TransactionWithLineRelations } from '@/types/moneyflow.types';

export type CreateTransactionInput = {
  occurred_at: string;
  note: string;
  type: 'expense' | 'income' | 'debt' | 'transfer';
  source_account_id: string;
  destination_account_id?: string;
  category_id?: string;
  debt_account_id?: string;
  amount: number;
  tag: string;
  cashback_share_percent?: number;
  cashback_share_fixed?: number;
  discount_category_id?: string;
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

  const lines: Omit<TransactionLineInsert, 'transaction_id'>[] = [];

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
    });

    if (cashbackGiven > 0) {
      const discountCategoryId = await resolveDiscountCategoryId(
        supabase,
        input.discount_category_id
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

  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .insert({
      occurred_at: input.occurred_at,
      note: input.note,
      status: 'posted',
      tag: tag,
    } as TransactionInsert)
    .select()
    .single();

  if (txnError || !txn) {
    console.error('Error creating transaction header:', txnError);
    return false;
  }

  const linesWithId = lines.map(l => ({ ...l, transaction_id: txn.id }));
  const { error: linesError } = await supabase.from('transaction_lines').insert(linesWithId as TransactionLineInsert[]);

  if (linesError) {
    console.error('Error creating transaction lines:', linesError);
    return false;
  }

  return true;
}

export async function getRecentTransactions(limit: number = 10): Promise<TransactionWithDetails[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      transaction_lines (
        *,
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

  const rows = (data ?? []) as (DatabaseTransactionRow & { transaction_lines: TransactionWithLineRelations[] })[];

  return rows.map(txn => {
    const lines = txn.transaction_lines ?? [];
    const totalAmount =
      lines.reduce((sum, line) => sum + Math.abs(line.amount), 0) / 2;

    let displayType: 'income' | 'expense' | 'transfer' = 'transfer';
    let displayCategoryName: string | undefined;
    let displayAccountName: string | undefined;

    const categoryLine = lines.find(line => Boolean(line.category_id));
    const creditAccountLine = lines.find(
      line => line.account_id && line.type === 'credit'
    );
    const debitAccountLine = lines.find(
      line => line.account_id && line.type === 'debit'
    );

    if (categoryLine) {
      displayCategoryName = categoryLine.categories?.name;
      if (categoryLine.type === 'debit') {
        displayType = 'expense';
        displayAccountName = creditAccountLine?.accounts?.name;
      } else {
        displayType = 'income';
        displayAccountName = debitAccountLine?.accounts?.name;
      }
    } else {
      displayAccountName = debitAccountLine?.accounts?.name ?? creditAccountLine?.accounts?.name;
    }

    return {
      ...txn,
      totalAmount,
      displayType,
      displayCategoryName,
      displayAccountName,
    };
  });
}
