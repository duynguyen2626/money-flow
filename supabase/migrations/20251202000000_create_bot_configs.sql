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
