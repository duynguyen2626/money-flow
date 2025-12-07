-- Add is_archived column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
