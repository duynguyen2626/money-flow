export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          type: 'bank' | 'cash' | 'credit_card' | 'ewallet' | 'debt' | 'savings' | 'investment' | 'asset'
          currency: string | null
          credit_limit: number | null
          current_balance: number | null
          owner_id: string | null
          cashback_config: Json | null
          is_active: boolean | null
          created_at: string
          secured_by_account_id: string | null
          logo_url: string | null
        }
        Insert: {
          id?: string
          name: string
          type: 'bank' | 'cash' | 'credit_card' | 'ewallet' | 'debt' | 'savings' | 'investment' | 'asset'
          currency?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          owner_id?: string | null
          cashback_config?: Json | null
          is_active?: boolean | null
          created_at?: string
          secured_by_account_id?: string | null
          logo_url?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: 'bank' | 'cash' | 'credit_card' | 'ewallet' | 'debt' | 'savings' | 'investment' | 'asset'
          currency?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          owner_id?: string | null
          cashback_config?: Json | null
          is_active?: boolean | null
          created_at?: string
          secured_by_account_id?: string | null
          logo_url?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          occurred_at: string
          note: string | null
          amount: number
          type: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'
          account_id: string
          target_account_id: string | null
          category_id: string | null
          person_id: string | null
          metadata: Json | null
          created_by: string | null
          status: 'posted' | 'pending' | 'void' | 'waiting_refund' | 'refunded' | 'completed'
          tag: string | null
          created_at: string
          shop_id: string | null
          persisted_cycle_tag: string | null
          is_installment: boolean | null
          installment_plan_id: string | null
        }
        Insert: {
          id?: string
          occurred_at: string
          note?: string | null
          amount: number
          type: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'
          account_id: string
          target_account_id?: string | null
          category_id?: string | null
          person_id?: string | null
          metadata?: Json | null
          created_by?: string | null
          status?: 'posted' | 'pending' | 'void' | 'waiting_refund' | 'refunded' | 'completed'
          tag?: string | null
          created_at?: string
          shop_id?: string | null
          persisted_cycle_tag?: string | null
          is_installment?: boolean | null
          installment_plan_id?: string | null
        }
        Update: {
          id?: string
          occurred_at?: string
          note?: string | null
          amount?: number
          type?: 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'
          account_id?: string
          target_account_id?: string | null
          category_id?: string | null
          person_id?: string | null
          metadata?: Json | null
          created_by?: string | null
          status?: 'posted' | 'pending' | 'void' | 'waiting_refund' | 'refunded' | 'completed'
          tag?: string | null
          created_at?: string
          shop_id?: string | null
          persisted_cycle_tag?: string | null
          is_installment?: boolean | null
          installment_plan_id?: string | null
        }
      }
      shops: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          default_category_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          default_category_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          default_category_id?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      transaction_lines: {
        Row: {
          id: string
          transaction_id: string
          account_id: string | null
          category_id: string | null
          amount: number
          type: 'debit' | 'credit'
          original_amount: number | null
          cashback_share_percent: number | null
          cashback_share_fixed: number | null
          metadata: Json | null
          created_at: string
          bank_name: string | null
          bank_number: string | null
          card_name: string | null
          receiver_name: string | null
        }
        Insert: {
          id?: string
          transaction_id: string
          account_id?: string | null
          category_id?: string | null
          amount: number
          type: 'debit' | 'credit'
          original_amount?: number | null
          cashback_share_percent?: number | null
          cashback_share_fixed?: number | null
          metadata?: Json | null
          created_at?: string
          bank_name?: string | null
          bank_number?: string | null
          card_name?: string | null
          receiver_name?: string | null
        }
        Update: {
          id?: string
          transaction_id?: string
          account_id?: string | null
          category_id?: string | null
          amount?: number
          type?: 'debit' | 'credit'
          original_amount?: number | null
          cashback_share_percent?: number | null
          cashback_share_fixed?: number | null
          metadata?: Json | null
          created_at?: string
          bank_name?: string | null
          bank_number?: string | null
          card_name?: string | null
          receiver_name?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          type: 'expense' | 'income'
          parent_id: string | null
          icon: string | null
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'expense' | 'income'
          parent_id?: string | null
          icon?: string | null
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'expense' | 'income'
          parent_id?: string | null
          icon?: string | null
          logo_url?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          name: string
          email: string | null
          avatar_url: string | null
          sheet_link: string | null
          created_at: string
          is_owner: boolean | null
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          avatar_url?: string | null
          sheet_link?: string | null
          created_at?: string
          is_owner?: boolean | null
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          avatar_url?: string | null
          sheet_link?: string | null
          created_at?: string
          is_owner?: boolean | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          name: string
          price: number | null
          next_billing_date: string | null
          is_active: boolean | null
          payment_account_id: string | null
          note_template: string | null
          created_at: string
          shop_id: string | null
          max_slots: number | null
        }
        Insert: {
          id?: string
          name: string
          price?: number | null
          next_billing_date?: string | null
          is_active?: boolean | null
          payment_account_id?: string | null
          note_template?: string | null
          created_at?: string
          shop_id?: string | null
          max_slots?: number | null
        }
        Update: {
          id?: string
          name?: string
          price?: number | null
          next_billing_date?: string | null
          is_active?: boolean | null
          payment_account_id?: string | null
          note_template?: string | null
          created_at?: string
          shop_id?: string | null
          max_slots?: number | null
        }
      }
      subscription_members: {
        Row: {
          id: string
          subscription_id: string
          profile_id: string
          fixed_amount: number | null
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          profile_id: string
          fixed_amount?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          profile_id?: string
          fixed_amount?: number | null
          created_at?: string
        }
      }
      batches: {
        Row: {
          id: string
          name: string
          source_account_id: string | null
          sheet_link: string | null
          display_link: string | null
          sheet_name: string | null
          created_at: string
          updated_at: string
          status: string | null
          is_template: boolean | null
          auto_clone_day: number | null
          last_cloned_month_tag: string | null
        }
        Insert: {
          id?: string
          name: string
          source_account_id?: string | null
          sheet_link?: string | null
          display_link?: string | null
          sheet_name?: string | null
          created_at?: string
          updated_at?: string
          status?: string | null
          is_template?: boolean | null
          auto_clone_day?: number | null
          last_cloned_month_tag?: string | null
        }
        Update: {
          id?: string
          name?: string
          source_account_id?: string | null
          sheet_link?: string | null
          display_link?: string | null
          sheet_name?: string | null
          created_at?: string
          updated_at?: string
          status?: string | null
          is_template?: boolean | null
          auto_clone_day?: number | null
          last_cloned_month_tag?: string | null
        }
      }
      batch_items: {
        Row: {
          id: string
          batch_id: string
          receiver_name: string | null
          target_account_id: string | null
          amount: number
          note: string | null
          status: string | null
          created_at: string
          bank_name: string | null
          bank_number: string | null
          card_name: string | null
          transaction_id: string | null
          is_confirmed: boolean | null
        }
        Insert: {
          id?: string
          batch_id: string
          receiver_name?: string | null
          target_account_id?: string | null
          amount: number
          note?: string | null
          status?: string | null
          created_at?: string
          bank_name?: string | null
          bank_number?: string | null
          card_name?: string | null
          transaction_id?: string | null
          is_confirmed?: boolean | null
        }
        Update: {
          id?: string
          batch_id?: string
          receiver_name?: string | null
          target_account_id?: string | null
          amount?: number
          note?: string | null
          status?: string | null
          created_at?: string
          bank_name?: string | null
          bank_number?: string | null
          card_name?: string | null
          transaction_id?: string | null
          is_confirmed?: boolean | null
        }
      }
      bank_mappings: {
        Row: {
          id: string
          bank_code: string
          bank_name: string
          short_name: string
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bank_code: string
          bank_name: string
          short_name: string
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bank_code?: string
          bank_name?: string
          short_name?: string
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bot_configs: {
        Row: {
          key: string
          name: string | null
          is_enabled: boolean | null
          config: Json | null
          last_run_at: string | null
          created_at: string
        }
        Insert: {
          key: string
          name?: string | null
          is_enabled?: boolean | null
          config?: Json | null
          last_run_at?: string | null
          created_at?: string
        }
        Update: {
          key?: string
          name?: string | null
          is_enabled?: boolean | null
          config?: Json | null
          last_run_at?: string | null
          created_at?: string
        }
      }
    }
  }
}
