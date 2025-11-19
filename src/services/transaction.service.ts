'use server'

import { createClient } from '@/lib/supabase/server'
import { Transaction, TransactionLine } from '@/types/moneyflow.types'

export type CreateTransactionInput = {
  occurred_at: string;
  note: string;
  type: 'expense' | 'income' | 'debt';
  source_account_id: string;
  destination_account_id?: string; // For transfers
  category_id?: string; // For expense/income
  debt_account_id?: string; // For debt/lending
  amount: number;
};

export async function createTransaction(input: CreateTransactionInput): Promise<boolean> {
  const supabase = createClient();

  // 1. Prepare lines based on type
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
    // This assumes you have a way to get the debt account of a person
    lines.push({
      account_id: input.source_account_id,
      amount: -Math.abs(input.amount),
      type: 'credit',
    });
    lines.push({
      account_id: input.debt_account_id,
      amount: Math.abs(input.amount),
      type: 'debit',
    });
  } else {
    console.error('Invalid transaction type or missing data');
    return false;
  }

  // 2. Insert Header to 'transactions' table
  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .insert({
      occurred_at: input.occurred_at,
      note: input.note,
      status: 'posted',
    })
    .select()
    .single();

  if (txnError || !txn) {
    console.error('Error creating transaction header:', txnError);
    return false;
  }

  // 3. Insert Lines to 'transaction_lines' table with txn.id
  const linesWithId = lines.map(l => ({ ...l, transaction_id: txn.id }));
  const { error: linesError } = await supabase.from('transaction_lines').insert(linesWithId);

  if (linesError) {
    console.error('Error creating transaction lines:', linesError);
    // TODO: Consider deleting the transaction header if lines fail
    return false;
  }

  return true;
}