alter table batches 
add column if not exists status text default 'draft';

alter table batch_items 
add column if not exists bank_name text;
