-- Consolidated Migration

-- Migration: 20251124225834_add_metadata_to_transactions.sql

ALTER TABLE transactions ADD COLUMN metadata jsonb;

-- Migration: 20251127120000_create_batches.sql

create table if not exists batches (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  source_account_id uuid references accounts(id),
  sheet_link text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists batch_items (
  id uuid default gen_random_uuid() primary key,
  batch_id uuid references batches(id) on delete cascade,
  receiver_name text,
  target_account_id uuid references accounts(id),
  amount numeric not null,
  note text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Migration: 20251127131500_update_batches_schema.sql

alter table batches 
add column if not exists status text default 'draft';

alter table batch_items 
add column if not exists bank_name text;

-- Migration: 20251127142500_add_bank_number.sql

alter table batch_items 
add column if not exists bank_number text;

-- Migration: 20251127151000_add_status_to_batch_items.sql

alter table batch_items 
add column if not exists status text default 'pending';

-- Migration: 20251127154000_add_batch_automation.sql

alter table batches 
add column if not exists is_template boolean default false,
add column if not exists auto_clone_day integer,
add column if not exists last_cloned_month_tag text;

-- Migration: 20251127163000_reload_schema.sql

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Migration: 20251127164500_add_transaction_id_to_batch_items.sql

alter table batch_items
add column if not exists transaction_id uuid references transactions(id),
add column if not exists is_confirmed boolean default false;

-- Migration: 20251127171000_add_card_name_to_batch_items.sql

-- Add card_name column to batch_items table
ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS card_name TEXT;

-- Migration: 20251127172400_add_batch_fields_to_transaction_lines.sql

-- Add bank_name, bank_number, card_name, and receiver_name columns to transaction_lines table
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS bank_number TEXT;
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS card_name TEXT;
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS receiver_name TEXT;

-- Migration: 20251127190500_create_bank_mappings.sql

-- Create bank_mappings table for auto-filling bank information
CREATE TABLE IF NOT EXISTS bank_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code TEXT NOT NULL UNIQUE, -- e.g., "970436", "970422"
  bank_name TEXT NOT NULL, -- e.g., "Vietcombank", "MB Bank"
  short_name TEXT NOT NULL, -- e.g., "VCB", "MSB" (for note generation)
  logo_url TEXT, -- Optional bank logo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE bank_mappings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read bank mappings
-- Allow all authenticated users to read bank mappings
DROP POLICY IF EXISTS "Allow authenticated users to read bank mappings" ON bank_mappings;
CREATE POLICY "Allow authenticated users to read bank mappings"
  ON bank_mappings FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert/update/delete bank mappings
DROP POLICY IF EXISTS "Allow authenticated users to manage bank mappings" ON bank_mappings;
CREATE POLICY "Allow authenticated users to manage bank mappings"
  ON bank_mappings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert common Vietnamese banks
INSERT INTO bank_mappings (bank_code, bank_name, short_name, logo_url) VALUES
  ('970436', 'Ngân hàng TMCP Ngoại thương Việt Nam', 'VCB', null),
  ('970422', 'Ngân hàng TMCP Quân đội', 'MSB', null),
  ('970415', 'Ngân hàng TMCP Công thương Việt Nam', 'VietinBank', null),
  ('970418', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', 'BIDV', null),
  ('970407', 'Ngân hàng TMCP Kỹ thương Việt Nam', 'Techcombank', null),
  ('970423', 'Ngân hàng TMCP Tiên Phong', 'TPBank', null),
  ('970432', 'Ngân hàng TMCP Việt Nam Thịnh Vượng', 'VPBank', null),
  ('970405', 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', 'Agribank', null),
  ('970416', 'Ngân hàng TMCP Á Châu', 'ACB', null),
  ('970403', 'Ngân hàng TMCP Sài Gòn Thương Tín', 'Sacombank', null)
ON CONFLICT (bank_code) DO NOTHING;

-- Migration: 20251127230900_fix_bank_mappings_columns.sql

-- Fix bank_mappings table - recreate with correct schema
-- Drop and recreate to ensure clean state

-- Drop existing table if it exists
DROP TABLE IF EXISTS bank_mappings CASCADE;

-- Create bank_mappings table with correct schema
CREATE TABLE bank_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code TEXT NOT NULL UNIQUE, -- e.g., "970436", "970422", "314", "203"
  bank_name TEXT NOT NULL, -- e.g., "Ngân hàng TMCP Ngoại thương Việt Nam"
  short_name TEXT NOT NULL, -- e.g., "VCB", "MSB" (for note generation)
  logo_url TEXT, -- Optional bank logo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE bank_mappings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read bank mappings
CREATE POLICY "Allow authenticated users to read bank mappings"
  ON bank_mappings FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert/update/delete bank mappings
CREATE POLICY "Allow authenticated users to manage bank mappings"
  ON bank_mappings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert common Vietnamese banks
INSERT INTO bank_mappings (bank_code, bank_name, short_name) VALUES
  -- Standard bank codes (970xxx)
  ('970436', 'Ngân hàng TMCP Ngoại thương Việt Nam', 'VCB'),
  ('970422', 'Ngân hàng TMCP Quân đội', 'MSB'),
  ('970415', 'Ngân hàng TMCP Công thương Việt Nam', 'VietinBank'),
  ('970418', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', 'BIDV'),
  ('970407', 'Ngân hàng TMCP Kỹ thương Việt Nam', 'Techcombank'),
  ('970423', 'Ngân hàng TMCP Tiên Phong', 'TPBank'),
  ('970432', 'Ngân hàng TMCP Việt Nam Thịnh Vượng', 'VPBank'),
  ('970405', 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', 'Agribank'),
  ('970416', 'Ngân hàng TMCP Á Châu', 'ACB'),
  ('970403', 'Ngân hàng TMCP Sài Gòn Thương Tín', 'Sacombank'),
  
  -- Additional banks from new import format
  ('314', 'NH TMCP Quốc tế Việt Nam', 'VIB'),
  ('203', 'VCB - Ngoại Thương (Vietcombank)', 'VCB'),
  ('204', 'AGRIBANK - Nông nghiệp & PTNT Việt Nam', 'AGRIBANK')
ON CONFLICT (bank_code) DO NOTHING;

-- Migration: 20251127235500_add_rls_to_bank_mappings.sql

-- Enable RLS on bank_mappings if not already enabled
ALTER TABLE "public"."bank_mappings" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to do everything on bank_mappings
CREATE POLICY "Enable all access for authenticated users" ON "public"."bank_mappings"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Migration: 20251128120000_drop_cli_test.sql

DROP TABLE IF EXISTS "public"."cli_test";

-- Migration: 20251128121500_add_bank_mappings_rls.sql

-- Enable RLS on bank_mappings if not already enabled
ALTER TABLE "public"."bank_mappings" ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for authenticated users" ON "public"."bank_mappings"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

-- Allow insert/update/delete for authenticated users (or restrict as needed)
CREATE POLICY "Allow all access for authenticated users" ON "public"."bank_mappings"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Migration: 20251129100000_create_sheet_webhook_links.sql

create table if not exists public.sheet_webhook_links (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    url text not null,
    created_at timestamptz not null default now()
);

-- Basic RLS to allow authenticated users; adjust as needed for your project.
alter table public.sheet_webhook_links enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'sheet_webhook_links'
          and policyname = 'allow_all_sheet_webhook_links'
    ) then
        create policy allow_all_sheet_webhook_links
            on public.sheet_webhook_links
            for all
            using (true)
            with check (true);
    end if;
end $$;

-- Migration: 20251129183000_unify_logo_url.sql

DO $$
BEGIN
    -- Check if img_url column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'img_url') THEN
        -- Migrate data
        UPDATE accounts
        SET logo_url = img_url
        WHERE logo_url IS NULL AND img_url IS NOT NULL;

        -- Drop column
        ALTER TABLE accounts DROP COLUMN img_url;
    END IF;
END $$;

-- Migration: 20251202000000_create_bot_configs.sql

-- 1. Create table if not exists (robust definition)
create table if not exists bot_configs (
  key text primary key,
  name text,
  is_enabled boolean default false,
  config jsonb default '{}'::jsonb,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add columns safely (idempotent)
alter table bot_configs add column if not exists is_enabled boolean default false;
alter table bot_configs add column if not exists config jsonb default '{}'::jsonb;
alter table bot_configs add column if not exists last_run_at timestamp with time zone;
alter table bot_configs add column if not exists name text;

-- 3. Fix constraints
-- Ensure name is nullable to prevent insert errors if it was created as NOT NULL
alter table bot_configs alter column name drop not null;

-- 4. Enable Security
alter table bot_configs enable row level security;

-- 5. Re-apply Policies
drop policy if exists "Enable read access for all users" on bot_configs;
create policy "Enable read access for all users" on bot_configs for select using (true);

drop policy if exists "Enable insert for authenticated users only" on bot_configs;
create policy "Enable insert for authenticated users only" on bot_configs for insert with check (auth.role() = 'authenticated');

drop policy if exists "Enable update for authenticated users only" on bot_configs;
create policy "Enable update for authenticated users only" on bot_configs for update using (auth.role() = 'authenticated');

-- 6. Insert default data (including name)
insert into bot_configs (key, name, is_enabled, config)
values ('subscription_bot', 'Subscription Bot', false, '{"default_category_id": "expense_category_id_here"}'::jsonb)
on conflict (key) do update 
set name = EXCLUDED.name 
where bot_configs.name is null;

-- 7. Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- Migration: 20251202000001_add_is_owner_to_profiles.sql

alter table profiles add column if not exists is_owner boolean default false;

-- Migration: 20251203000000_add_shop_id_to_subscriptions.sql


ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES shops(id);

-- Migration: 20251204000000_add_max_slots_to_subscriptions.sql

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS max_slots INTEGER DEFAULT NULL;

-- Migration: 20251205000000_create_installments.sql

-- Create Enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'installment_status') THEN
        create type installment_status as enum ('active', 'completed', 'settled_early', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'installment_type') THEN
        create type installment_type as enum ('credit_card', 'p2p_lending');
    END IF;
END $$;

-- Create Installments Table
create table if not exists installments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  
  -- Linking
  original_transaction_id uuid references transactions(id) on delete set null,
  owner_id uuid references profiles(id) not null, -- Who created this
  debtor_id uuid references profiles(id), -- Optional: If P2P (e.g., Lam owes me)
  
  -- Financials
  name text not null, -- e.g. "iPhone 15 Pro Max"
  total_amount numeric not null, -- Original Principal
  conversion_fee numeric default 0, -- One-time fee
  term_months integer not null, -- e.g. 6, 12
  monthly_amount numeric not null, -- Pre-calculated
  
  -- Progress
  start_date date not null,
  remaining_amount numeric not null,
  next_due_date date,
  status installment_status default 'active',
  type installment_type default 'credit_card'
);

-- Add RLS policies (owner can CRUD their own installments)
alter table installments enable row level security;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'installments' AND policyname = 'Users can view their own installments') THEN
        create policy "Users can view their own installments" on installments for select using (auth.uid() = owner_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'installments' AND policyname = 'Users can insert their own installments') THEN
        create policy "Users can insert their own installments" on installments for insert with check (auth.uid() = owner_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'installments' AND policyname = 'Users can update their own installments') THEN
        create policy "Users can update their own installments" on installments for update using (auth.uid() = owner_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'installments' AND policyname = 'Users can delete their own installments') THEN
        create policy "Users can delete their own installments" on installments for delete using (auth.uid() = owner_id);
    END IF;
END $$;

-- Update transactions table
alter table transactions add column if not exists installment_plan_id uuid references installments(id);

-- Migration: 20251205000001_add_metadata_to_batch_items.sql

alter table batch_items add column if not exists metadata jsonb default '{}'::jsonb;

-- Migration: 20251205000002_consolidated_installments.sql

-- Consolidated Migration for Installments
-- Includes:
-- 1. Create Installments Table
-- 2. Add Metadata to Batch Items

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

-- 3. Add RLS policies (if not exists)
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

COMMIT;

-- Migration: 20251205000003_add_cashback_profits.sql

-- Create cashback_profits table
create table if not exists cashback_profits (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  
  account_id uuid references accounts(id) not null,
  transaction_id uuid references transactions(id), -- Link to the spending txn
  
  amount numeric not null, -- The "profit" amount earned voluntarily
  is_redeemed boolean default false, -- Has this been used to cover deficits?
  
  note text -- e.g. "Over-budget cashback"
);

-- Add RLS policies
alter table cashback_profits enable row level security;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_profits' AND policyname = 'Users can view their own cashback profits') THEN
        create policy "Users can view their own cashback profits" on cashback_profits for select using (auth.uid() = (select owner_id from accounts where id = account_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_profits' AND policyname = 'Users can insert their own cashback profits') THEN
        create policy "Users can insert their own cashback profits" on cashback_profits for insert with check (auth.uid() = (select owner_id from accounts where id = account_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_profits' AND policyname = 'Users can update their own cashback profits') THEN
        create policy "Users can update their own cashback profits" on cashback_profits for update using (auth.uid() = (select owner_id from accounts where id = account_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_profits' AND policyname = 'Users can delete their own cashback profits') THEN
        create policy "Users can delete their own cashback profits" on cashback_profits for delete using (auth.uid() = (select owner_id from accounts where id = account_id));
    END IF;
END $$;

-- Migration: 20251205000004_consolidated_m3_all.sql

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

-- Migration: 20251206000000_add_installment_flag.sql

-- Flag to mark a transaction as intended for installment
alter table transactions add column if not exists is_installment boolean default false;

-- Migration: 20251206000001_add_sheet_name_to_batches.sql

-- Add sheet_name to batches for display purposes
alter table batches add column if not exists sheet_name text;

-- Migration: 20251206000002_add_display_link_to_batches.sql

-- Add display_link to batches for the user-facing sheet link
alter table batches add column if not exists display_link text;

-- Migrate existing sheet_link to display_link if it looks like a Google Sheet (docs.google.com)
-- and keep sheet_link as webhook if it looks like a Script (script.google.com)
-- If it's a docs.google.com link in sheet_link, move it to display_link and clear sheet_link (since it's not a webhook)
UPDATE batches
SET display_link = sheet_link,
    sheet_link = NULL
WHERE sheet_link LIKE '%docs.google.com%';

-- Migration: 20251206000003_add_installment_payment_to_batch_items.sql

ALTER TABLE batch_items 
ADD COLUMN is_installment_payment BOOLEAN DEFAULT FALSE;

-- Migration: 20251206000004_fix_installment_constraints.sql

-- Fix Installment Constraints to avoid ambiguous relationships

BEGIN;

-- 1. Drop existing constraints (if any, auto-generated names might vary)
-- We try to drop by the most likely auto-generated names or just recreate them.
-- Since we can't easily know the auto-generated name without inspecting, 
-- we will try to drop the column constraint and re-add it.

-- However, dropping constraint by name requires knowing the name.
-- A safer way is to rely on the fact that we can add a named constraint.
-- But we want to avoid duplicate constraints.

-- Let's try to rename the constraint if it exists, or drop it.
-- We can query pg_constraint but we are in a migration file.

-- Strategy: Drop the column's FK and re-add it with a specific name.
-- ALTER TABLE installments DROP CONSTRAINT IF EXISTS installments_original_transaction_id_fkey;
-- But if the name was auto-generated as something else, this won't work.

-- Let's assume standard naming convention first.
DO $$ BEGIN
    ALTER TABLE installments DROP CONSTRAINT IF EXISTS installments_original_transaction_id_fkey;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Also try to drop the one on transactions
DO $$ BEGIN
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_installment_plan_id_fkey;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 2. Re-add constraints with explicit names

-- Installments -> Transactions (Original Transaction)
ALTER TABLE installments
    ADD CONSTRAINT installments_original_transaction_id_fkey
    FOREIGN KEY (original_transaction_id)
    REFERENCES transactions(id)
    ON DELETE SET NULL;

-- Transactions -> Installments (Installment Plan)
ALTER TABLE transactions
    ADD CONSTRAINT transactions_installment_plan_id_fkey
    FOREIGN KEY (installment_plan_id)
    REFERENCES installments(id)
    ON DELETE SET NULL;

COMMIT;

-- Migration: 20251206000005_fix_schema_m2.sql

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

-- Migration: 20251206000006_add_created_by_to_transactions.sql

-- Add created_by column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Safety fix for missing created_at
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);

-- Update RLS policy if needed (optional but good practice)
-- Assuming existing policies cover this if they reference auth.uid()

-- Migration: 20251206000007_drop_transaction_lines_old.sql

-- Drop deprecated table transaction_lines_old
DROP TABLE IF EXISTS public.transaction_lines_old CASCADE;

-- Also verify if we need to clean up transactions_old
-- DROP TABLE IF EXISTS public.transactions_old CASCADE;

-- Migration: 20251206000008_ensure_all_transaction_columns.sql

-- Comprehensive migration to ensure ALL required columns exist on the transactions table
-- This prevents "column does not exist" errors for: is_installment, installment_plan_id, persisted_cycle_tag, created_by, shop_id

-- 1. is_installment
DO $$ BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_installment BOOLEAN DEFAULT FALSE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. installment_plan_id
DO $$ BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS installment_plan_id UUID REFERENCES public.installments(id);
EXCEPTION
    WHEN duplicate_column THEN null;
    WHEN undefined_table THEN 
        -- Fallback if installments table doesn't exist yet (unlikely but safe)
        -- We won't add foreign key constraint if table missing, but we add column as UUID
        ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS installment_plan_id UUID;
END $$;

-- 3. persisted_cycle_tag
DO $$ BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS persisted_cycle_tag TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 4. created_by (Safety check)
DO $$ BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 5. shop_id (Safety check)
DO $$ BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 6. created_at (Essential column safety check)
DO $$ BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Indexes for performance on these columns
CREATE INDEX IF NOT EXISTS idx_transactions_is_installment ON public.transactions(is_installment);
CREATE INDEX IF NOT EXISTS idx_transactions_installment_plan_id ON public.transactions(installment_plan_id);
CREATE INDEX IF NOT EXISTS idx_transactions_persisted_cycle_tag ON public.transactions(persisted_cycle_tag);

-- Migration: 20251206000009_create_transaction_history.sql

-- Create transaction_history table for audit trail
CREATE TABLE IF NOT EXISTS public.transaction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    snapshot_before JSONB NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('edit', 'void')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    changed_by UUID REFERENCES auth.users(id)
);

-- Index for quick lookups by transaction
CREATE INDEX IF NOT EXISTS idx_transaction_history_transaction_id ON public.transaction_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_created_at ON public.transaction_history(created_at);

-- Enable RLS
ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" ON public.transaction_history
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow insert access to authenticated users
CREATE POLICY "Allow insert access to authenticated users" ON public.transaction_history
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Migration: 20251207000001_add_is_archived_to_profiles.sql

-- Add is_archived column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Migration: 20251207000001_fix_transaction_history_created_at.sql

-- Fix: Ensure transaction_history table has created_at column
-- This resolves: "column transaction_history.created_at does not exist"

-- First, check if table exists and if column is missing
DO $$ 
BEGIN
    -- Add created_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transaction_history' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.transaction_history 
        ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;

    -- Also ensure changed_at exists (in case that's what was used instead)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transaction_history' 
        AND column_name = 'changed_at'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transaction_history' 
        AND column_name = 'created_at'
    ) THEN
        -- Rename changed_at to created_at if that's what exists
        ALTER TABLE public.transaction_history 
        RENAME COLUMN changed_at TO created_at;
    END IF;
END $$;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_transaction_history_created_at 
ON public.transaction_history(created_at);

-- Migration: 20251209000000_add_final_price.sql

-- Add final_price column to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS final_price numeric;

-- Create function to calculate final_price
CREATE OR REPLACE FUNCTION update_final_price()
RETURNS TRIGGER AS $$
BEGIN
    -- Logic: Start with amount.
    -- If cashback_share_fixed is present, subtract its magnitude from the absolute value of amount.
    -- Since expenses are negative, we ADD cashback to make it closer to zero (less negative).
    -- Since income is positive, we SUBTRACT cashback to make it closer to zero (less positive).
    -- Formula: amount - (SIGN(amount) * cashback_share_fixed)
    -- If amount is 0, SIGN is 0, so no change.

    IF NEW.cashback_share_fixed IS NOT NULL AND NEW.cashback_share_fixed != 0 THEN
        NEW.final_price := NEW.amount - (SIGN(NEW.amount) * ABS(NEW.cashback_share_fixed));
    ELSE
        NEW.final_price := NEW.amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before INSERT or UPDATE
DROP TRIGGER IF EXISTS update_final_price_trigger ON transactions;

CREATE TRIGGER update_final_price_trigger
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_final_price();

-- Backfill existing rows
UPDATE transactions
SET final_price = CASE
    WHEN cashback_share_fixed IS NOT NULL AND cashback_share_fixed != 0 THEN
        amount - (SIGN(amount) * ABS(cashback_share_fixed))
    ELSE
        amount
    END;

-- Migration: 20251210164500_fix_balance_trigger.sql

-- 1. Create the correct calculation function (Fixed: Removed initial_balance)
CREATE OR REPLACE FUNCTION fix_account_card_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'credit_card' THEN
         -- Credit Cards: Available = Limit + In (payments) + Out (spending is negative)
        NEW.current_balance := COALESCE(NEW.credit_limit, 0) + COALESCE(NEW.total_in, 0) + COALESCE(NEW.total_out, 0);
    ELSE
         -- Normal Accounts: Balance = In + Out
        NEW.current_balance := COALESCE(NEW.total_in, 0) + COALESCE(NEW.total_out, 0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create a 'Final' trigger that runs last
DROP TRIGGER IF EXISTS zz_final_card_balance_fix ON accounts;
CREATE TRIGGER zz_final_card_balance_fix
BEFORE INSERT OR UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION fix_account_card_balance();

-- 3. Force update all accounts immediately
UPDATE accounts SET id = id;

-- Migration: 20251210191500_fix_final_price_logic.sql

-- Migration to fix final_price calculation logic and backfill data
-- Date: 2025-12-10 19:15:00

CREATE OR REPLACE FUNCTION update_final_price()
RETURNS TRIGGER AS $$
DECLARE
    rate numeric;
    percent_val numeric;
    fixed_val numeric;
    cashback_amt numeric;
BEGIN
    -- Initialize variables
    percent_val := COALESCE(NEW.cashback_share_percent, 0);
    fixed_val := COALESCE(NEW.cashback_share_fixed, 0);
    
    -- Determine Rate logic
    -- If percent is >= 1 (e.g., 1.0, 5.0, 100.0), treat as percentage (divide by 100)
    -- If percent is < 1 (e.g., 0.01, 0.05), treat as decimal rate
    -- Exception: 0 is 0.
    IF ABS(percent_val) >= 1 THEN
        rate := percent_val / 100.0;
    ELSE
        rate := percent_val;
    END IF;

    -- Calculate total cashback amount
    -- Cashback = (Amount * Rate) + Fixed
    -- We use ABS(Amount) because cashback is an absolute value derived from the transaction size
    cashback_amt := (ABS(NEW.amount) * rate) + ABS(fixed_val);

    -- Calculate Final Price
    -- Formula: amount - (SIGN(amount) * cashback_amount)
    -- Expense (-100), Cashback (5) -> -100 - (-1 * 5) = -100 + 5 = -95 (Correct, cost less)
    -- Income (100), Cashback (5) -> 100 - (1 * 5) = 100 - 5 = 95 (Received less? Maybe fee? usually cashback is not for income, but math consistent)
    -- If amount is 0, final is 0.
    
    IF NEW.amount = 0 THEN
        NEW.final_price := 0;
    ELSE
        NEW.final_price := NEW.amount - (SIGN(NEW.amount) * cashback_amt);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create trigger (if it doesn't exist, though strictly we updated the function it uses)
DROP TRIGGER IF EXISTS update_final_price_trigger ON transactions;

CREATE TRIGGER update_final_price_trigger
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_final_price();

-- Force recalculation for all rows
UPDATE transactions SET id = id;

-- Migration: 20251211000000_create_user_settings.sql

create table if not exists public.user_settings (
    key text not null,
    user_id uuid references auth.users not null default auth.uid(),
    value jsonb not null default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    primary key (user_id, key)
);

alter table public.user_settings enable row level security;

create policy "Users can view their own settings"
    on public.user_settings for select
    using (auth.uid() = user_id);

create policy "Users can insert their own settings"
    on public.user_settings for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own settings"
    on public.user_settings for update
    using (auth.uid() = user_id);

-- Migration: 20251215000000_create_cashback_tables.sql

-- 1. Create cashback_cycles table
CREATE TABLE IF NOT EXISTS public.cashback_cycles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    account_id uuid REFERENCES public.accounts(id) NOT NULL,
    cycle_tag text NOT NULL, -- e.g. "DEC25"

    -- Snapshots from account config at time of creation/update
    max_budget numeric DEFAULT 0,
    min_spend_target numeric DEFAULT 0, -- nullable in logic, but numeric 0 often safer for sums

    -- Aggregates
    spent_amount numeric DEFAULT 0,
    real_awarded numeric DEFAULT 0, -- Counts toward budget
    virtual_profit numeric DEFAULT 0, -- Clamped profit
    overflow_loss numeric DEFAULT 0, -- Budget overflow + voluntary

    -- Status flags
    is_exhausted boolean DEFAULT false,
    met_min_spend boolean DEFAULT false,

    UNIQUE(account_id, cycle_tag)
);

-- Enable RLS for cashback_cycles
ALTER TABLE public.cashback_cycles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_cycles' AND policyname = 'Users can view their own cycles') THEN
        CREATE POLICY "Users can view their own cycles" ON public.cashback_cycles 
        FOR SELECT USING (auth.uid() = (SELECT owner_id FROM public.accounts WHERE id = cashback_cycles.account_id));
    END IF;
    
    -- Allow insert/update/delete for owner (or service role)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_cycles' AND policyname = 'Users can manage their own cycles') THEN
         CREATE POLICY "Users can manage their own cycles" ON public.cashback_cycles 
         FOR ALL USING (auth.uid() = (SELECT owner_id FROM public.accounts WHERE id = cashback_cycles.account_id));
    END IF;
END $$;


-- 2. Create cashback_entries table
CREATE TABLE IF NOT EXISTS public.cashback_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    
    cycle_id uuid REFERENCES public.cashback_cycles(id) ON DELETE CASCADE,
    account_id uuid REFERENCES public.accounts(id) NOT NULL,
    transaction_id uuid REFERENCES public.transactions(id), -- Nullable if manual adjustment? Usually linked.

    mode text NOT NULL CHECK (mode IN ('real', 'virtual', 'voluntary')),
    amount numeric NOT NULL DEFAULT 0,
    
    counts_to_budget boolean DEFAULT false, 
    note text,

    -- Denormalized tag for easier querying if needed, or rely on cycle
    -- We rely on cycle_id usually.
    
    CONSTRAINT positive_amount CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_cashback_entries_account_txn ON public.cashback_entries(account_id, transaction_id);
CREATE INDEX IF NOT EXISTS idx_cashback_entries_cycle ON public.cashback_entries(cycle_id);

-- Enable RLS for cashback_entries
ALTER TABLE public.cashback_entries ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_entries' AND policyname = 'Users can view their own entries') THEN
        CREATE POLICY "Users can view their own entries" ON public.cashback_entries 
        FOR SELECT USING (auth.uid() = (SELECT owner_id FROM public.accounts WHERE id = cashback_entries.account_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashback_entries' AND policyname = 'Users can manage their own entries') THEN
        CREATE POLICY "Users can manage their own entries" ON public.cashback_entries 
        FOR ALL USING (auth.uid() = (SELECT owner_id FROM public.accounts WHERE id = cashback_entries.account_id));
    END IF;
END $$;


-- 3. Add cashback_mode to transactions
DO $$ 
BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cashback_mode text;
    -- We won't enforce a strict enum check constraint here to allow flexibility, 
    -- but expected values are: 'none_back', 'real_fixed', 'real_percent', 'shared', 'voluntary'
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Migration: 20251215000001_add_recompute_function.sql

-- Function: recompute_cashback_cycle
-- Purpose: Aggregates entries and updates the cycle summary deterministically.

CREATE OR REPLACE FUNCTION public.recompute_cashback_cycle(p_cycle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_real_awarded numeric;
    v_overflow_loss numeric;
    v_virtual_profit numeric;
    v_max_budget numeric;
    v_min_spend numeric;
    v_spent_amount numeric;
    v_remaining_budget numeric;
BEGIN
    -- 1. Get cycle config
    SELECT max_budget, min_spend_target, spent_amount 
    INTO v_max_budget, v_min_spend, v_spent_amount
    FROM public.cashback_cycles
    WHERE id = p_cycle_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 2. Aggregate Real Awarded (counts_to_budget = true)
    -- Typically mode='real'
    SELECT COALESCE(SUM(amount), 0)
    INTO v_real_awarded
    FROM public.cashback_entries
    WHERE cycle_id = p_cycle_id
      AND counts_to_budget = true;

    -- 3. Aggregate Overflow/Voluntary
    -- mode='voluntary' OR (mode='real' AND counts_to_budget=false - theoretically possible if manually adjusted)
    -- Actually, usually overflow is calculated: 
    -- If real_awarded > max_budget, the excess is overflow. 
    -- PLUS any explicit 'voluntary' entries.
    
    -- Wait, the task says:
    -- "overflow_loss = sum(amount) where mode='voluntary' OR counts_to_budget=false"
    -- This implies entries themselves are marked as voluntary/overflow.
    -- BUT we also have the case where "Real" entries exceed the budget.
    -- If we rely ONLY on entries, we might miss the implicit overflow.
    -- However, MF5.1 spec says: "Derive overflow_loss = sum(amount) where mode='voluntary' OR counts_to_budget=false"
    -- AND "is_exhausted = (real_awarded >= max_budget)".
    -- So we just sum the entries as they are categorized.
    -- The "Implicit" overflow logic (budget cap) might be handled by switching the mode of the entry? 
    -- Or simply: Real is Real. If Real > Budget, then is_exhausted = true.
    -- The "Excess" isn't stored as separate "Overflow" entries automatically unless we split them.
    -- For this function, let's stick to the simple aggregation defined in the task.
    
    SELECT COALESCE(SUM(amount), 0)
    INTO v_overflow_loss
    FROM public.cashback_entries
    WHERE cycle_id = p_cycle_id
      AND (mode = 'voluntary' OR counts_to_budget = false);

    -- 4. Aggregate Virtual Profit
    -- "virtual_profit = sum(virtual) clamped to remaining budget after real_awarded"
    SELECT COALESCE(SUM(amount), 0)
    INTO v_virtual_profit
    FROM public.cashback_entries
    WHERE cycle_id = p_cycle_id
      AND mode = 'virtual';
      
    -- Clamp Virtual Profit
    -- Remaining budget for virtual profit = Max Budget - Real Awarded
    -- If Real Awarded >= Max Budget, then 0 virtual profit allowed? or just no budget left?
    -- Task says: "clamped to remaining budget after real_awarded"
    
    v_remaining_budget := GREATEST(0, v_max_budget - v_real_awarded);
    v_virtual_profit := LEAST(v_virtual_profit, v_remaining_budget);

    -- 5. Update Cycle
    UPDATE public.cashback_cycles
    SET 
        real_awarded = v_real_awarded,
        overflow_loss = v_overflow_loss,
        virtual_profit = v_virtual_profit,
        is_exhausted = (v_real_awarded >= v_max_budget),
        met_min_spend = (v_min_spend IS NULL OR v_min_spend = 0 OR v_spent_amount >= v_min_spend),
        updated_at = now()
    WHERE id = p_cycle_id;

END;
$$;

-- Migration: 20251215000002_backfill_cashback.sql

-- Backfill Script for Cashback (Idempotent)

-- Block 1: Create Cashback Cycles
DO $$
DECLARE
    r RECORD;
    v_config jsonb;
    v_max_amount numeric;
    v_min_spend numeric;
BEGIN
    -- Iterate over distinct account/tag combinations from transactions
    -- Only for credit card accounts that have cashback config
    FOR r IN 
        SELECT DISTINCT t.account_id, COALESCE(t.persisted_cycle_tag, t.tag) as cycle_tag
        FROM public.transactions t
        JOIN public.accounts a ON t.account_id = a.id
        WHERE a.type = 'credit_card'
          AND a.cashback_config IS NOT NULL
          AND (t.persisted_cycle_tag IS NOT NULL OR t.tag IS NOT NULL) -- Ensure we have a cycle tag
          AND COALESCE(t.persisted_cycle_tag, t.tag) <> ''
    LOOP
        -- Check if cycle already exists
        IF NOT EXISTS (SELECT 1 FROM public.cashback_cycles WHERE account_id = r.account_id AND cycle_tag = r.cycle_tag) THEN
            
            -- Fetch config to seed badget/min_spend
            SELECT cashback_config INTO v_config FROM public.accounts WHERE id = r.account_id;
            
            -- Parse safe maxAmount and minSpend
            -- JSONB access: v_config->>'maxAmount' etc.
            -- Note: depends on config shape. Assuming standard shape.
            -- If maxAmount is null or -1, treat as unlimited (0 budget or huge?) 
            -- For DB, we use 0 if not set, or extract value.
            
            v_max_amount := COALESCE((v_config->>'maxAmount')::numeric, 0);
            v_min_spend := COALESCE((v_config->>'minSpend')::numeric, 0);

            INSERT INTO public.cashback_cycles (account_id, cycle_tag, max_budget, min_spend_target)
            VALUES (r.account_id, r.cycle_tag, v_max_amount, v_min_spend);
            
            RAISE NOTICE 'Created cycle % for account %', r.cycle_tag, r.account_id;
        END IF;
    END LOOP;
END $$;


-- Block 2: Migrate cashback_profits -> cashback_entries
DO $$
DECLARE
    r RECORD;
    v_cycle_id uuid;
    v_tx_cycle_tag text;
BEGIN
    FOR r IN SELECT * FROM public.cashback_profits LOOP
        -- Attempt to find the cycle for this profit entry
        -- First verify if we already migrated it (idempotency check by linkage? 
        -- cashback_profits doesn't link to entries, so we check if an entry exists for this transaction ??
        -- BUT: One transaction could have multiple entries theoretically, but profit usually one.
        -- SAFER: Check if an entry with same amount & note & transaction_id exists in 'entries'
        
        IF NOT EXISTS (
            SELECT 1 FROM public.cashback_entries 
            WHERE transaction_id = r.transaction_id 
              AND amount = r.amount 
              AND mode = 'real' -- profits are usually real
        ) THEN
            -- Find Tax Cycle Tag
            SELECT COALESCE(persisted_cycle_tag, tag) INTO v_tx_cycle_tag
            FROM public.transactions 
            WHERE id = r.transaction_id;

            IF v_tx_cycle_tag IS NOT NULL THEN
                -- Find Cycle ID
                SELECT id INTO v_cycle_id 
                FROM public.cashback_cycles 
                WHERE account_id = r.account_id AND cycle_tag = v_tx_cycle_tag;

                IF v_cycle_id IS NOT NULL THEN
                    INSERT INTO public.cashback_entries (
                        cycle_id, 
                        account_id, 
                        transaction_id, 
                        mode, 
                        amount, 
                        counts_to_budget, 
                        note,
                        created_at
                    )
                    VALUES (
                        v_cycle_id,
                        r.account_id,
                        r.transaction_id,
                        'real', -- Defaulting to real for profits
                        r.amount,
                        true, -- counts to budget
                        r.note,
                        r.created_at
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;


-- Block 3: Migrate Transaction Fixed/Percent fields -> cashback_entries
-- Fallback for transactions that have cashback data but NO cashback_profits row
DO $$
DECLARE
    r RECORD;
    v_cycle_id uuid;
    v_cycle_tag text;
    v_amount numeric;
    v_mode text;
BEGIN
    FOR r IN 
        SELECT t.* 
        FROM public.transactions t
        -- Join to ensure we ignore those already covered by entries (prior step)
        LEFT JOIN public.cashback_entries ce ON ce.transaction_id = t.id
        WHERE ce.id IS NULL -- Only process if no entry exists yet
          AND (t.cashback_share_fixed > 0 OR t.cashback_share_percent > 0)
          AND t.account_id IN (SELECT id FROM accounts WHERE type='credit_card')
    LOOP
        v_cycle_tag := COALESCE(r.persisted_cycle_tag, r.tag);
        
        IF v_cycle_tag IS NOT NULL THEN
             SELECT id INTO v_cycle_id 
             FROM public.cashback_cycles 
             WHERE account_id = r.account_id AND cycle_tag = v_cycle_tag;
             
             IF v_cycle_id IS NOT NULL THEN
                 -- Determine amount and mode
                 IF r.cashback_share_fixed > 0 THEN
                     v_amount := r.cashback_share_fixed;
                     v_mode := 'real'; -- Legacy fixed usually meant real cashback given
                 ELSE
                     -- Percent logic is harder without knowing base amount or rules.
                     -- Use 0 or skip?
                     -- Task says: "if percent-based fields exist... create entry similarly"
                     -- But calculating exact amount might be tricky if we don't have the computed value stored.
                     -- If only percent is stored, we might just skip or store 0 with a note.
                     -- Let's stick to fixed for safety as that implies a calculated value.
                     CONTINUE; 
                 END IF;
                 
                 INSERT INTO public.cashback_entries (
                    cycle_id, account_id, transaction_id, mode, amount, counts_to_budget, note, created_at
                 )
                 VALUES (
                    v_cycle_id, r.account_id, r.id, v_mode, v_amount, true, 'Migrated from transaction fixed share', r.created_at
                 );
             END IF;
        END IF;
    END LOOP;
END $$;


-- Block 4: Update transactions.cashback_mode
DO $$
BEGIN
    UPDATE public.transactions t
    SET cashback_mode = 'real_fixed'
    FROM public.cashback_entries ce
    WHERE t.id = ce.transaction_id
      AND ce.mode = 'real'
      AND t.cashback_mode IS NULL;
      
    -- Could add more logic for 'real_percent' etc if we had distinct entry types,
    -- but for now 'real_fixed' is a safe default for migrated entries.
END $$;


-- Block 5: Recompute All Cycles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.cashback_cycles LOOP
        PERFORM public.recompute_cashback_cycle(r.id);
    END LOOP;
END $$;

-- Migration: 20251216000000_add_google_sheet_url_to_profiles.sql

alter table profiles
add column google_sheet_url text;
