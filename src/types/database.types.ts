// This file should be regenerated after applying migrations
// For now, this is a placeholder to allow the build to succeed
// TODO: Generate proper types after migration is applied to remote database

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
      profiles: {
        Row: {
          id: string
          name: string
          email: string | null
          role: string
          is_group: boolean
          image_url: string | null
          created_at: string
          sheet_link: string | null
          is_owner: boolean
          is_archived: boolean
          google_sheet_url: string | null
          group_parent_id: string | null
          sheet_full_img: string | null
          sheet_show_bank_account: boolean
          sheet_show_qr_image: boolean
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          role?: string
          is_group?: boolean
          image_url?: string | null
          created_at?: string
          sheet_link?: string | null
          is_owner?: boolean
          is_archived?: boolean
          google_sheet_url?: string | null
          group_parent_id?: string | null
          sheet_full_img?: string | null
          sheet_show_bank_account?: boolean
          sheet_show_qr_image?: boolean
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          role?: string
          is_group?: boolean
          image_url?: string | null
          created_at?: string
          sheet_link?: string | null
          is_owner?: boolean
          is_archived?: boolean
          google_sheet_url?: string | null
          group_parent_id?: string | null
          sheet_full_img?: string | null
          sheet_show_bank_account?: boolean
          sheet_show_qr_image?: boolean
        }
      }
      [key: string]: any
    }
    Views: {
      [key: string]: any
    }
    Functions: {
      [key: string]: any
    }
    Enums: {
      [key: string]: any
    }
  }
}
