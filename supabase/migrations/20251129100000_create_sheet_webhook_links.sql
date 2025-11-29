create table if not exists public.sheet_webhook_links (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    url text not null,
    created_at timestamptz not null default now()
);

-- Basic RLS to allow authenticated users; adjust as needed for your project.
alter table public.sheet_webhook_links enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'sheet_webhook_links'
          and policyname = 'allow_all_sheet_webhook_links'
    ) then
        create policy allow_all_sheet_webhook_links
            on public.sheet_webhook_links
            for all
            using (true)
            with check (true);
    end if;
end $$;
