-- Migration: Rename cycle columns for clarity
-- Date: 2026-03-01
-- Purpose: Tách biệt debt_cycle_tag (kỳ nợ người) vs statement_cycle_tag (chu kỳ sao kê thẻ)

-- ============================================================================
-- STEP 1: Add New Columns (Non-Breaking)
-- ============================================================================

-- Add debt_cycle_tag (formerly "tag")
-- Purpose: Track debt period cho người vay/cho vay
-- Format: "YYYY-MM" (user-defined, không nhất thiết theo tháng dương lịch)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS debt_cycle_tag TEXT DEFAULT NULL;

-- Add statement_cycle_tag (formerly "persisted_cycle_tag")
-- Purpose: Track cashback statement cycle của credit card
-- Format: "YYYY-MM" (based on account's statement_day)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS statement_cycle_tag TEXT DEFAULT NULL;

-- ============================================================================
-- STEP 2: Backfill Data from Old Columns
-- ============================================================================

-- Copy debt cycle data
UPDATE transactions 
SET debt_cycle_tag = tag
WHERE tag IS NOT NULL;

-- Copy statement cycle data
UPDATE transactions 
SET statement_cycle_tag = persisted_cycle_tag
WHERE persisted_cycle_tag IS NOT NULL;

-- ============================================================================
-- STEP 3: Add Indexes for Performance
-- ============================================================================

-- Index for debt queries (grouped by person + cycle)
CREATE INDEX IF NOT EXISTS idx_transactions_debt_cycle 
ON transactions(debt_cycle_tag, person_id) 
WHERE debt_cycle_tag IS NOT NULL;

-- Index for cashback queries (grouped by account + cycle)
CREATE INDEX IF NOT EXISTS idx_transactions_statement_cycle 
ON transactions(statement_cycle_tag, account_id) 
WHERE statement_cycle_tag IS NOT NULL;

-- ============================================================================
-- STEP 4: Verification Queries
-- ============================================================================

-- Verify backfill completed
DO $$
DECLARE
  old_tag_count INTEGER;
  new_debt_count INTEGER;
  old_persisted_count INTEGER;
  new_statement_count INTEGER;
BEGIN
  -- Count old columns
  SELECT COUNT(*) INTO old_tag_count FROM transactions WHERE tag IS NOT NULL;
  SELECT COUNT(*) INTO old_persisted_count FROM transactions WHERE persisted_cycle_tag IS NOT NULL;
  
  -- Count new columns
  SELECT COUNT(*) INTO new_debt_count FROM transactions WHERE debt_cycle_tag IS NOT NULL;
  SELECT COUNT(*) INTO new_statement_count FROM transactions WHERE statement_cycle_tag IS NOT NULL;
  
  -- Raise notice with counts
  RAISE NOTICE 'Migration Verification:';
  RAISE NOTICE '  tag → debt_cycle_tag: % → %', old_tag_count, new_debt_count;
  RAISE NOTICE '  persisted_cycle_tag → statement_cycle_tag: % → %', old_persisted_count, new_statement_count;
  
  -- Check if counts match
  IF old_tag_count != new_debt_count THEN
    RAISE WARNING 'Mismatch in debt_cycle_tag backfill: expected %, got %', old_tag_count, new_debt_count;
  END IF;
  
  IF old_persisted_count != new_statement_count THEN
    RAISE WARNING 'Mismatch in statement_cycle_tag backfill: expected %, got %', old_persisted_count, new_statement_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Add Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN transactions.debt_cycle_tag IS 'Kỳ nợ của người vay/cho vay (user-defined, format YYYY-MM). Null nếu không phải debt transaction.';

COMMENT ON COLUMN transactions.statement_cycle_tag IS 'Chu kỳ sao kê của credit card (based on account statement_day, format YYYY-MM). Null nếu không có cashback tracking.';

COMMENT ON COLUMN transactions.tag IS 'DEPRECATED: Use debt_cycle_tag instead. Will be dropped in future migration.';

COMMENT ON COLUMN transactions.persisted_cycle_tag IS 'DEPRECATED: Use statement_cycle_tag instead. Will be dropped in future migration.';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Old columns (tag, persisted_cycle_tag) are NOT dropped yet
-- 2. This is a NON-BREAKING change
-- 3. Code can continue using old columns until refactored
-- 4. Drop old columns only after code migration is complete
-- ============================================================================
