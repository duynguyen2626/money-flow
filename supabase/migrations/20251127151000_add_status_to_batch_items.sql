alter table batch_items 
add column if not exists status text default 'pending';
