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
