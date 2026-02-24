-- Verification Script: Check Batch Phases System Status
-- Run this in Supabase SQL Editor to diagnose issues

-- ===== PART 1: Check if batch_phases table exists =====
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'batch_phases'
) AS batch_phases_exists;

-- ===== PART 2: Count rows in batch_phases (should be 4+ after migration) =====
SELECT COUNT(*) AS phase_count FROM batch_phases;

-- ===== PART 3: List all phases =====
SELECT 
    id, 
    bank_type, 
    label, 
    period_type, 
    cutoff_day, 
    sort_order,
    is_active
FROM batch_phases
ORDER BY bank_type, sort_order;

-- ===== PART 4: Check if phase_id columns exist =====
SELECT 
    EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'batch_master_items' 
        AND column_name = 'phase_id'
    ) AS batch_master_items_has_phase_id,
    EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'batches' 
        AND column_name = 'phase_id'
    ) AS batches_has_phase_id;

-- ===== PART 5: Check RLS policy =====
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies
WHERE tablename = 'batch_phases';

-- ===== PART 6: Count master items by phase assignment =====
SELECT 
    CASE 
        WHEN phase_id IS NULL THEN 'Unassigned'
        ELSE 'Assigned'
    END AS assignment_status,
    COUNT(*) AS item_count
FROM batch_master_items
GROUP BY assignment_status;

-- ===== PART 7: Count batches by phase assignment =====
SELECT 
    CASE 
        WHEN phase_id IS NULL THEN 'Unassigned'
        ELSE 'Assigned'
    END AS assignment_status,
    COUNT(*) AS batch_count
FROM batches
GROUP BY assignment_status;

-- ===== PART 8: Sample master items with their phases =====
SELECT 
    bmi.id,
    bmi.name,
    bmi.cutoff_period AS legacy_period,
    bp.label AS phase_label,
    bp.period_type,
    bp.cutoff_day
FROM batch_master_items bmi
LEFT JOIN batch_phases bp ON bp.id = bmi.phase_id
LIMIT 10;

-- ===== EXPECTED RESULTS =====
/*
Part 1: batch_phases_exists = true
Part 2: phase_count >= 4 (2 MBB + 2 VIB default phases)
Part 3: Should show phases like:
  - MBB | Before 15 | before | 15 | 0 | true
  - MBB | After 15  | after  | 15 | 1 | true
  - VIB | Before 15 | before | 15 | 0 | true
  - VIB | After 15  | after  | 15 | 1 | true

Part 4: Both should be true
Part 5: Should show at least one policy (Allow all for authenticated users)
Part 6: After backfill, most items should be "Assigned"
Part 7: After backfill, batches should have mix of Assigned/Unassigned
Part 8: Should show master items with their linked phase info
*/
