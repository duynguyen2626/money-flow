alter table batch_items add column if not exists metadata jsonb default '{}'::jsonb;
