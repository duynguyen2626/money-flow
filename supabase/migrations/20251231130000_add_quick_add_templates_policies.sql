alter table public.quick_add_templates enable row level security;

create policy "quick_add_templates_select_own"
  on public.quick_add_templates
  for select
  using (auth.uid() = profile_id);

create policy "quick_add_templates_insert_own"
  on public.quick_add_templates
  for insert
  with check (auth.uid() = profile_id);

create policy "quick_add_templates_update_own"
  on public.quick_add_templates
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "quick_add_templates_delete_own"
  on public.quick_add_templates
  for delete
  using (auth.uid() = profile_id);
