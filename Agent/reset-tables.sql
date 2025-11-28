-- SQL Script to Reset Bank Mappings and Batch Items
-- Use this if you want to clear and reimport data

-- Option 1: Clear all batch_items (keeps structure, removes data)
TRUNCATE TABLE batch_items CASCADE;

-- Option 2: Clear all bank_mappings (keeps structure, removes data)  
TRUNCATE TABLE bank_mappings CASCADE;

-- Option 3: Delete recent data only (safer - adjust date as needed)
DELETE FROM batch_items WHERE created_at > '2025-11-27';
DELETE FROM bank_mappings WHERE created_at > '2025-11-27';

-- Option 4: Drop and recreate tables (complete reset - use with caution!)
-- DROP TABLE IF EXISTS batch_items CASCADE;
-- DROP TABLE IF EXISTS bank_mappings CASCADE;

-- Then run migrations again to recreate tables
-- npx supabase db reset (if using Supabase CLI)

-- To check current data:
SELECT COUNT(*) as total_bank_mappings FROM bank_mappings;
SELECT COUNT(*) as total_batch_items FROM batch_items;

-- To view bank mappings:
SELECT * FROM bank_mappings ORDER BY bank_code;

-- To view batch items:
SELECT * FROM batch_items ORDER BY created_at DESC LIMIT 10;
