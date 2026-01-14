alter table public.profiles
  add column if not exists is_group boolean default false,
  add column if not exists group_parent_id uuid references public.profiles(id) on delete set null;

create index if not exists profiles_group_parent_id_idx on public.profiles(group_parent_id);
