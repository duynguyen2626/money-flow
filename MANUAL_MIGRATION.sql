-- MANUAL MIGRATION SCRIPT
-- Run this directly in Supabase SQL Editor to apply bot status columns
-- This bypasses the migration conflicts
-- ============================================
-- 1. ADD CYCLE SHEET TOGGLES
-- ============================================
ALTER TABLE person_cycle_sheets
ADD COLUMN IF NOT EXISTS show_bank_account BOOLEAN DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS show_qr_image BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN person_cycle_sheets.show_bank_account IS 'Per-cycle override for showing bank account. NULL = inherit from profiles.sheet_show_bank_account, TRUE/FALSE = override master setting';
COMMENT ON COLUMN person_cycle_sheets.show_qr_image IS 'Per-cycle override for sending QR image. NULL = inherit from profiles.sheet_show_qr_image, TRUE/FALSE = override master setting';
CREATE INDEX IF NOT EXISTS idx_person_cycle_sheets_person_cycle ON person_cycle_sheets(person_id, cycle_tag);
-- ============================================
-- 2. ADD SERVICE BOT STATUS COLUMNS
-- ============================================
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS last_distribution_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_distribution_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS distribution_status TEXT DEFAULT 'pending';
COMMENT ON COLUMN subscriptions.last_distribution_date IS 'Timestamp of last successful distribution';
COMMENT ON COLUMN subscriptions.next_distribution_date IS 'Calculated next distribution date based on next_billing_date';
COMMENT ON COLUMN subscriptions.distribution_status IS 'Distribution status: pending (not run yet), completed (successful), failed (error occurred)';
CREATE INDEX IF NOT EXISTS idx_subscriptions_distribution_status ON subscriptions(distribution_status, next_distribution_date)
WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_distribution ON subscriptions(next_distribution_date)
WHERE is_active = true
    AND distribution_status = 'pending';
-- ============================================
-- VERIFY
-- ============================================
SELECT 'Migrations applied successfully!' as status;
-- Check columns exist
SELECT column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'subscriptions'
    AND column_name IN (
        'last_distribution_date',
        'next_distribution_date',
        'distribution_status'
    )
ORDER BY column_name;