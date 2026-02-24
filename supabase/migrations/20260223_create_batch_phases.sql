-- Migration: Create batch_phases table for dynamic phase management
-- Date: 2026-02-23

-- 1. Create the batch_phases table
CREATE TABLE IF NOT EXISTS batch_phases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_type TEXT NOT NULL CHECK (bank_type IN ('MBB', 'VIB')),
    label TEXT NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('before', 'after')),
    cutoff_day INT NOT NULL CHECK (cutoff_day >= 1 AND cutoff_day <= 31),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Seed default phases (4 phases: MBB before/after 15, VIB before/after 15)
INSERT INTO batch_phases (bank_type, label, period_type, cutoff_day, sort_order)
VALUES
    ('MBB', 'Before 15', 'before', 15, 0),
    ('MBB', 'After 15', 'after', 15, 1),
    ('VIB', 'Before 15', 'before', 15, 0),
    ('VIB', 'After 15', 'after', 15, 1)
ON CONFLICT DO NOTHING;

-- 3. Add phase_id FK to batches (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'batches') THEN
        ALTER TABLE batches ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES batch_phases(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Backfill batches.phase_id from period (only if both table and column exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'batches' 
        AND column_name = 'period'
    ) THEN
        UPDATE batches b
        SET phase_id = bp.id
        FROM batch_phases bp
        WHERE bp.bank_type = b.bank_type
          AND bp.period_type = b.period
          AND b.phase_id IS NULL;
    END IF;
END $$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_batch_phases_bank ON batch_phases(bank_type, is_active, sort_order);

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'batches') THEN
        CREATE INDEX IF NOT EXISTS idx_batches_phase ON batches(phase_id);
    END IF;
END $$;

-- 8. Enable RLS
ALTER TABLE batch_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON batch_phases
    FOR ALL USING (auth.role() = 'authenticated');

-- 9. Updated_at trigger
CREATE OR REPLACE FUNCTION update_batch_phases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_batch_phases_updated_at
    BEFORE UPDATE ON batch_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_phases_updated_at();

-- NOTE: This migration is forward-compatible and works regardless of whether:
-- - batches table exists
-- - batches.period column exists
-- - batch_master_items table exists (future enhancement)
--
-- The migration uses conditional checks to prevent errors if tables/columns don't exist yet.
