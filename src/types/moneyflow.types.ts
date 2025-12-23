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
  icon?: string | null
  image_url?: string | null
  mcc_codes?: string[] | null
}

export type Shop = {
  id: string
  name: string
  logo_url?: string | null
  default_category_id?: string | null
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
  logo_url?: string | null;
  total_in?: number;
  total_out?: number;
}

export type AccountCashbackSnapshot = {
  remainingBudget: number | null
  maxCashback: number | null
  progress: number
  currentSpend: number
  cycleLabel?: string
  earnedSoFar: number
}

export type DebtAccount = {
  id: string;
  name: string;
  current_balance: number;
  owner_id: string | null;
  avatar_url?: string | null;
  sheet_link?: string | null;
}

export type MonthlyDebtSummary = {
  tag?: string | null
  tagLabel: string
  amount: number        // Remains (Net: Lent - Repaid)
  total_debt: number   // Total Lent
  total_repaid: number // Total Repaid
  occurred_at?: string | null
}

export type Person = {
  id: string
  name: string
  email?: string | null
  avatar_url?: string | null
  sheet_link?: string | null
  debt_account_id?: string | null
  balance?: number | null
  is_owner?: boolean | null
  is_archived?: boolean | null
  subscription_ids?: string[]
  subscription_count?: number
  subscription_details?: { id: string; name: string; slots: number }[]
  monthly_debts?: MonthlyDebtSummary[]
}

export type SubscriptionMember = {
  profile_id: string
  fixed_amount?: number | null
  slots?: number | null
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
  shop_id?: string | null
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
  accounts: Pick<AccountRow, 'name' | 'logo_url' | 'type'> | null;
  categories: Pick<CategoryRow, 'name' | 'type'> & { image_url?: string | null; icon?: string | null } | null;
  profiles?: { name?: string | null; avatar_url?: string | null } | null;
  people?: { name?: string | null; avatar_url?: string | null } | null;
  person_id?: string | null;
}

export type TransactionWithDetails = TransactionRow & {
  amount: number
  transaction_lines?: TransactionWithLineRelations[];
  totalAmount?: number; // For aggregated display
  displayType?: 'income' | 'expense' | 'transfer';
  display_type?: 'IN' | 'OUT' | 'TRANSFER';
  displayCategoryName?: string;
  displayAccountName?: string;
  category_name?: string;
  category_icon?: string | null;
  category_image_url?: string | null;
  account_name?: string;
  source_name?: string | null;
  destination_name?: string | null;
  source_logo?: string | null;
  destination_logo?: string | null;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  cashback_share_amount?: number | null;
  original_amount?: number | null;
  type?: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment';
  person_id?: string | null;
  person_name?: string | null;
  person_avatar_url?: string | null;
  category_id?: string | null;
  persisted_cycle_tag?: string | null;
  shop_id?: string | null;
  shop_name?: string | null;
  shop_logo_url?: string | null;
  metadata?: Json | null;
  source_account_name?: string | null;
  destination_account_name?: string | null;
  profit?: number;
  bank_back?: number;
  bank_rate?: number;
  people_rate?: number;
}
