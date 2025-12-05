-- Add sheet_name to batches for display purposes
alter table batches add column if not exists sheet_name text;
