'use server';

import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { Transaction, TransactionLine, TransactionWithDetails } from '@/types/moneyflow.types';

export type CreateTransactionInput = {
  occurred_at: string;
  note: string;
  type: 'expense' | 'income' | 'debt';
  source_account_id: string;
  destination_account_id?: string;
  category_id?: string;
  debt_account_id?: string;
  amount: number;
  tag: string; // Thêm trường tag
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

// Function to generate tag based on date
function generateTag(date: Date): string {
  return format(date, 'MMMyy').toUpperCase();
}

export async function createTransaction(input: CreateTransactionInput): Promise<boolean> {
  const supabase = createClient();
  
  // Sử dụng tag từ input thay vì tạo tự động
  const tag = input.tag;

  const lines: Omit<TransactionLine, 'id' | 'transaction_id'>[] = [];

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
  } else if (input.type === 'debt' && input.debt_account_id) {
    const amount = Math.abs(input.amount);
    const sharePercent = Math.min(
      100,
      Math.max(0, Number(input.cashback_share_percent ?? 0))
    );
    const shareFixed = Math.max(0, Number(input.cashback_share_fixed ?? 0));
    const percentContribution = (sharePercent / 100) * amount;
    const rawCashback = percentContribution + shareFixed;
    const cashbackGiven = Math.min(amount, Math.max(0, rawCashback));
    const debtAmount = Math.max(0, amount - cashbackGiven);
    const hasShareInput = sharePercent > 0 || shareFixed > 0;

    const shareMetadata = hasShareInput
      ? {
          cashback_share_percent: sharePercent,
          cashback_share_fixed: shareFixed,
          cashback_share_amount: cashbackGiven,
        }
      : undefined;

    lines.push({
      account_id: input.source_account_id,
      amount: -amount,
      type: 'credit',
      metadata: shareMetadata,
    });
    lines.push({
      account_id: input.debt_account_id,
      amount: debtAmount,
      type: 'debit',
      metadata: shareMetadata,
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
      tag: tag, // Add the generated tag
    })
    .select()
    .single();

  if (txnError || !txn) {
    console.error('Error creating transaction header:', txnError);
    return false;
  }

  const linesWithId = lines.map(l => ({ ...l, transaction_id: txn.id }));
  const { error: linesError } = await supabase.from('transaction_lines').insert(linesWithId);

  if (linesError) {
    console.error('Error creating transaction lines:', linesError);
    return false;
  }

  return true;
}

type TransactionLineWithRelations = TransactionLine & {
  accounts?: { name: string } | null;
  categories?: { name: string } | null;
};

type TransactionRow = Transaction & {
  transaction_lines?: TransactionLineWithRelations[];
};

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
        category_id,
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

  return rows.map(txn => {
    const lines = txn.transaction_lines ?? [];
    const displayAmount =
      lines.reduce((sum, line) => sum + Math.abs(line.amount), 0) / 2;

    let type: 'income' | 'expense' | 'transfer' = 'transfer';
    let categoryName: string | undefined;
    let accountName: string | undefined;

    const categoryLine = lines.find(line => Boolean(line.category_id));
    const creditAccountLine = lines.find(
      line => line.account_id && line.type === 'credit'
    );
    const debitAccountLine = lines.find(
      line => line.account_id && line.type === 'debit'
    );

    if (categoryLine) {
      categoryName = categoryLine.categories?.name;
      if (categoryLine.type === 'debit') {
        type = 'expense';
        accountName = creditAccountLine?.accounts?.name;
      } else {
        type = 'income';
        accountName = debitAccountLine?.accounts?.name;
      }
    } else {
      accountName = debitAccountLine?.accounts?.name ?? creditAccountLine?.accounts?.name;
    }

    return {
      id: txn.id,
      occurred_at: txn.occurred_at,
      note: txn.note,
      amount: displayAmount,
      type,
      category_name: categoryName,
      account_name: accountName,
    };
  });
}