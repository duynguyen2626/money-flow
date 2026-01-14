-- Helper SQL Script for Testing Service Distribution
-- Run these commands to test the distribution functionality
-- ============================================
-- 1. DELETE CURRENT MONTH SERVICE TRANSACTIONS
-- ============================================
-- This will remove ONLY transactions created by service distribution
-- for the CURRENT MONTH (2026-01), keeping historical data intact
-- Delete only current month (2026-01)
DELETE FROM transactions
WHERE metadata ? 'service_id'
    AND metadata->>'month_tag' = '2026-01';
-- Verify deletion
SELECT COUNT(*) as deleted_count
FROM transactions
WHERE metadata ? 'service_id'
    AND metadata->>'month_tag' = '2026-01';
-- Optional: Delete ALL service transactions (use with caution!)
-- Uncomment the line below if you want to delete ALL months
-- DELETE FROM transactions WHERE metadata ? 'service_id';
-- ============================================
-- 2. CHECK SERVICE STATUS
-- ============================================
-- View current bot status for all services
SELECT id,
    name,
    price,
    next_billing_date,
    last_distribution_date,
    next_distribution_date,
    distribution_status,
    is_active
FROM subscriptions
WHERE is_active = true
ORDER BY name;
-- ============================================
-- 3. RESET SERVICE STATUS (Optional)
-- ============================================
-- Reset distribution status to allow re-testing
UPDATE subscriptions
SET last_distribution_date = NULL,
    next_distribution_date = NULL,
    distribution_status = 'pending'
WHERE is_active = true;
-- ============================================
-- 4. VIEW SERVICE TRANSACTIONS
-- ============================================
-- After running distribution, check created transactions
SELECT t.id,
    t.occurred_at,
    t.note,
    t.amount,
    t.tag,
    t.metadata->>'service_id' as service_id,
    t.metadata->>'month_tag' as month_tag,
    p.name as person_name,
    s.name as service_name
FROM transactions t
    LEFT JOIN profiles p ON p.id = t.person_id
    LEFT JOIN subscriptions s ON s.id = (t.metadata->>'service_id')::uuid
WHERE t.metadata ? 'service_id'
ORDER BY t.occurred_at DESC;
-- ============================================
-- 5. CHECK IDEMPOTENCY
-- ============================================
-- Verify that transactions exist for current month
SELECT s.name as service_name,
    COUNT(t.id) as transaction_count,
    t.metadata->>'month_tag' as month_tag
FROM subscriptions s
    LEFT JOIN transactions t ON t.metadata->>'service_id' = s.id::text
WHERE s.is_active = true
GROUP BY s.id,
    s.name,
    t.metadata->>'month_tag'
ORDER BY s.name;
-- ============================================
-- 6. VIEW SERVICE MEMBERS
-- ============================================
-- Check service members and their slots
SELECT s.name as service_name,
    p.name as member_name,
    sm.slots,
    sm.is_owner
FROM service_members sm
    JOIN subscriptions s ON s.id = sm.service_id
    JOIN profiles p ON p.id = sm.profile_id
WHERE s.is_active = true
ORDER BY s.name,
    sm.slots DESC;