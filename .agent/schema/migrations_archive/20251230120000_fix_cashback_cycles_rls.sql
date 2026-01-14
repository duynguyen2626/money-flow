-- Fix RLS policy for cashback_cycles to allow authenticated owners to insert/update.

alter table public.cashback_cycles enable row level security;

drop policy if exists "Users can manage their own cycles" on public.cashback_cycles;
create policy "Users can manage their own cycles" on public.cashback_cycles
  for all
  using (auth.uid() = (select owner_id from public.accounts where id = cashback_cycles.account_id))
  with check (auth.uid() = (select owner_id from public.accounts where id = cashback_cycles.account_id));
