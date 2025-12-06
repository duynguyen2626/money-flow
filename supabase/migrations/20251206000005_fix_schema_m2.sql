-- Fix transactions table missing status column
ALTER TABLE IF EXISTS transactions 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'posted';

-- Re-create batches table if missing (based on original definition + updates)
CREATE TABLE IF NOT EXISTS batches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  source_account_id uuid REFERENCES accounts(id),
  sheet_link text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure extra columns for batches exist
ALTER TABLE batches ADD COLUMN IF NOT EXISTS sheet_name text;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS display_link text;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS is_template boolean;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS auto_clone_day integer;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS last_cloned_month_tag text;

-- Re-create batch_items table if missing
CREATE TABLE IF NOT EXISTS batch_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
  receiver_name text,
  target_account_id uuid REFERENCES accounts(id),
  amount numeric NOT NULL,
  note text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Ensure extra columns for batch_items exist
ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS bank_number text;
ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS card_name text;
ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS transaction_id uuid;
ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS is_confirmed boolean;
