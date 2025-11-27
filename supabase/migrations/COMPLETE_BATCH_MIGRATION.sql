-- ============================================
-- BATCH SYSTEM DATABASE MIGRATIONS
-- Run these commands in Supabase SQL Editor
-- ============================================

-- 1. Add card_name column to batch_items table
ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS card_name TEXT;

-- 2. Add batch-related columns to transaction_lines table
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS bank_number TEXT;
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS card_name TEXT;
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS receiver_name TEXT;

-- ============================================
-- VERIFICATION QUERIES (Optional)
-- Run these to verify the columns were added
-- ============================================

-- Check batch_items columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'batch_items' 
ORDER BY ordinal_position;

-- Check transaction_lines columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transaction_lines' 
ORDER BY ordinal_position;
