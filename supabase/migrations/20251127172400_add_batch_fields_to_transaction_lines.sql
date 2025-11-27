-- Add bank_name, bank_number, card_name, and receiver_name columns to transaction_lines table
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS bank_number TEXT;
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS card_name TEXT;
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS receiver_name TEXT;
