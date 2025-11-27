alter table batch_items
add column if not exists transaction_id uuid references transactions(id),
add column if not exists is_confirmed boolean default false;
