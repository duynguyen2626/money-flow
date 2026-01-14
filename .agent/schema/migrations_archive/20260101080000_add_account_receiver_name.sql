-- Migration to add receiver_name to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS receiver_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_number TEXT;
