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
      people: {
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
      sheet_webhook_links: {
        Row: {
          id: string
          name: string
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          url: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string
          created_at?: string
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any
    }
    Views: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any
    }
    Functions: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any
    }
    Enums: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any
    }
  }
}
