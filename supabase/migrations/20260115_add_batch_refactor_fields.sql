-- Migration: Add batch refactor fields
-- Description: Add month_year, bank_type, cloned_from_id to batches table for monthly-first workflow
-- Date: 2026-01-15

-- Add new columns to batches table
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS month_year TEXT,
ADD COLUMN IF NOT EXISTS bank_type TEXT DEFAULT 'MBB' CHECK (bank_type IN ('MBB', 'VIB')),
ADD COLUMN IF NOT EXISTS cloned_from_id UUID REFERENCES batches (id) ON DELETE SET NULL;

-- Backfill existing batches with month_year based on created_at
UPDATE batches
SET
    month_year = TO_CHAR(created_at, 'YYYY-MM')
WHERE
    month_year IS NULL;

-- Backfill bank_type based on name pattern (heuristic)
UPDATE batches
SET
    bank_type = CASE
        WHEN name ILIKE '%VIB%' THEN 'VIB'
        WHEN name ILIKE '%vib%' THEN 'VIB'
        ELSE 'MBB'
    END
WHERE
    bank_type IS NULL
    OR bank_type = 'MBB';

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_batches_month_year ON batches (month_year);

CREATE INDEX IF NOT EXISTS idx_batches_bank_type ON batches (bank_type);

CREATE INDEX IF NOT EXISTS idx_batches_month_bank ON batches (month_year, bank_type);

-- Add comment for documentation
COMMENT ON COLUMN batches.month_year IS 'Format: YYYY-MM (e.g., 2026-01). Used for monthly grouping in UI.';

COMMENT ON COLUMN batches.bank_type IS 'Bank format type: MBB or VIB. Determines which bank mappings to use.';

COMMENT ON COLUMN batches.cloned_from_id IS 'Reference to source batch if this was cloned. Used for tracking clone history.';