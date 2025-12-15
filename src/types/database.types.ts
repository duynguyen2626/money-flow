export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          annual_fee: number | null
          cashback_config: Json | null
          created_at: string
          credit_limit: number | null
          currency: string | null
          current_balance: number | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_id: string | null
          parent_account_id: string | null
          secured_by_account_id: string | null
          total_in: number | null
          total_out: number | null
          type: Database["public"]["Enums"]["account_type"]
        }
        Insert: {
          annual_fee?: number | null
          cashback_config?: Json | null
          created_at?: string
          credit_limit?: number | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          parent_account_id?: string | null
          secured_by_account_id?: string | null
          total_in?: number | null
          total_out?: number | null
          type: Database["public"]["Enums"]["account_type"]
        }
        Update: {
          annual_fee?: number | null
          cashback_config?: Json | null
          created_at?: string
          credit_limit?: number | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          parent_account_id?: string | null
          secured_by_account_id?: string | null
          total_in?: number | null
          total_out?: number | null
          type: Database["public"]["Enums"]["account_type"]
        }
        Relationships: [
          {
            foreignKeyName: "accounts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_secured_by_account_id_fkey"
            columns: ["secured_by_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_mappings: {
        Row: {
          bank_code: string
          bank_name: string
          created_at: string | null
          id: string
          source_name_pattern: string
          updated_at: string | null
        }
        Insert: {
          bank_code: string
          bank_name: string
          created_at?: string | null
          id?: string
          source_name_pattern: string
          updated_at?: string | null
        }
        Update: {
          bank_code?: string
          bank_name?: string
          created_at?: string | null
          id?: string
          source_name_pattern?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      batch_items: {
        Row: {
          amount: number
          batch_id: string
          card_name: string | null
          created_at: string
          details: string
          id: string
          installment_metadata: Json | null
          installment_payment: boolean | null
          is_duplicate: boolean | null
          match_confidence: number | null
          metadata: Json | null
          occurred_at: string
          original_data: Json | null
          status: string
          suggested_category_id: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          batch_id: string
          card_name?: string | null
          created_at?: string
          details: string
          id?: string
          installment_metadata?: Json | null
          installment_payment?: boolean | null
          is_duplicate?: boolean | null
          match_confidence?: number | null
          metadata?: Json | null
          occurred_at: string
          original_data?: Json | null
          status?: string
          suggested_category_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string
          card_name?: string | null
          created_at?: string
          details?: string
          id?: string
          installment_metadata?: Json | null
          installment_payment?: boolean | null
          is_duplicate?: boolean | null
          match_confidence?: number | null
          metadata?: Json | null
          occurred_at?: string
          original_data?: Json | null
          status?: string
          suggested_category_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          created_at: string
          created_by: string
          display_link: string | null
          file_name: string
          id: string
          is_template: boolean | null
          processed_at: string | null
          sheet_name: string | null
          status: string
          total_items: number | null
          source_account_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          display_link?: string | null
          file_name: string
          id?: string
          is_template?: boolean | null
          processed_at?: string | null
          sheet_name?: string | null
          status?: string
          total_items?: number | null
          source_account_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          display_link?: string | null
          file_name?: string
          id?: string
          is_template?: boolean | null
          processed_at?: string | null
          sheet_name?: string | null
          status?: string
          total_items?: number | null
          source_account_id?: string | null

        }
        Relationships: [
          {
            foreignKeyName: "batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_configs: {
        Row: {
          api_key: string | null
          api_secret: string | null
          config: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string
          last_run_at: string | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_run_at?: string | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_run_at?: string | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cashback_cycles: {
        Row: {
          account_id: string
          created_at: string | null
          cycle_tag: string
          id: string
          is_exhausted: boolean | null
          max_budget: number | null
          met_min_spend: boolean | null
          min_spend_target: number | null
          overflow_loss: number | null
          real_awarded: number | null
          spent_amount: number | null
          updated_at: string | null
          virtual_profit: number | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          cycle_tag: string
          id?: string
          is_exhausted?: boolean | null
          max_budget?: number | null
          met_min_spend?: boolean | null
          min_spend_target?: number | null
          overflow_loss?: number | null
          real_awarded?: number | null
          spent_amount?: number | null
          updated_at?: string | null
          virtual_profit?: number | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          cycle_tag?: string
          id?: string
          is_exhausted?: boolean | null
          max_budget?: number | null
          met_min_spend?: boolean | null
          min_spend_target?: number | null
          overflow_loss?: number | null
          real_awarded?: number | null
          spent_amount?: number | null
          updated_at?: string | null
          virtual_profit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cashback_cycles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cashback_entries: {
        Row: {
          account_id: string
          amount: number
          counts_to_budget: boolean | null
          created_at: string | null
          cycle_id: string | null
          id: string
          mode: string
          note: string | null
          transaction_id: string | null
        }
        Insert: {
          account_id: string
          amount?: number
          counts_to_budget?: boolean | null
          created_at?: string | null
          cycle_id?: string | null
          id?: string
          mode: string
          note?: string | null
          transaction_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          counts_to_budget?: boolean | null
          created_at?: string | null
          cycle_id?: string | null
          id?: string
          mode?: string
          note?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashback_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashback_entries_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cashback_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashback_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      cashback_profits: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          id: string
          is_redeemed: boolean | null
          note: string | null
          transaction_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          id?: string
          is_redeemed?: boolean | null
          note?: string | null
          transaction_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          is_redeemed?: boolean | null
          note?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashback_profits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashback_profits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          logo_url: string | null
          name: string
          parent_id: string | null
          type: string
          kind: "internal" | "external" | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          logo_url?: string | null
          name: string
          parent_id?: string | null
          type: string
          kind?: "internal" | "external" | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          logo_url?: string | null
          name?: string
          parent_id?: string | null
          type?: string
          kind?: "internal" | "external" | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          due_date: string | null
          id: string
          interest_rate: number | null
          is_paid: boolean | null
          person_id: string
          title: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          interest_rate?: number | null
          is_paid?: boolean | null
          person_id: string
          title: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          interest_rate?: number | null
          is_paid?: boolean | null
          person_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          account_id: string
          converted_amount: number | null
          created_at: string
          description: string | null
          id: string
          installment_amount: number
          interest_rate: number | null
          original_amount: number
          remaining_amount: number
          start_date: string
          status: Database["public"]["Enums"]["installment_status"]
          term_months: number
          total_interest: number | null
          type: Database["public"]["Enums"]["installment_type"]
          updated_at: string
        }
        Insert: {
          account_id: string
          converted_amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          installment_amount: number
          interest_rate?: number | null
          original_amount: number
          remaining_amount?: number
          start_date: string
          status?: Database["public"]["Enums"]["installment_status"]
          term_months: number
          total_interest?: number | null
          type?: Database["public"]["Enums"]["installment_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          converted_amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          installment_amount?: number
          interest_rate?: number | null
          original_amount?: number
          remaining_amount?: number
          start_date?: string
          status?: Database["public"]["Enums"]["installment_status"]
          term_months?: number
          total_interest?: number | null
          type?: Database["public"]["Enums"]["installment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          is_archived: boolean | null
          is_owner: boolean | null
          name: string | null
          phone: string | null
          role: string | null
          type: string
          updated_at: string
          sheet_link: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          is_archived?: boolean | null
          is_owner?: boolean | null
          name?: string | null
          phone?: string | null
          role?: string | null
          type?: string
          updated_at?: string
          sheet_link?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          is_owner?: boolean | null
          name?: string | null
          phone?: string | null
          role?: string | null
          type?: string
          updated_at?: string
          sheet_link?: string | null
        }
        Relationships: []
      }
      service_members: {
        Row: {
          id: string
          service_id: string
          profile_id: string
          slots: number
          is_owner: boolean
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          profile_id: string
          slots: number
          is_owner?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          profile_id?: string
          slots?: number
          is_owner?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_members_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          }
        ]
      }
      sheet_webhook_links: {
        Row: {
          account_id: string | null
          api_url: string
          created_at: string | null
          description: string | null
          headers: Json | null
          id: string
          is_active: boolean | null
          method: string | null
          name: string
          sheet_name: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          api_url: string
          created_at?: string | null
          description?: string | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          method?: string | null
          name: string
          sheet_name?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          api_url?: string
          created_at?: string | null
          description?: string | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          method?: string | null
          name?: string
          sheet_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sheet_webhook_links_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          created_at: string
          default_category_id: string | null
          id: string
          is_active: boolean | null
          is_online: boolean | null
          logo_url: string | null
          name: string
          website: string | null
        }
        Insert: {
          created_at?: string
          default_category_id?: string | null
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          logo_url?: string | null
          name: string
          website?: string | null
        }
        Update: {
          created_at?: string
          default_category_id?: string | null
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          logo_url?: string | null
          name?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_default_category_id_fkey"
            columns: ["default_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string
          amount: number
          billing_cycle: string
          category_id: string | null
          created_at: string
          currency: string | null
          description: string | null
          due_day: number
          id: string
          is_active: boolean | null
          max_slots: number | null
          name: string
          next_billing_date: string
          shop_id: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          billing_cycle: string
          category_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          due_day: number
          id?: string
          is_active?: boolean | null
          max_slots?: number | null
          name: string
          next_billing_date: string
          shop_id?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          billing_cycle?: string
          category_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          due_day?: number
          id?: string
          is_active?: boolean | null
          max_slots?: number | null
          name?: string
          next_billing_date?: string
          shop_id?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_history: {
        Row: {
          changed_by: string
          created_at: string | null
          details: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation_type: string
          transaction_id: string | null
        }
        Insert: {
          changed_by: string
          created_at?: string | null
          details?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation_type: string
          transaction_id?: string | null
        }
        Update: {
          changed_by?: string
          created_at?: string | null
          details?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation_type?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          cashback_mode: string | null
          cashback_share_fixed: number | null
          cashback_share_percent: number | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          final_price: number | null
          id: string
          installment_plan_id: string | null
          is_installment: boolean | null
          metadata: Json | null
          note: string | null
          occurred_at: string
          persisted_cycle_tag: string | null
          person_id: string | null
          shop_id: string | null
          status: string | null
          tag: string | null
          target_account_id: string | null
          type: string
        }
        Insert: {
          account_id: string
          amount: number
          cashback_mode?: string | null
          cashback_share_fixed?: number | null
          cashback_share_percent?: number | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          final_price?: number | null
          id?: string
          installment_plan_id?: string | null
          is_installment?: boolean | null
          metadata?: Json | null
          note?: string | null
          occurred_at: string
          persisted_cycle_tag?: string | null
          person_id?: string | null
          shop_id?: string | null
          status?: string | null
          tag?: string | null
          target_account_id?: string | null
          type: string
        }
        Update: {
          account_id?: string
          amount?: number
          cashback_mode?: string | null
          cashback_share_fixed?: number | null
          cashback_share_percent?: number | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          final_price?: number | null
          id?: string
          installment_plan_id?: string | null
          is_installment?: boolean | null
          metadata?: Json | null
          note?: string | null
          occurred_at?: string
          persisted_cycle_tag?: string | null
          person_id?: string | null
          shop_id?: string | null
          status?: string | null
          tag?: string | null
          target_account_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_installment_plan_id_fkey"
            columns: ["installment_plan_id"]
            isOneToOne: false
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string | null
          id: string
          preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recompute_cashback_cycle: {
        Args: {
          p_cycle_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_type:
      | "bank"
      | "cash"
      | "credit_card"
      | "ewallet"
      | "debt"
      | "savings"
      | "investment"
      | "asset"
      | "system"
      installment_status: "active" | "completed" | "settled_early" | "cancelled"
      installment_type: "credit_card" | "p2p_lending"
      line_type: "debit" | "credit"
      pl_type: "normal" | "fee" | "cashback_redeemed" | "reversal" | "ignore"
      refund_status_type: "none" | "pending" | "partial" | "full"
      transaction_status:
      | "posted"
      | "pending"
      | "void"
      | "waiting_refund"
      | "refunded"
      | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
