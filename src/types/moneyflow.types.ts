export type Account = {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'credit_card' | 'ewallet' | 'debt';
  currency: string;
  current_balance: number;
  credit_limit?: number;
  owner_id: string;
}

export type TransactionLine = {
  id: string;
  transaction_id: string;
  account_id?: string;
  category_id?: string;
  amount: number;
  type: 'debit' | 'credit';
  description?: string;
}

export type Transaction = {
  id: string;
  occurred_at: string;
  note: string;
  status: 'posted' | 'pending' | 'void';
  transaction_lines?: TransactionLine[];
}

export type Category = {
  id: string;
  name: string;
  type: 'expense' | 'income';
  parent_id?: string;
}

export type TransactionWithDetails = {
  id: string;
  occurred_at: string;
  note: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category_name?: string;
  account_name?: string;
}
