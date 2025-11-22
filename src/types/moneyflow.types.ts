import { Json, Database } from '@/types/database.types'

export type TransactionLineRow = Database["public"]["Tables"]["transaction_lines"]["Row"]
export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"]
export type AccountRow = Database["public"]["Tables"]["accounts"]["Row"]
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"]

export type Category = {
  id: string
  name: string
  type: 'expense' | 'income'
  parent_id?: string | null
}

export type Account = {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'credit_card' | 'ewallet' | 'debt' | 'savings' | 'investment' | 'asset';
  currency: string;
  current_balance: number;
  credit_limit?: number;
  owner_id: string;
  cashback_config?: Json | null;
  secured_by_account_id?: string | null;
  is_active?: boolean | null;
  img_url?: string | null;
  logo_url?: string | null;
}

export type AccountCashbackSnapshot = {
  remainingBudget: number | null
  maxCashback: number | null
  progress: number
  currentSpend: number
  cycleLabel?: string
}

export type DebtAccount = {
  id: string;
  name: string;
  current_balance: number;
  owner_id: string | null;
  avatar_url?: string | null;
  sheet_link?: string | null;
}

export type Person = {
  id: string
  name: string
  email?: string | null
  avatar_url?: string | null
  sheet_link?: string | null
  debt_account_id?: string | null
  subscription_ids?: string[]
  subscription_count?: number
}

export type SubscriptionMember = {
  profile_id: string
  fixed_amount?: number | null
  profile_name?: string | null
  avatar_url?: string | null
  debt_account_id?: string | null
}

export type Subscription = {
  id: string
  name: string
  price?: number | null
  next_billing_date?: string | null
  is_active?: boolean | null
  payment_account_id?: string | null
  note_template?: string | null
  members?: SubscriptionMember[]
}

export type TransactionLine = {
  id: string;
  transaction_id: string;
  account_id?: string;
  category_id?: string;
  metadata?: Json | null;
  original_amount?: number | null;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  amount: number;
  type: 'debit' | 'credit';
  description?: string;
}

export type TransactionWithLineRelations = TransactionLineRow & {
  accounts: Pick<AccountRow, 'name'> | null;
  categories: Pick<CategoryRow, 'name'> | null;
}

export type TransactionWithDetails = TransactionRow & {
  amount: number
  transaction_lines?: TransactionWithLineRelations[];
  totalAmount?: number; // For aggregated display
  displayType?: 'income' | 'expense' | 'transfer';
  displayCategoryName?: string;
  displayAccountName?: string;
  category_name?: string;
  account_name?: string;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  cashback_share_amount?: number | null;
  original_amount?: number | null;
  type?: 'income' | 'expense' | 'transfer';
  person_id?: string | null;
  person_name?: string | null;
  category_id?: string | null;
  persisted_cycle_tag?: string | null;
}
