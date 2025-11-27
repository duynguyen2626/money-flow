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
