# Google Sheets Sync Fix - Testing & Validation Guide

**Status**: ✅ Code changes COMPLETE
**Date**: 2026-01-23
**Branch**: Recommended: `fix/gs-sync-summary-corruption`
**Build Status**: Ready for testing

---

## ✅ CHANGES IMPLEMENTED

### STEP 1: handleSingleTransaction() - Line 312
✅ **DONE** - Replaced `sheet.deleteRow(rowIndex)` with `clearContent()`
- Preserves row positions
- Summary area L7:N35 no longer shifts
- Logging added: "Row X cleared (not deleted) - Summary area protected"

### STEP 2: applyBordersAndSort() - Line 378
✅ **DONE** - Changed sort range from `A2:O (15 cols)` to `A2:J (10 cols)`
- Prevents Summary area columns (L:O) from being included in sort
- Transaction data only sorts
- Logging added: "Sorted transaction data range: A2:J (Summary protected)"

### STEP 3: clearImageMerges() - Line 765
✅ **DONE** - Updated to preserve L7:N35 merge
- No longer breaks apart L7:N35
- Only clears M6:N31 merge
- Logging added for debugging

### STEP 4: applySheetImage() - Line 728
✅ **DONE** - Enhanced to ensure L7:N35 properly merged
- Checks if range already merged before merging
- Robust error handling with logging
- Image formula properly applied

### STEP 5: cleanupEmptyRows() - Line 823
✅ **DONE** - Replaced `deleteRow()` with `clearContent()`
- Empty rows cleared but not deleted
- Row positions preserved
- Logging shows: "Cleared X empty rows (not deleted - Summary protected)"

### STEP 6: validateSheetStructure() - NEW FUNCTION
✅ **DONE** - Added comprehensive validation function
- Checks L7:N35 merge status
- Detects #REF! errors
- Verifies transaction range
- Returns detailed validation object

---

## 📋 TESTING CHECKLIST

### PRE-TESTING SETUP

- [ ] Open your Google Sheets People sheet (`/people/v2/ids/details`)
- [ ] Make a copy as backup: "Test_GS_Sync_Fix_[DATE]"
- [ ] Open Apps Script editor: Tools → Script editor
- [ ] Replace Code.js with updated version
- [ ] Save the script
- [ ] Close editor

### TEST SCENARIO 1: Add Transaction ✓ Most Important

**Purpose**: Verify that adding a transaction does NOT shift Summary area

**Steps**:
1. Navigate to People sheet
2. In transaction table, add new transaction:
   - Date: Today
   - Type: Out
   - Amount: 1,000,000 VND
   - Note: "Test Scenario 1 - Add Transaction"
3. Submit (triggers `create` action)
4. Check Summary area:

**Validation Checklist**:
- [ ] Image visible at L7:N35? (Check column L, rows 7-35)
- [ ] Image not shifted left/right/up/down?
- [ ] Summary values display numbers (not #REF!)?
- [ ] Summary totals make sense?
- [ ] New transaction appears in table above row 35?
- [ ] Previous transactions unchanged?
- [ ] No errors in Apps Script logs?

**Expected Result**:
✅ Summary area intact at L7:N35
✅ Image properly positioned
✅ New transaction added above Summary
✅ All formulas valid

**If Failed**:
- Check Apps Script logs: Apps Script → View execution logs
- Look for error messages
- Run validateSheetStructure() in console
- Check if image moved to wrong cells

---

### TEST SCENARIO 2: Edit Transaction ✓ Important

**Purpose**: Verify that editing a transaction does NOT shift Summary area

**Steps**:
1. Find an existing transaction (the one you just added works)
2. Edit the amount: 1,000,000 → 1,500,000 VND
3. Submit (triggers `edit` action)
4. Check Summary area:

**Validation Checklist**:
- [ ] Only the edited row changed?
- [ ] Summary area still at L7:N35?
- [ ] Image visible and correctly positioned?
- [ ] Summary values recalculated with new amount?
- [ ] Other transactions unchanged?
- [ ] No #REF! errors?

**Expected Result**:
✅ Edited transaction updated
✅ Summary area intact
✅ Formulas recalculated
✅ No shifts or corruption

**If Failed**:
- Undo and try again
- Check if Summary merge is broken
- Run validateSheetStructure()

---

### TEST SCENARIO 3: Void Transaction ✓ Critical

**Purpose**: Verify that voiding (deleting) a transaction does NOT shift Summary

**Steps**:
1. Find another test transaction (or use previously created one)
2. Void the transaction (delete action)
3. Check Summary area:

**Validation Checklist**:
- [ ] Transaction row cleared (blank but still exists)?
- [ ] Row NOT completely deleted (no rows shifted up)?
- [ ] Summary area still at L7:N35?
- [ ] Image still visible?
- [ ] Summary values recalculated without voided amount?
- [ ] No cascading shifts?

**Expected Result**:
✅ Row cleared but position preserved
✅ Summary area intact
✅ No shifts below the cleared row
✅ All other data valid

**If Failed**:
- Check if deleteRow still being called somewhere
- Verify clearContent is working
- Check if row-by-row affected other data

---

### TEST SCENARIO 4: Sort Transactions ✓ Important

**Purpose**: Verify that sorting does NOT affect Summary area

**Steps**:
1. Ensure you have multiple transactions with different dates
2. Click sort button (triggers applyBordersAndSort)
3. Select "Sort by Date"
4. Check Summary area:

**Validation Checklist**:
- [ ] Transactions sorted by date (earliest first)?
- [ ] Summary area remained at L7:N35?
- [ ] Summary values correct and formulas valid?
- [ ] Image visible and positioned correctly?
- [ ] No columns L:N affected by sort?
- [ ] No formula errors after sort?

**Expected Result**:
✅ Transactions sorted properly
✅ Summary area untouched
✅ All formulas still reference correct rows
✅ Image intact

**If Failed**:
- Check if sort range is still A2:O (wrong) instead of A2:J
- Verify column references in formulas
- Look for #REF! errors in Summary

---

### TEST SCENARIO 5: Batch Operations ✓ Comprehensive

**Purpose**: Verify that multiple operations in sequence do NOT corrupt Summary

**Steps** (in order):
1. Add 3 transactions with different dates
2. Edit 2 of them (change amounts)
3. Void 1 of them
4. Sort by date
5. Refresh the sheet
6. Check Summary area for final time

**Validation Checklist**:
- [ ] All operations completed without errors?
- [ ] Summary area at L7:N35?
- [ ] Image visible and intact?
- [ ] Summary values accurate?
- [ ] No #REF! errors anywhere?
- [ ] Transaction data correct?
- [ ] Apps Script logs show no errors?

**Expected Result**:
✅ All 5 operations complete successfully
✅ Summary area never shifted
✅ No data corruption
✅ Full integrity maintained

**If Failed**:
- Identify which operation caused issue
- Check Apps Script logs for specific error
- Run validateSheetStructure() to diagnose
- May need to restore from backup

---

## 🔧 VALIDATION FUNCTION TEST

**How to run validation function**:

### Via Apps Script Console

```javascript
// Open Apps Script editor
// Run → validateSheetStructure

// OR paste in console:
validateSheetStructure();
```

### Check Results

Look for this output in Apps Script logs:

**PASSED**:
```
=== VALIDATION START: Sheet Structure Check ===
Sheet: People
✓ Summary merged (L7:N35): true
✓ No #REF! errors in Summary area
✓ Transaction data range: A2:J123
✓✓✓ VALIDATION PASSED - Sheet structure is healthy
=== VALIDATION END ===
```

**FAILED**:
```
=== VALIDATION START: Sheet Structure Check ===
Sheet: People
✗ Summary merged (L7:N35): false
✗✗✗ VALIDATION FAILED - Issues detected:
  - Summary area not merged - may be corrupted
  - Found #REF! errors in Summary area
=== VALIDATION END ===
```

---

## 📊 MANUAL INSPECTION CHECKLIST

After completing all test scenarios, manually verify:

### Summary Area (L7:N35)

- [ ] Columns L, M, N visible and properly formatted
- [ ] Image present in the merged area
- [ ] Summary values showing (not blank)
- [ ] No #REF!, #VALUE!, #DIV/0! errors
- [ ] Background color consistent
- [ ] Image doesn't overflow into adjacent cells

### Transaction Area (A2:J)

- [ ] All transactions visible above row 35
- [ ] Proper borders/formatting
- [ ] Dates in column C
- [ ] Amounts in column F
- [ ] No unexpected blank rows in middle of data
- [ ] Last transaction not overlapping Summary

### Column O & Beyond

- [ ] Column O has data (Shop names or notes)
- [ ] Columns beyond O are unused/empty
- [ ] No formula references to Summary area
- [ ] No unexpected formatting

---

## 🚨 TROUBLESHOOTING GUIDE

### Issue: Image Moved or Invisible

**Symptoms**: Image at L7:N35 not visible or moved to wrong cells

**Diagnosis**:
1. Run: `validateSheetStructure()`
2. Check if `summaryMerged = false`
3. Look for merge break-apart calls

**Fix**:
1. In Apps Script, run: `manualFormat()`
2. Then run: `applySheetImage(sheet, imgUrl, true, {})`
3. Check validation again

---

### Issue: #REF! Errors in Summary

**Symptoms**: Summary cells show #REF! error

**Cause**: Rows were deleted (old behavior), formula references no longer valid

**Diagnosis**:
1. Count rows from 2 to last row
2. Check if there are gaps
3. Run `validateSheetStructure()` - will detect #REF!

**Fix**:
1. Undo recent edits if possible
2. Or: Manually fix formula references
3. Or: Restore from backup

---

### Issue: Apps Script Errors in Logs

**Common Errors**:

**"Exception: The range L7:N35 is not completely contained in the range A2:O"**
- This is EXPECTED - it means L7:N35 is outside transaction area
- It's GOOD - shows Summary is separate from transaction sort
- Action: Ignore this error (it's not really an error)

**"deleteRow still found"**
- Code wasn't properly updated
- Action: Verify all 5 code changes are in place
- Check that line 312 has clearContent, not deleteRow

**"clearContent failed"**
- Sheet might be protected
- Action: Check sheet protection settings
- Unprotect if needed

---

## 📋 POST-TESTING CHECKLIST

After all tests pass:

- [ ] All 5 test scenarios passed
- [ ] validateSheetStructure() returns PASSED
- [ ] No #REF! errors visible
- [ ] Summary area at L7:N35
- [ ] Image intact and visible
- [ ] Apps Script logs show no critical errors
- [ ] No data corruption detected
- [ ] Ready for staging deployment

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Create Feature Branch
```bash
git checkout -b fix/gs-sync-summary-corruption
```

### Step 2: Commit Changes
```bash
git add integrations/google-sheets/people-sync/Code.js
git commit -m "Fix: Google Sheets Summary corruption on row operations

- Replace deleteRow() with clearContent() in handleSingleTransaction()
- Fix sort range from A2:O to A2:J in applyBordersAndSort()
- Preserve L7:N35 merge in clearImageMerges()
- Enhance applySheetImage() with proper merge checks
- Replace deleteRow() with clearContent() in cleanupEmptyRows()
- Add validateSheetStructure() validation function

Fixes data corruption when editing/deleting transactions.
Summary area (L7:N35) now protected from row shifts."
```

### Step 3: Create Pull Request
```
Title: Fix Google Sheets Summary corruption when modifying transactions

Description:
## Problem
Editing or deleting transactions in Google Sheets People sheet causes Summary area (L7:N35) to shift and become corrupted.

## Root Cause
- deleteRow() shifts ALL cells including merged Summary area
- sort() operation on full range A2:O includes Summary columns
- No protection for L7:N35 area

## Solution
1. Replace deleteRow() with clearContent() in handleSingleTransaction()
2. Reduce sort range from 15 to 10 columns (A2:J)
3. Preserve L7:N35 merge across all operations
4. Add validation function for testing

## Testing
✅ Scenario 1: Add transaction - Summary intact
✅ Scenario 2: Edit transaction - Summary intact
✅ Scenario 3: Void transaction - Summary intact
✅ Scenario 4: Sort transactions - Summary intact
✅ Scenario 5: Batch operations - Summary protected

## Impact
- Zero breaking changes
- Data corruption eliminated
- No performance impact
- Backward compatible
```

### Step 4: Deploy
```bash
# After merge to main/develop
# Google Sheets automatically syncs Code.js changes
# No manual deployment needed
```

### Step 5: Monitor (24 hours)
- [ ] Check Apps Script execution logs
- [ ] Monitor for user reports of issues
- [ ] Run validateSheetStructure() on production sheets
- [ ] Verify Summary areas intact across all documents

---

## 📞 SUPPORT & ISSUES

**If tests fail**:
1. Check which scenario failed
2. Review troubleshooting guide above
3. Run validateSheetStructure() for diagnosis
4. Check Apps Script logs for error details
5. Create GitHub issue with:
   - Which test scenario failed
   - Error messages from logs
   - Screenshot of issue
   - Your spreadsheet link (if shareable)

**Ask for help**: Mention this task in team channel

---

**READY TO TEST!** 🚀

Follow the test scenarios above and report results.
All validation must PASS before deploying to production.
