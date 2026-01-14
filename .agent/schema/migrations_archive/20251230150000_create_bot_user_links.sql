create table if not exists public.bot_user_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('telegram', 'slack')),
  platform_user_id text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  state jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bot_user_links_platform_user_idx
  on public.bot_user_links(platform, platform_user_id);

create index if not exists bot_user_links_profile_idx
  on public.bot_user_links(profile_id);

alter table public.bot_user_links enable row level security;
