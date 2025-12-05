-- Consolidated Migration for Milestone 3 (Installments + Cashback Profits)
-- Includes:
-- 1. Create Installments Table
-- 2. Add Metadata to Batch Items
-- 3. Create Cashback Profits Table

BEGIN;

-- 1. Create Enums (if not exists)
DO $$ BEGIN
    CREATE TYPE installment_status AS ENUM ('active', 'completed', 'settled_early', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE installment_type AS ENUM ('credit_card', 'p2p_lending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Installments Table (if not exists)
CREATE TABLE IF NOT EXISTS installments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  
  -- Linking
  original_transaction_id uuid references transactions(id) on delete set null,
  owner_id uuid references profiles(id) not null,
  debtor_id uuid references profiles(id),
  
  -- Financials
  name text not null,
  total_amount numeric not null,
  conversion_fee numeric default 0,
  term_months integer not null,
  monthly_amount numeric not null,
  
  -- Progress
  start_date date not null,
  remaining_amount numeric not null,
  next_due_date date,
  status installment_status default 'active',
  type installment_type default 'credit_card'
);

-- 3. Add RLS policies for Installments (if not exists)
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    create policy "Users can view their own installments"
      on installments for select
      using (auth.uid() = owner_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    create policy "Users can insert their own installments"
      on installments for insert
      with check (auth.uid() = owner_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    create policy "Users can update their own installments"
      on installments for update
      using (auth.uid() = owner_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    create policy "Users can delete their own installments"
      on installments for delete
      using (auth.uid() = owner_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Update transactions table (if column missing)
DO $$ BEGIN
    ALTER TABLE transactions ADD COLUMN installment_plan_id uuid references installments(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 5. Add metadata to batch_items (if column missing)
DO $$ BEGIN
    ALTER TABLE batch_items ADD COLUMN metadata jsonb default '{}'::jsonb;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 6. Create Cashback Profits Table (if not exists)
CREATE TABLE IF NOT EXISTS cashback_profits (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  
  account_id uuid references accounts(id) not null,
  transaction_id uuid references transactions(id),
  
  amount numeric not null,
  is_redeemed boolean default false,
  
  note text
);

-- 7. Add RLS policies for Cashback Profits (if not exists)
ALTER TABLE cashback_profits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    create policy "Users can view their own cashback profits"
      on cashback_profits for select
      using (auth.uid() = (select owner_id from accounts where id = account_id));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    create policy "Users can insert their own cashback profits"
      on cashback_profits for insert
      with check (auth.uid() = (select owner_id from accounts where id = account_id));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    create policy "Users can update their own cashback profits"
      on cashback_profits for update
      using (auth.uid() = (select owner_id from accounts where id = account_id));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    create policy "Users can delete their own cashback profits"
      on cashback_profits for delete
      using (auth.uid() = (select owner_id from accounts where id = account_id));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMIT;
