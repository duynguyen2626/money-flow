-- Migration: Add metadata column to cashback_entries (MF5.3)
ALTER TABLE cashback_entries ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Comment for traceability
COMMENT ON COLUMN cashback_entries.metadata IS 'Stores policy attribution (level, rule, rate) for MF5.3 auditing';
