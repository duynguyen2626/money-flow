create table if not exists public.quick_add_templates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quick_add_templates_profile_name_idx
  on public.quick_add_templates(profile_id, name);

alter table public.quick_add_templates enable row level security;
