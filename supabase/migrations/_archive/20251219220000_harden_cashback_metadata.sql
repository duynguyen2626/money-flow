-- Migration: Harden cashback_entries.metadata (MF5.3.1)
-- WARNING: Run backfill script BEFORE applying this migration if you have NULL metadata in production.
ALTER TABLE cashback_entries ALTER COLUMN metadata SET NOT NULL;
ALTER TABLE cashback_entries ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

-- Comment for traceability
COMMENT ON COLUMN cashback_entries.metadata IS 'Stores policy attribution (level, rule, rate) for MF5.3 auditing. Now mandatory.';
