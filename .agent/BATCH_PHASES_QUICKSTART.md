# 🚀 QUICK START: Batch Phases Implementation

**Current Status:** ✅ removeChild bug FIXED | ⏳ Migration READY | 🎯 Next: Run SQL in Supabase

---

## ⚡ Step-by-Step (5 minutes)

### 1️⃣ Run Migration (Supabase Dashboard)

```sql
-- Copy/paste entire file: supabase/migrations/20260223_create_batch_phases.sql
-- OR run the commands below:

-- Create table
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

-- Seed default phases
INSERT INTO batch_phases (bank_type, label, period_type, cutoff_day, sort_order) VALUES
('MBB', 'Before 15', 'before', 15, 0),
('MBB', 'After 15', 'after', 15, 1),
('VIB', 'Before 15', 'before', 15, 0),
('VIB', 'After 15', 'after', 15, 1)
ON CONFLICT DO NOTHING;

-- Add phase_id columns
ALTER TABLE batch_master_items ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES batch_phases(id) ON DELETE SET NULL;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES batch_phases(id) ON DELETE SET NULL;

-- Backfill phase_id
UPDATE batch_master_items bmi SET phase_id = bp.id FROM batch_phases bp WHERE bp.bank_type = bmi.bank_type AND bp.period_type = bmi.cutoff_period AND bmi.phase_id IS NULL;
UPDATE batches b SET phase_id = bp.id FROM batch_phases bp WHERE bp.bank_type = b.bank_type AND bp.period_type = b.period AND b.phase_id IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_batch_phases_bank ON batch_phases(bank_type, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_batch_master_items_phase ON batch_master_items(phase_id);
CREATE INDEX IF NOT EXISTS idx_batches_phase ON batches(phase_id);

-- RLS
ALTER TABLE batch_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON batch_phases FOR ALL USING (auth.role() = 'authenticated');
```

### 2️⃣ Verify Migration

Run `supabase/migrations/verify_batch_phases.sql` in SQL Editor. Expected:
- ✅ `batch_phases_exists = true`
- ✅ `phase_count >= 4`
- ✅ Both tables have `phase_id` column

### 3️⃣ Test UI

```bash
pnpm dev
# Navigate to http://localhost:3000/batch/mbb
```

**Test Actions:**
1. See phase tabs (Phase 1: Before 15, Phase 2: After 15)
2. Click "Phases" button → Phase setup panel opens
3. Create new phase: Label "Early", Period "before", Day "10"
4. Verify new tab appears
5. Click "Global Sync" → items distribute to phases
6. Delete a phase → confirm it disappears

---

## 🐛 Troubleshooting

### `batch_phases table not found`
**Fix:** Run Step 1️⃣ above in Supabase SQL Editor

### Phase tabs not showing
**Check:** Browser console for errors. Likely RLS policy issue.
**Fix:** Ensure you're logged in and RLS policy exists (in Step 1)

### Items not distributing
**Debug:** 
1. Check `batch_master_items.cutoff_period` column values
2. Verify `batch_phases.period_type` matches ('before' or 'after')
3. Re-run backfill UPDATE queries from Step 1

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `.agent/BATCH_PHASES_MIGRATION_GUIDE.md` | Full detailed guide with all scenarios |
| `supabase/migrations/20260223_create_batch_phases.sql` | Main migration file |
| `supabase/migrations/verify_batch_phases.sql` | Verification queries |
| `src/actions/batch-phases.actions.ts` | CRUD operations for phases |
| `src/components/batch/BatchMasterChecklist.tsx` | Phase UI implementation |

---

## ✅ Success Criteria

- [x] removeChild error fixed (navigation works)
- [ ] `batch_phases` table exists with 4 rows
- [ ] Phase tabs display in batch page
- [ ] Can create/delete phases via UI
- [ ] Global sync distributes items by phase
- [ ] No console errors during navigation

---

## 🎯 What This Achieves

**Before:** Hardcoded 2 phases (Before 15, After 15)  
**After:** Dynamic N-phase system configurable per bank via UI

**Features Unlocked:**
- ✅ Create custom cutoff dates (e.g., day 5, 10, 20, 25)
- ✅ Multiple phases per bank type
- ✅ Phase-specific batch creation
- ✅ Master items auto-assign to correct phase
- ✅ Visual phase tabs with item counts
- ✅ Inline phase management (no separate settings page needed)

---

**Total Time:** ~5 minutes migration + 5 minutes testing = 10 minutes 🚀
