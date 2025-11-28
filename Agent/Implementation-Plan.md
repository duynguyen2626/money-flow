# Architecture & Implementation Plan

## Current System Issues

### Problem 1: Import Logic Confusion
- Current `batch-import-dialog.tsx` imports to `batch_items` table
- Should import to `bank_mappings` table (universal bank data)

### Problem 2: Missing Data in "Add Batch Item" Modal
- Bank code dropdown shows "Không tìm thấy ngân hàng" (No banks found)
- This means `bank_mappings` table is empty
- Need to import bank mappings first

## Correct Architecture

### Tables:
1. **`bank_mappings`** - Universal bank code mappings
   - Columns: id, bank_code, bank_name, short_name, logo_url, created_at, updated_at
   - Example: 314 = "NH Quốc tế VIB" = "VIB"
   
2. **`batch_items`** - Items in a specific batch
   - Columns: id, batch_id, receiver_name, bank_number, amount, bank_name, card_name, etc.
   - References bank_mappings via bank_code

### Workflow:
1. **Import Mappings** (Main /batch page, Mapping Management tab):
   - Upload Excel with bank codes
   - Saves to `bank_mappings` table
   - Universal data, not tied to any batch
   
2. **Create Batch**:
   - Optionally select a "mapping file" reference (future feature)
   
3. **Add Batch Items** (In batch details):
   - Select bank from `bank_mappings` dropdown
   - Manually enter: receiver name, amount, bank number, card name
   - Saves to `batch_items` table with batch_id

## Implementation Steps

### Step 1: Fix Import Dialog Purpose
- Rename current `batch-import-dialog.tsx` to `bank-mapping-import-dialog.tsx`
- Move it to main `/batch` page
- Remove `batchTag` field
- Import to `bank_mappings` table instead of `batch_items`

### Step 2: Create Mapping Management Tab on /batch page
- Add "Mapping Management" tab after "Processing" and "Done"
- Show all bank_mappings
- Allow import/delete operations

### Step 3: Update Add Item Dialog
- Change "Mã Ngân hàng" to "Bank Code"
- Populate dropdown from `bank_mappings` table (already working via /api/banks)

### Step 4: SQL to Reset Tables
```sql
-- Drop all batch_items (if you want to reimport):
TRUNCATE TABLE batch_items CASCADE;

-- Drop all bank_mappings (to reimport fresh data):
TRUNCATE TABLE bank_mappings CASCADE;

-- Or delete specific data:
DELETE FROM batch_items WHERE created_at > '2025-11-27';
DELETE FROM bank_mappings WHERE created_at > '2025-11-27';
```

## Files to Modify

1. ✅ `src/components/batch/batch-import-dialog.tsx` → Rename to `bank-mapping-import-dialog.tsx`
2. ✅ `src/app/batch/page.tsx` → Add Import button + Mapping Management tab
3. ✅ `src/components/batch/add-item-dialog.tsx` → Change labels to English
4. ✅ `src/services/bank.service.ts` → Already has `importBankMappingsFromExcel`
5. ✅ Update import action to remove batchTag requirement

## Next Actions
1. Implement the changes above
2. Test import flow
3. Verify bank dropdown populates correctly
