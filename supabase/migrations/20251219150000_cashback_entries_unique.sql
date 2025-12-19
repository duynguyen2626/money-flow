-- Ensure we don't have duplicates before adding unique index
-- (Optional cleanup, though in dev we might just fail if dupes exist, user can fix)
-- For safety, we can try to keep the latest one or just let it fail if duplicates exist so we know.
-- But given the task is to FIX, I will just add the index. If it fails, I'll deal with it.
CREATE UNIQUE INDEX IF NOT EXISTS cashback_entries_account_txn_idx ON cashback_entries (account_id, transaction_id);