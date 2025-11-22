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
          img_url: string | null
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
          img_url?: string | null
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
          img_url?: string | null
          logo_url?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          occurred_at: string
          note: string | null
          status: 'posted' | 'pending' | 'void'
          tag: string | null
          created_at: string
        }
        Insert: {
          id?: string
          occurred_at: string
          note?: string | null
          status?: 'posted' | 'pending' | 'void'
          tag?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          occurred_at?: string
          note?: string | null
          status?: 'posted' | 'pending' | 'void'
          tag?: string | null
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
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          type: 'expense' | 'income'
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'expense' | 'income'
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'expense' | 'income'
          parent_id?: string | null
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
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          avatar_url?: string | null
          sheet_link?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          avatar_url?: string | null
          sheet_link?: string | null
          created_at?: string
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
    }
  }
}
