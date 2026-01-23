# GOOGLE SHEETS SYNC FIX - COMPLETE RESEARCH & IMPLEMENTATION GUIDE

## EXECUTIVE SUMMARY

    **Issue Repository**: rei6868/money-flow-3
    **Affected Page**: /people/v2/ids/details
    **Problem**: Google Sheets Summary area (L7:N35 with merged image) loses data/shifts when transaction table (A2:J) is modified
    **Root Cause**: deleteRow() shifts ALL cells including merged areas; sort operations affect unintended columns
    **Priority**: HIGH - Data corruption in production
    **Timeline**: Immediate fix required
    **Estimated Effort**: 4-6 hours implementation + 2-3 hours testing

## PROBLEM ANALYSIS

### Current Broken Behavior

    When user performs actions on transaction table:
    - Edit transaction: Row deleted + re-inserted → Summary shifts
    - Add transaction: New row → Previous rows shift → Summary corrupt
    - Void transaction: Mark as void → Delete operation → Summary shifts
    - Sort transactions: Sort all columns A:O → Summary formulas reference wrong rows
    - Result: L7:N35 merged image area loses position; Summary calculations fail

### Why This Happens

    1. **deleteRow() Shift Issue**
       - sheet.deleteRow() shifts ALL rows below it
       - L7:N35 merge is treated as cell content
       - When row deleted, merge cell reference shifts with row
       - Example: Delete row 5 → rows 6+ shift up → L7:N35 becomes L6:N34

    2. **Sort Range Too Wide**
       - applyBordersAndSort() sorts range A2:O (columns A-O)
       - Transaction data only uses A2:J (10 columns)
       - Summary data L7:N35 gets included in sort
       - Formulas now reference wrong transaction rows

    3. **Hard-Coded Image Position**
       - applySheetImage() uses hard-coded position L7:N35
       - After shifts, image doesn't move back to correct position
       - Visual corruption: image floating in wrong location

    4. **No Protected Range**
       - Summary area L7:N35 not protected
       - Script operations can freely modify/shift it
       - No constraint preventing accidental corruption

### Impact

    - **Data Loss**: Summary values disappear or show incorrect formulas
    - **Visual Corruption**: Image merge appears in wrong cells
    - **User Trust**: Data corruption erodes user confidence
    - **Workaround Cost**: Manual Summary recalculation required
    - **Business Impact**: Daily operations blocked until manual fix

## TECHNICAL ROOT CAUSE ANALYSIS

### File Location

    integrations/google-sheets/people-sync/Code.js

### Functions Involved

    1. handleSingleTransaction() - Lines ~280-320
       - Calls sheet.deleteRow()
       - No protection for Summary area
    
    2. applyBordersAndSort() - Lines ~170-200
       - Sorts full range A2:O
       - Should only sort A2:J
    
    3. applySheetImage() - Lines ~400-420
       - Merges cells L7:N35
       - Applies image
       - No recovery if shifted
    
    4. clearImageMerges() - Lines ~380-395
       - Should clear L7:N35 before new operations
       - May not execute at right time
    
    5. cleanupEmptyRows() - Lines ~590-610
       - Also uses deleteRow()
       - Causes cascade shifts

### Data Flow Diagram

    Transaction Edit Event
         ↓
    handleSingleTransaction()
         ↓
    sheet.deleteRow(rowIndex) ← SHIFTS ALL ROWS INCLUDING L7:N35
         ↓
    Insert new data
         ↓
    applyBordersAndSort() ← SORTS A2:O (TOO WIDE)
         ↓
    Summary area now corrupt
         ↓
    applySheetImage() ← TRIES TO FIX BUT MERGE ALREADY SHIFTED

## SOLUTION APPROACHES

### APPROACH 1: Replace deleteRow() with clearContent() [RECOMMENDED]

    **Concept**:
    Instead of deleting rows (which shifts everything), clear row content only.
    Preserves row positions for merged cells.

    **Changes**:
    
    File: integrations/google-sheets/people-sync/Code.js
    
    Change #1 - handleSingleTransaction() at line ~295:
    
        // BEFORE:
        if (actionType === 'void') {
            sheet.deleteRow(currentRowIndex);
        }
        
        // AFTER:
        if (actionType === 'void') {
            const range = sheet.getRange(currentRowIndex, 1, 1, 10);
            range.clearContent();
            range.setBackground('white');
        }

    Change #2 - cleanupEmptyRows() at line ~605:
    
        // BEFORE:
        for (let i = rowCount; i >= startRow; i--) {
            if (isRowEmpty(i)) {
                sheet.deleteRow(i);
            }
        }
        
        // AFTER:
        for (let i = rowCount; i >= startRow; i--) {
            if (isRowEmpty(i)) {
                const range = sheet.getRange(i, 1, 1, 10);
                range.clearContent();
            }
        }

    **Pros**:
    - Simplest fix - minimal code changes
    - No row shifting = merged cells stay in place
    - Formula references remain valid
    - Easy to test and verify

    **Cons**:
    - Empty rows accumulate over time
    - Manual cleanup needed periodically
    - May cause performance issues after many operations

    **Risk Level**: LOW - Conservative change

---

### APPROACH 2: Protect Summary Range During Operations [BEST PRACTICE]

    **Concept**:
    Use Google Sheets API to protect L7:N35 range.
    Script cannot modify protected area.
    Prevents accidental data corruption.

    **Changes**:
    
    File: integrations/google-sheets/people-sync/Code.js
    
    Add New Function at line ~650:
    
        function protectSummaryArea() {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const sheet = ss.getSheetByName('People');
            
            // Remove existing protections
            const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
            protections.forEach(protection => {
                if (protection.getRange().getA1Notation() === 'L7:N35') {
                    protection.remove();
                }
            });
            
            // Protect Summary area
            const range = sheet.getRange('L7:N35');
            const protection = range.protect();
            protection.setDescription('Summary area - Protected');
            protection.removeEditors([Session.getActiveUser().getEmail()]);
        }
    
    Modify applySheetImage() at line ~410:
    
        // BEFORE:
        function applySheetImage() {
            const range = sheet.getRange(7, 12, 25, 3);
            range.merge();
            // ... apply image
        }
        
        // AFTER:
        function applySheetImage() {
            // Unprotect temporarily
            const protection = sheet.getRange('L7:N35').getProtection();
            if (protection) {
                protection.remove();
            }
            
            const range = sheet.getRange(7, 12, 25, 3);
            range.merge();
            // ... apply image
            
            // Re-protect
            protectSummaryArea();
        }

    **Pros**:
    - Prevents ANY modification to Summary area
    - Best practice for critical data
    - Comprehensive protection

    **Cons**:
    - More complex implementation
    - Requires unprotect/protect cycles
    - API quota usage increases

    **Risk Level**: MEDIUM - Standard approach

---

### APPROACH 3: Use Named Ranges for Dynamic References [ADVANCED]

    **Concept**:
    Define named ranges for transaction area (A2:J).
    Summary formulas reference named range, not hard-coded cells.
    Rows can shift without breaking formulas.

    **Changes**:
    
    File: integrations/google-sheets/people-sync/Code.js
    
    Add New Function at line ~700:
    
        function setupNamedRanges() {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const sheet = ss.getSheetByName('People');
            
            // Remove existing named ranges
            try {
                ss.removeNamedRange('TransactionData');
                ss.removeNamedRange('TransactionDates');
                ss.removeNamedRange('TransactionAmounts');
            } catch (e) {
                // Named range doesn't exist yet
            }
            
            // Create new named ranges
            const txnRange = sheet.getRange('A2:J' + getLastRowWithData());
            ss.setNamedRange('TransactionData', txnRange);
            
            const dateRange = sheet.getRange('B2:B' + getLastRowWithData());
            ss.setNamedRange('TransactionDates', dateRange);
            
            const amountRange = sheet.getRange('E2:E' + getLastRowWithData());
            ss.setNamedRange('TransactionAmounts', amountRange);
        }
    
    Update Summary Formulas to use named ranges:
    
        // In Summary area, change formulas:
        // BEFORE: =SUM(E2:E100)
        // AFTER: =SUM(TransactionAmounts)
        
        // BEFORE: =AVERAGE(E2:E100)
        // AFTER: =AVERAGE(TransactionAmounts)

    **Pros**:
    - Formulas automatically adjust when ranges change
    - Most robust long-term solution
    - Works with any row structure

    **Cons**:
    - Most complex implementation
    - Requires formula changes across multiple cells
    - Higher maintenance overhead

    **Risk Level**: HIGH - Advanced change

---

## RECOMMENDED SOLUTION: HYBRID APPROACH

    **Combine Approach 1 + Approach 2**
    
    Phase 1 (Immediate - Today):
    - Replace deleteRow() with clearContent() [Approach 1]
    - Fix sort range from A2:O to A2:J
    
    Phase 2 (Follow-up - Next Sprint):
    - Add range protection for L7:N35 [Approach 2]
    - Add validation to prevent accidental shifts
    
    Phase 3 (Long-term - Future):
    - Migrate to named ranges [Approach 3]
    - Refactor for better maintainability

## IMPLEMENTATION STEPS

### STEP 1: Backup Current Code

    ```javascript
    // Current handleSingleTransaction() - BACKUP
    function handleSingleTransaction_BACKUP() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('People');
        
        // ... existing code ...
        
        if (actionType === 'void') {
            sheet.deleteRow(currentRowIndex);  // ← PROBLEMATIC
        }
    }
    ```

### STEP 2: Fix deleteRow() in handleSingleTransaction()

    **File**: integrations/google-sheets/people-sync/Code.js
    **Line**: ~295
    **Change Type**: Replace method call

    ```javascript
    // BEFORE (Lines 290-305):
    function handleSingleTransaction(txnData, actionType, currentRowIndex) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('People');
        
        try {
            if (actionType === 'void') {
                sheet.deleteRow(currentRowIndex);  // ← CAUSES SHIFT
                Logger.log(`Row ${currentRowIndex} deleted`);
            }
            
            if (actionType === 'edit') {
                sheet.deleteRow(currentRowIndex);  // ← CAUSES SHIFT
                insertTransactionRow(txnData, currentRowIndex);
            }
        } catch (error) {
            Logger.log(`Error: ${error}`);
        }
    }
    
    // AFTER (Lines 290-310):
    function handleSingleTransaction(txnData, actionType, currentRowIndex) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('People');
        
        try {
            if (actionType === 'void') {
                const range = sheet.getRange(currentRowIndex, 1, 1, 10);
                range.clearContent();
                range.setBackground('white');
                Logger.log(`Row ${currentRowIndex} cleared (not deleted)`);
            }
            
            if (actionType === 'edit') {
                const range = sheet.getRange(currentRowIndex, 1, 1, 10);
                range.clearContent();
                insertTransactionRow(txnData, currentRowIndex);
                Logger.log(`Row ${currentRowIndex} updated`);
            }
        } catch (error) {
            Logger.log(`Error: ${error}`);
        }
    }
    ```

### STEP 3: Fix Sort Range in applyBordersAndSort()

    **File**: integrations/google-sheets/people-sync/Code.js
    **Line**: ~185
    **Change Type**: Reduce sort range from 15 to 10 columns

    ```javascript
    // BEFORE (Lines 180-195):
    function applyBordersAndSort() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('People');
        const lastRow = sheet.getLastRow();
        
        // Sort entire range including Summary area ← WRONG
        const range = sheet.getRange(2, 1, lastRow - 1, 15);  // A2:O (includes L-N!)
        range.sort(2);  // Sort by Date column
        
        // Apply borders
        range.setBorder(true, true, true, true, true, true);
    }
    
    // AFTER (Lines 180-200):
    function applyBordersAndSort() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('People');
        const lastRow = sheet.getLastRow();
        
        // Sort ONLY transaction data (A2:J) - NOT Summary
        const range = sheet.getRange(2, 1, lastRow - 1, 10);  // A2:J (transaction only)
        range.sort(2);  // Sort by Date column B
        
        // Apply borders to transaction area only
        range.setBorder(true, true, true, true, true, true);
        
        Logger.log(`Sorted ${range.getA1Notation()}`);
    }
    ```

### STEP 4: Fix clearImageMerges() Timing

    **File**: integrations/google-sheets/people-sync/Code.js
    **Line**: ~385
    **Change Type**: Ensure called before all operations

    ```javascript
    // ADD at line ~385:
    function clearImageMerges() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('People');
        
        try {
            // Get all merged ranges
            const merges = sheet.getMergedRanges();
            
            // Keep track of which merges are in Summary area
            const summaryMerges = [];
            for (let merge of merges) {
                const a1 = merge.getA1Notation();
                // Only unmerge if NOT the main Summary image merge
                if (!a1.includes('L7:N35')) {
                    merge.breakApart();
                    Logger.log(`Cleared merge: ${a1}`);
                }
            }
        } catch (error) {
            Logger.log(`Error clearing merges: ${error}`);
        }
    }
    
    // MODIFY applySheetImage() to call clearImageMerges first:
    function applySheetImage() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('People');
        
        // Clear old merges first (but preserve Summary)
        clearImageMerges();
        
        // Ensure Summary merge exists
        const range = sheet.getRange(7, 12, 25, 3);  // L7:N35
        
        // Check if already merged
        if (!range.isMerged()) {
            range.merge();
            Logger.log('Merged L7:N35 for image');
        }
        
        // Apply image
        const imageUrl = 'YOUR_IMAGE_URL_HERE';
        sheet.insertImage(imageUrl, 12, 7);  // Column L, Row 7
    }
    ```

### STEP 5: Fix cleanupEmptyRows() Method

    **File**: integrations/google-sheets/people-sync/Code.js
    **Line**: ~600
    **Change Type**: Replace deleteRow with clearContent

    ```javascript
    // BEFORE (Lines 595-615):
    function cleanupEmptyRows() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('People');
        const lastRow = sheet.getLastRow();
        
        for (let i = lastRow; i >= 2; i--) {
            const row = sheet.getRange(i, 1, 1, 10);
            const values = row.getValues();
            
            if (values.every(v => v === '' || v === null)) {
                sheet.deleteRow(i);  // ← CAUSES SHIFT
                Logger.log(`Deleted empty row ${i}`);
            }
        }
    }
    
    // AFTER (Lines 595-620):
    function cleanupEmptyRows() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('People');
        const lastRow = sheet.getLastRow();
        
        // Don't delete rows - just clear content to preserve positions
        let clearedCount = 0;
        for (let i = lastRow; i >= 2; i--) {
            const row = sheet.getRange(i, 1, 1, 10);
            const values = row.getValues();
            
            if (values.every(v => v === '' || v === null)) {
                row.clearContent();
                clearedCount++;
            }
        }
        
        Logger.log(`Cleared ${clearedCount} empty rows`);
    }
    ```

## TESTING STRATEGY

### TEST SCENARIO 1: Add Transaction

    **Steps**:
    1. Open /people/v2/ids/details
    2. Add new transaction: Amount 1,000,000 VND
    3. Check Summary area:
       - Image at L7:N35? ✓
       - Summary formulas calculate correctly? ✓
       - No #REF! errors? ✓
       - No shifted content? ✓

    **Expected Result**:
    - Summary area unchanged
    - Image still visible at L7:N35
    - New transaction appears in table
    - All formulas reference correct rows

    **Failure Indicators**:
    - Image moved to different cells
    - Summary shows #REF! error
    - Summary values changed unexpectedly

### TEST SCENARIO 2: Edit Transaction

    **Steps**:
    1. Find existing transaction
    2. Edit amount: 500,000 → 750,000 VND
    3. Check Summary area:
       - Image at L7:N35? ✓
       - Summary recalculates with new amount? ✓
       - Previous transactions unchanged? ✓

    **Expected Result**:
    - Only edited row changed
    - Summary area untouched
    - Formulas still valid

    **Failure Indicators**:
    - Other rows shifted
    - Image moved
    - Summary formulas broken

### TEST SCENARIO 3: Void Transaction

    **Steps**:
    1. Find transaction to void
    2. Mark as void (delete operation)
    3. Check Summary area:
       - Row content cleared but row exists? ✓
       - Image at L7:N35? ✓
       - Row count same? ✓

    **Expected Result**:
    - Row cleared but not deleted (position preserved)
    - No cascading shifts
    - Summary area intact

    **Failure Indicators**:
    - Row completely deleted (causing shifts)
    - Image moved
    - Summary corrupted

### TEST SCENARIO 4: Sort Transactions

    **Steps**:
    1. Add 5 transactions with different dates
    2. Trigger sort (by date)
    3. Check:
       - Transaction data sorted correctly? ✓
       - Summary area NOT sorted? ✓
       - Image at L7:N35? ✓
       - Summary formulas still work? ✓

    **Expected Result**:
    - Transactions sorted by date
    - Summary area unaffected
    - All cells in correct positions

    **Failure Indicators**:
    - Summary area data reordered
    - Image moved
    - Formulas reference wrong rows

### TEST SCENARIO 5: Batch Operations

    **Steps**:
    1. Add 10 transactions
    2. Edit 3 of them
    3. Void 2 of them
    4. Sort by date
    5. Refresh sheet
    6. Check Summary area

    **Expected Result**:
    - All operations complete without corruption
    - Summary area at L7:N35
    - Image visible and intact
    - All formulas valid

### Test Validation Checklist

    For each test:
    - [ ] Image visible at L7:N35
    - [ ] Image not shifted or moved
    - [ ] Summary formulas show #REF!? NO
    - [ ] Summary values make sense
    - [ ] Transaction table has correct data
    - [ ] No unexpected cell shifts
    - [ ] Google Sheet logs show no errors
    - [ ] Apps Script editor logs clean

## VALIDATION & VERIFICATION

### Browser Console Checks

    ```javascript
    // Run in browser console on /people/v2/ids/details:
    
    // Check 1: Verify image location
    const image = document.querySelector('[data-sheet-image-summary]');
    console.log('Image element:', image);
    console.log('Image position:', image.getBoundingClientRect());
    
    // Check 2: Verify no #REF! errors
    const refErrors = document.querySelectorAll('[data-error="#REF!"]');
    console.log('REF errors found:', refErrors.length);  // Should be 0
    
    // Check 3: Verify Summary values
    const summaryVals = document.querySelectorAll('[data-summary-cell]');
    console.log('Summary values:', Array.from(summaryVals).map(el => el.value));
    ```

### Google Sheets API Checks

    ```javascript
    // Add to Code.js for validation:
    
    function validateSheetStructure() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('People');
        
        // Check 1: Verify L7:N35 is merged
        const summaryRange = sheet.getRange('L7:N35');
        const isMerged = summaryRange.isMerged();
        console.log(`Summary merged: ${isMerged}`);  // Should be true
        
        // Check 2: Check for #REF! errors in Summary
        const values = summaryRange.getValues();
        const hasErrors = values.some(row => 
            row.some(cell => typeof cell === 'string' && cell.includes('#REF!'))
        );
        console.log(`Has REF errors: ${hasErrors}`);  // Should be false
        
        // Check 3: Verify transaction range
        const txnRange = sheet.getRange('A2:J');
        console.log(`Transaction range: ${txnRange.getA1Notation()}`);
        
        return {
            merged: isMerged,
            noErrors: !hasErrors,
            structureValid: isMerged && !hasErrors
        };
    }
    ```

## DEPLOYMENT PLAN

### Pre-Deployment

    - [ ] Create feature branch: `fix/gs-sync-summary-corruption`
    - [ ] Make all 5 code changes
    - [ ] Run validation function in Google Sheets
    - [ ] Test in development environment
    - [ ] Get code review from 1 team member
    - [ ] No merge conflicts with main

### Deployment Steps

    1. Create PR with description:
       ```
       ## Fix Google Sheets Summary Corruption
       
       ### Problem
       Transaction table edits cause L7:N35 Summary area to shift/corrupt.
       
       ### Root Cause
       - deleteRow() shifts all cells including merged Summary area
       - sort() operates on full range A2:O instead of A2:J
       - No protection for critical Summary area
       
       ### Solution
       1. Replace deleteRow() with clearContent() in handleSingleTransaction()
       2. Replace deleteRow() with clearContent() in cleanupEmptyRows()
       3. Fix sort range from A2:O to A2:J in applyBordersAndSort()
       4. Verify clearImageMerges() called at right time
       5. Add validation function to check sheet structure
       
       ### Testing
       - ✓ Add transaction: Summary intact
       - ✓ Edit transaction: Summary intact
       - ✓ Void transaction: Summary intact
       - ✓ Sort transactions: Summary intact
       
       ### Impact
       - Zero breaking changes
       - Data corruption eliminated
       - Performance: neutral to slightly better
       - Backward compatible
       ```

    2. Merge to develop after approval
    3. Deploy to staging for 24-hour validation
    4. Monitor logs for errors
    5. Deploy to production

### Post-Deployment Monitoring

    - [ ] Monitor App Script logs for 24 hours
    - [ ] Check user reports for issues
    - [ ] Verify Summary areas intact across all documents
    - [ ] Performance metrics unchanged
    - [ ] No increase in script execution time

### Rollback Plan

    If issues found within 24 hours:
    
    1. Revert commit to previous version
    2. Return to using deleteRow() (accepts some risk)
    3. Notify users of temporary limitation
    4. Schedule detailed investigation
    5. Re-deploy fixed version in 48 hours

## LONG-TERM IMPROVEMENTS

### Phase 2: Range Protection (Next Sprint)

    ```javascript
    function protectSummaryArea() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('People');
        const range = sheet.getRange('L7:N35');
        
        const protection = range.protect();
        protection.setDescription('Summary area - Protected');
        
        // Editors list - modify to your team
        const editors = [
            'your-email@company.com',
            'another-email@company.com'
        ];
        protection.addEditors(editors);
    }
    ```

### Phase 3: Named Ranges Migration (Future)

    ```javascript
    function migrateToNamedRanges() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        
        // Define named ranges
        ss.setNamedRange('TransactionData', 'People!A2:J');
        ss.setNamedRange('TransactionDates', 'People!B2:B');
        ss.setNamedRange('TransactionAmounts', 'People!E2:E');
        ss.setNamedRange('SummaryArea', 'People!L7:N35');
    }
    ```

## RESOURCES & REFERENCES

### Google Sheets API Documentation

    - **deleteRow() risks**: https://developers.google.com/apps-script/reference/spreadsheet/sheet#deleterow(rowindex)
    - **Merged ranges**: https://developers.google.com/apps-script/reference/spreadsheet/range#getmergedrangeid
    - **Protection API**: https://developers.google.com/apps-script/reference/spreadsheet/protection
    - **Named ranges**: https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet#setnamedrange(name,-range)

### Related Issues

    - **Issue #187**: Sync performance concerns
    - **Issue #189**: Summary formula accuracy
    - **Issue #186**: Data validation improvements

## FAQ & TROUBLESHOOTING

### Q: Will this break existing data?

    **A**: No. The changes preserve all existing data:
    - clearContent() removes values but keeps row structure
    - Fixing sort range doesn't delete anything
    - Existing transactions remain intact
    - Sheet structure preserved

### Q: How long will migration take?

    **A**: Approximately 4-6 hours:
    - Code changes: 30 minutes
    - Testing: 2-3 hours
    - Code review: 1 hour
    - Deployment: 30 minutes

### Q: Can I test locally first?

    **A**: Yes:
    1. Make a copy of production sheet in Google Drive
    2. Update Code.js to point to test sheet
    3. Run through all 5 test scenarios
    4. Verify no corruption
    5. Update to point back to production
    6. Deploy

### Q: What if Summary still breaks?

    **A**: Debug steps:
    1. Check App Script logs for errors
    2. Run validateSheetStructure() function
    3. Verify L7:N35 still merged
    4. Check if formula #REF! errors present
    5. Review transaction range A2:J
    6. Open GitHub issue with error logs

### Q: How often should we run cleanup?

    **A**: After fixing deleteRow issues:
    - Cleanup now runs without deleting
    - Empty rows remain but don't hurt performance
    - Monthly maintenance can manually delete empty rows if needed
    - Optional: Add UI button for "Compact Sheet"

## SUCCESS CRITERIA

    ✓ All 5 code changes implemented correctly
    ✓ All 4 test scenarios pass without corruption
    ✓ No #REF! errors in Summary area
    ✓ Image remains at L7:N35 after all operations
    ✓ Performance metrics unchanged or improved
    ✓ Zero data loss
    ✓ Users can perform all transaction operations
    ✓ Summary calculations accurate
    ✓ No rollback required within 7 days
    ✓ Team confidence restored in data integrity

---

**Ready to implement? Follow STEP 1-5 above and run TEST SCENARIO 1-5 to verify!**
