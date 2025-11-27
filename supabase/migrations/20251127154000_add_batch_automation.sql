alter table batches 
add column if not exists is_template boolean default false,
add column if not exists auto_clone_day integer,
add column if not exists last_cloned_month_tag text;
