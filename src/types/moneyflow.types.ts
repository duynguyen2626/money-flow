import { Json, Database } from '@/types/database.types'

export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"]
export type AccountRow = Database["public"]["Tables"]["accounts"]["Row"]
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"]

export type Category = {
  id: string
  name: string
  type: 'expense' | 'income' | 'transfer'
  parent_id?: string | null
  icon?: string | null
  image_url?: string | null
  mcc_codes?: string[] | null
  kind?: 'internal' | 'external' | null
}

export type Shop = {
  id: string
  name: string
  image_url?: string | null
  default_category_id?: string | null
}

export type AccountStats = {
  usage_percent: number // Credit Utilization Ratio
  remaining_limit: number // Available to spend
  spent_this_cycle: number
  min_spend: number | null
  missing_for_min: number | null
  is_qualified: boolean
  cycle_range: string
  due_date_display: string | null
  remains_cap: number | null
  shared_cashback: number | null
  due_date: string | null // ISO Date string for sorting
}

export type AccountRelationships = {
  is_parent: boolean
  child_count: number
  child_accounts: { id: string; name: string; avatar_url: string | null }[]
  parent_info: { id: string; name: string; type: Account['type']; avatar_url: string | null } | null
}

export type Account = {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'credit_card' | 'ewallet' | 'debt' | 'savings' | 'investment' | 'asset' | 'system';
  currency: string;
  current_balance: number;
  credit_limit?: number;
  parent_account_id?: string | null;
  account_number?: string | null;
  owner_id: string;
  cashback_config?: Json | null;
  cashback_config_version?: number;
  secured_by_account_id?: string | null;
  is_active?: boolean | null;
  image_url?: string | null;
  total_in?: number;
  total_out?: number;
  annual_fee?: number | null;
  stats?: AccountStats | null;
  relationships?: AccountRelationships | null;
}

export type AccountCashbackSnapshot = {
  remainingBudget: number | null
  maxCashback: number | null
  progress: number
  currentSpend: number
  cycleLabel?: string
  earnedSoFar: number
  // Expanded for transparent UI
  min_spend_required?: number | null
  total_spend_eligible?: number
  is_min_spend_met?: boolean
  missing_min_spend?: number | null
  potential_earned?: number
}

export type DebtAccount = {
  id: string;
  name: string;
  current_balance: number;
  owner_id: string | null;
  avatar_url?: string | null;
  sheet_link?: string | null;
  google_sheet_url?: string | null;
}

export type MonthlyDebtSummary = {
  tag?: string
  tagLabel: string
  amount: number // This is BALANCE (Net Debt - Repaid)
  occurred_at?: string
  status?: string // 'active' | 'settled'
  last_activity?: string
  total_debt?: number // Gross accumulated debt (before cashback)
  total_repaid?: number // Total amount repaid
  total_cashback?: number // Total cashback accumulated
}

export type PersonCycleSheet = {
  id: string
  person_id: string
  cycle_tag: string
  sheet_id?: string | null
  sheet_url?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type Person = {
  id: string
  created_at?: string
  name: string
  email?: string | null
  avatar_url?: string | null

  sheet_link?: string | null
  google_sheet_url?: string | null
  debt_account_id?: string | null
  balance?: number | null
  is_owner?: boolean | null
  is_archived?: boolean | null
  subscription_ids?: string[]
  subscription_count?: number
  subscription_details?: { id: string; name: string; slots: number; image_url?: string | null }[]
  monthly_debts?: MonthlyDebtSummary[]
  cycle_sheets?: PersonCycleSheet[]
  current_cycle_debt?: number | null
  outstanding_debt?: number | null
  current_cycle_label?: string | null
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

// TransactionLine type removed as it is no longer supported by the schema.

export type TransactionWithLineRelations = {
  id: string;
  transaction_id?: string;
  account_id?: string | null;
  category_id?: string | null;
  person_id?: string | null;
  amount: number;
  type: 'debit' | 'credit';
  original_amount?: number | null;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  metadata?: Json | null;
  accounts: Pick<AccountRow, 'name' | 'image_url' | 'type'> | null;
  categories: Pick<CategoryRow, 'name' | 'type'> & { image_url?: string | null; icon?: string | null } | null;
  profiles?: { name?: string | null; avatar_url?: string | null } | null;
  people?: { name?: string | null; avatar_url?: string | null } | null;
}

export type CashbackMode = 'none_back' | 'real_fixed' | 'real_percent' | 'voluntary'

export type CashbackEntry = Database['public']['Tables']['cashback_entries']['Row']
export type CashbackCycle = Database['public']['Tables']['cashback_cycles']['Row']

export type TransactionWithDetails = TransactionRow & {
  amount: number
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
  source_image?: string | null;
  destination_image?: string | null;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  cashback_share_amount?: number | null;

  // MF5.2 Cashback Mode
  cashback_mode?: CashbackMode | null
  final_price?: number | null;
  original_amount?: number | null;
  type?: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment';
  person_id?: string | null;
  person_name?: string | null;
  person_avatar_url?: string | null;
  category_id?: string | null;
  persisted_cycle_tag?: string | null;
  shop_id?: string | null;
  shop_name?: string | null;
  shop_image_url?: string | null;
  metadata?: Json | null;
  source_account_name?: string | null;
  destination_account_name?: string | null;
  profit?: number;
  bank_back?: number;
  bank_rate?: number;
  people_rate?: number;
  is_installment?: boolean | null;
  installment_plan_id?: string | null;
  source_account_id?: string | null;
  destination_account_id?: string | null;
  target_account_id?: string | null;
  history_count?: number;
}

export type CashbackCard = {
  accountId: string
  accountName: string
  type: string
  cycleLabel: string
  progress: number
  currentSpend: number
  minSpend: number
  maxCashback: number
  earnedSoFar: number
  remainingBudget: number
  rate: number
  image_url?: string | null
}
