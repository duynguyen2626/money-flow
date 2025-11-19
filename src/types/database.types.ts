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
          type: 'bank' | 'cash' | 'credit_card' | 'ewallet' | 'debt'
          currency: string | null
          credit_limit: number | null
          current_balance: number | null
          owner_id: string | null
          cashback_config: Json | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'bank' | 'cash' | 'credit_card' | 'ewallet' | 'debt'
          currency?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          owner_id?: string | null
          cashback_config?: Json | null
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'bank' | 'cash' | 'credit_card' | 'ewallet' | 'debt'
          currency?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          owner_id?: string | null
          cashback_config?: Json | null
          is_active?: boolean | null
          created_at?: string
        }
      }
      // Add other tables as needed later, this is enough to compile Page.tsx
    }
  }
}
