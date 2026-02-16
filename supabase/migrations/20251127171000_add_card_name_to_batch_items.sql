-- Add card_name column to batch_items table
ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS card_name TEXT;
