create table if not exists public.person_cycle_sheets (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.profiles(id) on delete cascade,
  cycle_tag text not null,
  sheet_id text,
  sheet_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists person_cycle_sheets_person_cycle_idx
  on public.person_cycle_sheets (person_id, cycle_tag);

create index if not exists person_cycle_sheets_person_id_idx
  on public.person_cycle_sheets (person_id);
