# Batch Phases Migration & Testing Guide

**Date:** 2026-02-24  
**Branch:** `fix/p0-removechild-navigation`  
**Status:** Ready to run migration

---

## Current State

✅ **removeChild error fixed** — Navigation works  
✅ **Migration file created** — `supabase/migrations/20260223_create_batch_phases.sql`  
✅ **Server actions created** — `batch-phases.actions.ts` with CRUD operations  
✅ **UI components ready** — Phase setup panel in `BatchMasterChecklist.tsx`  
❌ **Migration NOT run** — Table `batch_phases` doesn't exist in database

---

## Step 1: Run the Migration in Supabase

### Option A: Via SQL Editor (Recommended)

1. Open Supabase Dashboard → Your Project
2. Go to **SQL Editor** tab
3. Copy the entire contents of `supabase/migrations/20260223_create_batch_phases.sql`
4. Paste into SQL Editor
5. Click **Run** (▶)
6. Verify success message
7. Go to **Table Editor** → Confirm `batch_phases` table exists with 4 rows (2 MBB + 2 VIB phases)

### Option B: Via Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or run the specific migration
supabase migration up
```

---

## Step 2: Verify Migration Success

### Check in Supabase Table Editor

1. Navigate to **Table Editor**
2. Find `batch_phases` table
3. Should see 4 default rows:
   - MBB Before 15 (period_type: before, cutoff_day: 15)
   - MBB After 15 (period_type: after, cutoff_day: 15)
   - VIB Before 15 (period_type: before, cutoff_day: 15)
   - VIB After 15 (period_type: after, cutoff_day: 15)

### Check Added Columns

1. `batch_master_items` table → should have new `phase_id` column (UUID, nullable)
2. `batches` table → should have new `phase_id` column (UUID, nullable)

---

## Step 3: Test Phase Setup UI

### Open Batch Page

```bash
pnpm dev
# Navigate to http://localhost:3000/batch/mbb
```

### Test Phase Management

1. **View Current Phases** — Should see "Phase 1: Before 15" and "Phase 2: After 15" tabs
2. **Click "Phases" Button** — Opens phase setup panel
3. **Create New Phase:**
   - Label: "Early Bird"
   - Period: "before"
   - Cutoff Day: 10
   - Click Save
4. **Verify New Phase** — Should appear as a new tab in the checklist
5. **Delete Phase** — Click delete icon, confirm. Phase should disappear.

---

## Step 4: Test Phase Assignment to Master Items

### Scenario: Create a phase and assign master items

1. **Create Phase:**
   - Label: "Super Early"
   - Period: before
   - Cutoff Day: 5
2. **Sync Master Items** — Click "Global Sync" button
3. **Verify Distribution:**
   - Master items with `cutoff_period = 'before'` should match "Super Early" phase
   - Check each phase tab to see distributed items
4. **Check Database:**
   - Query `batch_master_items` → `phase_id` should be populated for synced items

---

## Step 5: Test Batch Creation with Phases

### Create a month batch

1. **Select Month** — Use month dropdown to pick current or next month
2. **Click Global Sync** — Initializes batch items from master
3. **Verify Batch Creation:**
   - Check `batches` table → new batch should have `phase_id` set
   - Check `batch_items` → items should link to correct master items with matching phases

---

## Expected Behavior After Migration

### Phase Tabs
- Dynamically generated from `batch_phases` table
- Sorted by `sort_order`
- Each phase shows:
  - Label (e.g., "Before 15")
  - Cutoff day badge
  - Item count
  - Total amount

### Master Item Assignment
- Items without `phase_id` fall back to matching by `cutoff_period` → `phase.period_type`
- After sync, `phase_id` should be populated for explicit linkage

### Batch Creation
- New batches created via `bulkInitializeFromMasterAction` include `phase_id`
- Links batch to the active phase selected at sync time

---

## Troubleshooting

### Error: "Could not find the table 'public.batch_phases'"

**Cause:** Migration hasn't been run yet  
**Fix:** Run Step 1 above

### Error: "relation 'batch_phases' does not exist"

**Cause:** RLS policy blocking access or table not created  
**Fix:** 
1. Check if table exists in Table Editor
2. Verify RLS policy: `CREATE POLICY "Allow all for authenticated users" ON batch_phases FOR ALL USING (auth.role() = 'authenticated');`
3. Check your Supabase auth — ensure you're logged in

### Phase tabs not showing

**Cause:** `getChecklistDataAction` returning empty `phases` array  
**Debug:**
1. Open browser console
2. Check network tab for `/api/...` calls
3. Look for `batch_phases` query error
4. Verify migration ran successfully

### Master items not distributing to phases

**Cause:** `phase_id` not set and fallback matching failing  
**Fix:**
1. Check `batch_master_items.cutoff_period` values (should be 'before' or 'after')
2. Check `batch_phases.period_type` values match
3. Run backfill query from migration Step 5

---

## Next Steps After Migration Success

1. ✅ **Test phase CRUD** — Create, edit, delete phases via UI
2. ✅ **Test sync flow** — Master items → batches with phase assignment
3. ⏭ **Add phase selector to settings page** — Manage phases globally
4. ⏭ **Add phase reordering** — Drag & drop to change `sort_order`
5. ⏭ **Add phase-specific filters** — Filter transactions by phase
6. ⏭ **Add phase Analytics** — Show spending by phase over time

---

## Files Modified (Current Branch)

**Migration:**
- `supabase/migrations/20260223_create_batch_phases.sql` — CREATE table + seed data

**Server Actions:**
- `src/actions/batch-phases.actions.ts` — CRUD operations for phases
- `src/actions/batch-checklist.actions.ts` — Fetches phases alongside master items
- `src/actions/batch-speed.actions.ts` — Phase-aware sync

**UI Components:**
- `src/components/batch/BatchMasterChecklist.tsx` — Dynamic phase tabs + setup panel
- `src/components/batch/batch-page-client-v2.tsx` — Month selector + refresh

**Types:**
- `src/services/batch-master.service.ts` — Added `phase_id` to `BatchMasterItem`

---

## Testing Checklist

- [ ] Migration runs successfully in Supabase
- [ ] `batch_phases` table exists with 4 default rows
- [ ] `batch_master_items.phase_id` column exists
- [ ] `batches.phase_id` column exists
- [ ] Phase tabs display correctly in batch page
- [ ] "Phases" button opens setup panel
- [ ] Can create new phase
- [ ] Can delete phase
- [ ] Global sync distributes items to correct phases
- [ ] New batches have `phase_id` set
- [ ] Fast refresh preserves phase data
- [ ] Page navigation works (no removeChild errors)

---

## Commit Message Template

```
feat(batch): implement dynamic N-phase system

- Run batch_phases table migration with RLS + triggers
- Add phase_id FK to batch_master_items and batches
- Phase CRUD actions: create, update, delete, reorder
- Dynamic phase tabs in BatchMasterChecklist
- Phase setup panel with inline create/delete
- Fallback matching: cutoff_period → period_type
- Backfill existing items/batches with phase_id

Migration: supabase/migrations/20260223_create_batch_phases.sql
Actions: batch-phases.actions.ts, batch-checklist.actions.ts
UI: BatchMasterChecklist.tsx phase accordion and setup

Closes #[issue-number]
```

---

## Quick Test Commands

```bash
# Start dev server
pnpm dev

# Open batch page
open http://localhost:3000/batch/mbb

# Check Supabase logs (if using local Supabase)
supabase logs
```

---

**Ready to proceed!** Run the migration in Supabase Dashboard SQL Editor, then test the phase UI.
