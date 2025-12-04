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
