-- Migration: Rename all profile_id columns to person_id for consistency
-- Purpose: Standardize foreign key naming after renaming profiles table to people
-- Date: 2026-02-03

-- Step 1: Rename foreign key column in service_members table
ALTER TABLE service_members 
  RENAME COLUMN profile_id TO person_id;

-- Step 2: Drop old constraint and create new one with correct naming
ALTER TABLE service_members
  DROP CONSTRAINT IF EXISTS service_members_profile_id_fkey;

ALTER TABLE service_members
  ADD CONSTRAINT service_members_person_id_fkey 
  FOREIGN KEY (person_id) REFERENCES people(id);

-- Step 3: Update any other tables that reference profiles (if exists)
-- Note: accounts.owner_id, transactions.person_id, installments.owner_id already use correct naming

-- Step 4: Add comment for documentation
COMMENT ON COLUMN service_members.person_id IS 'Foreign key to people.id (formerly profile_id)';

-- Verification query (run after migration):
-- SELECT 
--   tc.table_name, 
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--   AND ccu.table_name = 'people';
