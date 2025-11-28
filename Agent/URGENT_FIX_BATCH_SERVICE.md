# URGENT FIX REQUIRED - batch.service.ts

## Problem
The file `src/services/batch.service.ts` has been corrupted with duplicate function definitions due to a bad replacement operation.

## Duplicate Functions Found:
- `sendBatchToSheet` (appears 2x)
- `checkAndAutoCloneBatches` (appears 2x)  
- `getPendingBatchItemsByAccount` (appears 2x)
- `cloneBatch` code duplicated inline

## Solution

### Option A: Manual Fix
1. Open `src/services/batch.service.ts`
2. Search for duplicate functions
3. Keep only ONE instance of each function
4. Remove the duplicated code blocks

### Option B: Use Git
```bash
# Revert the file to last good state
git checkout HEAD -- src/services/batch.service.ts

# Then apply ONLY the voidBatchItem fix
```

### Option C: Replace with Fixed Version
I will create a new file `batch.service.FIXED.ts` with:
1. ✅ voidBatchItem with balance update
2. ✅ Updated importBatchItemsFromExcel for new format
3. ✅ All other functions (no duplicates)

## What Needs to Be in the Fixed File

### 1. voidBatchItem (UPDATED)
```typescript
export async function voidBatchItem(itemId: string) {
    // ... fetch item
    // ... fetch transaction lines
    // ... reverse balances for each account
    // ... void transaction
    // ... update item status
}
```

### 2. importBatchItemsFromExcel (UPDATED)
```typescript
// New format: STT | Bank Code - Name | Full Name
// Column 0: STT
// Column 1: "314 - NH Quốc tế VIB"  
// Column 2: "NH TMCP Quốc tế Việt Nam"
```

### 3. All Other Functions (UNCHANGED)
- getBatches
- createBatch
- updateBatch
- deleteBatch
- getBatchById
- addBatchItem
- updateBatchItem
- deleteBatchItem
- confirmBatchItem
- cloneBatch
- sendBatchToSheet
- checkAndAutoCloneBatches
- getPendingBatchItemsByAccount

## Immediate Action Required

Due to file size and complexity, the best approach is:

1. **Revert the file:**
   ```bash
   git checkout HEAD -- src/services/batch.service.ts
   ```

2. **Then apply ONLY these 2 changes:**
   - Update `voidBatchItem` to reverse balances
   - Update `importBatchItemsFromExcel` for new format

I will create separate, smaller patches for each function that you can apply manually or I can help apply one at a time.
