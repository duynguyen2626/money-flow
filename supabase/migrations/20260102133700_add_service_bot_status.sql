-- Add bot status tracking columns to subscriptions table
-- Track last distribution, next distribution, and status
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS last_distribution_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_distribution_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS distribution_status TEXT DEFAULT 'pending';
-- Add comments explaining the columns
COMMENT ON COLUMN subscriptions.last_distribution_date IS 'Timestamp of last successful distribution';
COMMENT ON COLUMN subscriptions.next_distribution_date IS 'Calculated next distribution date based on due_day (next month)';
COMMENT ON COLUMN subscriptions.distribution_status IS 'Distribution status: pending (not run yet), completed (successful), failed (error occurred)';
-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_distribution_status ON subscriptions(distribution_status, next_distribution_date)
WHERE is_active = true;
-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_distribution ON subscriptions(next_distribution_date)
WHERE is_active = true
    AND distribution_status = 'pending';