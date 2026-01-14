-- Add sheet_full_img column to profiles table
-- This stores the full QR image URL for Google Sheets
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS sheet_full_img TEXT;