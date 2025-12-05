-- Flag to mark a transaction as intended for installment
alter table transactions add column if not exists is_installment boolean default false;
