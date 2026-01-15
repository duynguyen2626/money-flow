# Batch Refactor Migrations - Phase 1

## Overview
These migrations add support for monthly-first batch workflow with bank type filtering (MBB/VIB).

## Migration Files

### 1. `20260115_add_batch_refactor_fields.sql`
**Purpose**: Add new columns to `batches` table

**Changes**:
- `month_year` (TEXT): Format `YYYY-MM` for monthly grouping
- `bank_type` (TEXT): `'MBB'` or `'VIB'` with CHECK constraint
- `cloned_from_id` (UUID): Reference to source batch if cloned

**Indexes**:
- `idx_batches_month_year`: Fast filtering by month
- `idx_batches_bank_type`: Fast filtering by bank type
- `idx_batches_month_bank`: Composite index for combined queries

**Backfill Logic**:
- Existing batches get `month_year` from `created_at`
- `bank_type` inferred from batch name (VIB if contains "VIB", else MBB)

### 2. `20260115_create_batch_settings.sql`
**Purpose**: Create settings table for sheet/webhook URLs per bank type

**Schema**:
```sql
batch_settings (
    id UUID PRIMARY KEY,
    bank_type TEXT UNIQUE,
    sheet_url TEXT,        -- Google Apps Script URL
    sheet_name TEXT,       -- Optional sheet tab name
    webhook_url TEXT,      -- Optional webhook for auto-sync
    webhook_enabled BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
```

**Constraints**:
- `sheet_url` must match: `https://script.google.com/macros/s/{SCRIPT_ID}/exec`
- `webhook_url` must be valid HTTP(S) URL

**Seed Data**:
- Inserts default rows for `MBB` and `VIB` with NULL URLs

**Triggers**:
- Auto-update `updated_at` on row changes

### 3. `20260115_add_batch_items_indexes.sql`
**Purpose**: Add performance indexes to `batch_items` table

**Indexes**:
- `idx_batch_items_batch_id`: Join with batches
- `idx_batch_items_status`: Filter by status
- `idx_batch_items_batch_status`: Composite for common queries

## How to Run

### Option 1: Supabase CLI (Recommended)
```bash
# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

### Option 2: Supabase Dashboard
1. Go to SQL Editor
2. Copy-paste each migration file in order
3. Execute

### Option 3: Manual SQL
Connect to your database and run:
```sql
\i supabase/migrations/20260115_add_batch_refactor_fields.sql
\i supabase/migrations/20260115_create_batch_settings.sql
\i supabase/migrations/20260115_add_batch_items_indexes.sql
```

## Verification

After running migrations, verify:

```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'batches' 
AND column_name IN ('month_year', 'bank_type', 'cloned_from_id');

-- Check batch_settings table
SELECT * FROM batch_settings;

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('batches', 'batch_items') 
AND indexname LIKE 'idx_%';
```

## Rollback (if needed)

```sql
-- Drop indexes
DROP INDEX IF EXISTS idx_batches_month_year;
DROP INDEX IF EXISTS idx_batches_bank_type;
DROP INDEX IF EXISTS idx_batches_month_bank;
DROP INDEX IF EXISTS idx_batch_items_batch_id;
DROP INDEX IF EXISTS idx_batch_items_status;
DROP INDEX IF EXISTS idx_batch_items_batch_status;

-- Drop batch_settings table
DROP TABLE IF EXISTS batch_settings CASCADE;

-- Remove columns from batches
ALTER TABLE batches 
DROP COLUMN IF EXISTS month_year,
DROP COLUMN IF EXISTS bank_type,
DROP COLUMN IF EXISTS cloned_from_id;
```

## Next Steps

After migrations complete:
1. ✅ Phase 1 complete
2. ⏭️ Phase 2: Create routing (`/batch/[bankType]`)
3. ⏭️ Phase 3: Build UI components

## Notes

- **Placeholder Format**: Sheet URLs must follow Google Apps Script format
- **Default Bank Type**: MBB is the default
- **Backfill**: Existing batches are automatically migrated
- **No Data Loss**: All existing batch data is preserved
