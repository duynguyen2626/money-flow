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

-- 3. Add phase_id FK to batch_master_items
ALTER TABLE batch_master_items
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES batch_phases(id) ON DELETE SET NULL;

-- 4. Add phase_id FK to batches
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES batch_phases(id) ON DELETE SET NULL;

-- 5. Backfill batch_master_items.phase_id from cutoff_period
UPDATE batch_master_items bmi
SET phase_id = bp.id
FROM batch_phases bp
WHERE bp.bank_type = bmi.bank_type
  AND bp.period_type = bmi.cutoff_period
  AND bmi.phase_id IS NULL;

-- 6. Backfill batches.phase_id from period
UPDATE batches b
SET phase_id = bp.id
FROM batch_phases bp
WHERE bp.bank_type = b.bank_type
  AND bp.period_type = b.period
  AND b.phase_id IS NULL;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_batch_phases_bank ON batch_phases(bank_type, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_batch_master_items_phase ON batch_master_items(phase_id);
CREATE INDEX IF NOT EXISTS idx_batches_phase ON batches(phase_id);

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

-- NOTE: Keep old columns (cutoff_period on batch_master_items, period on batches)
-- for backward compatibility during transition.
