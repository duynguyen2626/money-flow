-- Migration: Fix persisted_cycle_tag data integrity issue
-- Created: 2026-01-11
-- Issue: Some transactions have tag='2025-12' but persisted_cycle_tag='2025-11'
-- This causes wrong data to display when filtering by cycle (e.g., clicking DEC 25 shows NOV 2025 data)
-- Update persisted_cycle_tag to match tag for all transactions where they don't match
UPDATE transactions
SET persisted_cycle_tag = tag
WHERE persisted_cycle_tag IS NOT NULL
    AND persisted_cycle_tag != tag
    AND tag ~ '^\d{4}-\d{2}$';
-- Only update if tag is in YYYY-MM format
-- Verify the fix (should return 0 rows after migration)
-- SELECT 
--     id,
--     note,
--     tag,
--     persisted_cycle_tag,
--     occurred_at
-- FROM transactions
-- WHERE persisted_cycle_tag IS NOT NULL
--   AND persisted_cycle_tag != tag
-- ORDER BY occurred_at DESC
-- LIMIT 20;