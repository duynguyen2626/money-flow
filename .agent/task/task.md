═══════════════════════════════════════════════════════════════════════════════
🧪 SPLIT BILL ENHANCEMENT - TESTING & VERIFICATION SCOPE
═══════════════════════════════════════════════════════════════════════════════

TEST ENVIRONMENT:
    - Database: Development/Staging instance
    - Frontend: Local dev server (npm run dev)
    - Test Account: Use test user with sample data
    - Browser: Chrome/Edge (latest version)

PREREQUISITE:
    ✓ Migration applied successfully
    ✓ Backend helper functions deployed
    ✓ UI components built without errors
    ✓ Sample data loaded (at least 3-5 test transactions)


═══════════════════════════════════════════════════════════════════════════════
SECTION 1: DATABASE & MIGRATION TESTS
═══════════════════════════════════════════════════════════════════════════════

TEST 1.1: Column Addition
────────────────────────────────────────────────────────────────────────────────
    Verify:
        ✓ parent_transaction_id column exists in transactions table
        ✓ Column type is UUID
        ✓ Foreign key constraint exists (REFERENCES transactions(id))
        ✓ ON DELETE CASCADE is configured
        ✓ Index idx_transactions_parent_id exists
    
    SQL Check:
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'transactions' 
          AND column_name = 'parent_transaction_id';
        
        SELECT constraint_name, delete_rule
        FROM information_schema.referential_constraints
        WHERE constraint_name LIKE '%parent_transaction%';

TEST 1.2: Integrity Trigger
────────────────────────────────────────────────────────────────────────────────
    Verify:
        ✓ Function check_split_sum_integrity() exists
        ✓ Trigger trg_check_split_integrity exists
        ✓ Trigger fires on INSERT and UPDATE
    
    Test Case: Try to insert child with wrong sum
        INSERT INTO transactions (...) VALUES (
            parent_transaction_id = 'valid-parent-id',
            amount = -100000  -- Parent = -128200, this breaks sum
        );
        
        Expected: ERROR - "Split sum integrity violation"

TEST 1.3: Existing Data Migration
────────────────────────────────────────────────────────────────────────────────
    Verify:
        ✓ All existing split child transactions have parent_transaction_id set
        ✓ No NULL parent_transaction_id where metadata.is_split_share = true
    
    SQL Check:
        SELECT COUNT(*) as orphaned_children
        FROM transactions
        WHERE metadata->>'is_split_share' = 'true'
          AND parent_transaction_id IS NULL;
        
        Expected: 0 rows

TEST 1.4: CASCADE Delete Behavior
────────────────────────────────────────────────────────────────────────────────
    Test Steps:
        1. Create test parent with 2 children
        2. Note child IDs
        3. DELETE parent
        4. Query for children
    
    Expected:
        ✓ Parent deleted successfully
        ✓ Children automatically deleted (CASCADE)
        ✓ No orphaned child transactions remain


═══════════════════════════════════════════════════════════════════════════════
SECTION 2: BACKEND FUNCTION TESTS
═══════════════════════════════════════════════════════════════════════════════

TEST 2.1: createSplitBill() - New Transaction
────────────────────────────────────────────────────────────────────────────────
    Test Data:
        Parent Amount: 150,000đ
        Split: 60,000đ (Me) + 90,000đ (Friend "Nghĩa")
    
    Test Steps:
        1. Call createSplitBill() with above data
        2. Query database for created transactions
    
    Verify:
        ✓ Parent transaction created with:
            - amount = -150000
            - metadata.is_split_bill = true
            - metadata.split_participants_count = 2
            - metadata.my_share_amount = 60000
            - metadata.split_shares array has 2 items
        
        ✓ Child #1 (My share) created with:
            - amount = -60000
            - type = 'expense'
            - category_id = parent.category_id (inherited)
            - person_id = null
            - parent_transaction_id = parent.id
            - metadata.is_my_share = true
            - metadata.is_receivable = false
            - cashback_mode = 'none_back'
        
        ✓ Child #2 (Friend share) created with:
            - amount = -90000
            - type = 'debt'
            - category_id = null
            - person_id = 'nghia-id'
            - parent_transaction_id = parent.id
            - metadata.is_my_share = false
            - metadata.is_receivable = true
            - cashback_mode = 'none_back'
        
        ✓ Sum validation: 60000 + 90000 = 150000 ✓

TEST 2.2: createSplitBill() - Equal Split
────────────────────────────────────────────────────────────────────────────────
    Test Data:
        Parent Amount: 120,000đ
        Split Method: Equal
        Participants: 3 people (Me + 2 friends)
    
    Expected:
        ✓ Each share = 40,000đ
        ✓ 3 child transactions created
        ✓ All amounts equal
        ✓ metadata.split_method = 'equal'

TEST 2.3: createSplitBill() - Validation Errors
────────────────────────────────────────────────────────────────────────────────
    Test Case A: Sum Mismatch
        Parent: 100,000đ
        Shares: 40,000đ + 50,000đ = 90,000đ (❌ missing 10k)
        Expected: Error "Split sum mismatch"
    
    Test Case B: Too Few Participants
        Shares: Only 1 person
        Expected: Error "requires at least 2 participants"
    
    Test Case C: Negative Amount
        Share: -40,000đ (negative share)
        Expected: Error or validation failure

TEST 2.4: updateSplitBill() - Edit Amounts
────────────────────────────────────────────────────────────────────────────────
    Test Steps:
        1. Create split: 60k (Me) + 90k (Friend) = 150k
        2. Update to: 70k (Me) + 80k (Friend) = 150k
        3. Query database
    
    Verify:
        ✓ Child #1 amount updated to -70000
        ✓ Child #2 amount updated to -80000
        ✓ Parent metadata.split_shares updated
        ✓ Percentages recalculated (46.7% / 53.3%)

TEST 2.5: deleteSplitBill() - Full Deletion
────────────────────────────────────────────────────────────────────────────────
    Test Steps:
        1. Create split with 2 children
        2. Call deleteSplitBill(parentId)
        3. Query database
    
    Verify:
        ✓ Parent deleted
        ✓ All children deleted (CASCADE)
        ✓ Function returns deletedCount = 3 (1 parent + 2 children)


═══════════════════════════════════════════════════════════════════════════════
SECTION 3: UI COMPONENT TESTS
═══════════════════════════════════════════════════════════════════════════════

TEST 3.1: Badge Display - Transaction List
────────────────────────────────────────────────────────────────────────────────
    Test Steps:
        1. Navigate to transactions page
        2. Find split parent transaction
        3. Find split child transactions
    
    Verify:
        ✓ Parent shows badge: "SPLIT" (purple background)
        ✓ Child #1 shows: "SPLIT 1/2" (blue if my share, orange if not)
        ✓ Child #2 shows: "SPLIT 2/2"
        ✓ Badges are visually distinct
        ✓ Icons display correctly (Split icon, User icon)
    
    Visual Check:
        - Screenshot parent row with badge
        - Screenshot child rows with badges
        - Compare colors match design spec

TEST 3.2: Transaction Form - Create New Split
────────────────────────────────────────────────────────────────────────────────
    Test Steps:
        1. Click "New Transaction"
        2. Fill in: Amount = 200,000đ, Date, Category, etc.
        3. Toggle ON "Split this bill"
    
    Verify:
        ✓ Split section appears
        ✓ Split method radio buttons: Equal / Custom
        ✓ Participants section shows 2 default rows:
            - Row 1: "Me" with amount input
            - Row 2: Person select with amount input
        ✓ If Equal selected → amounts auto-calculate (100k each)
        ✓ If Custom selected → amounts are editable
        ✓ Total shows: 200,000đ
        ✓ Split Sum shows: 200,000đ (initially)
        ✓ Remaining: 0đ ✓ (green)
    
    Test Edge Cases:
        A. Change amount to 150k:
            ✓ If Equal → Both shares become 75k
            ✓ Total updates, Remaining = 0đ
        
        B. Change share amounts manually:
            Share 1: 80k, Share 2: 60k → Remaining = 10k (red warning)
        
        C. Add 3rd participant:
            ✓ "+ Add Participant" button works
            ✓ New row appears with amount input
            ✓ Can select different person
        
        D. Remove participant:
            ✓ Trash icon appears (if >2 participants)
            ✓ Click removes row
            ✓ Cannot remove if only 2 participants

TEST 3.3: Transaction Form - Edit Existing Split
────────────────────────────────────────────────────────────────────────────────
    Setup:
        1. Create split transaction: 120k (50k Me + 70k Friend)
        2. Navigate to edit this transaction
    
    Verify:
        ✓ Toggle is ON and LOCKED (grayed out, cannot click)
        ✓ Tooltip shows: "Currently split into 2 shares"
        ✓ Split section shows existing data:
            - Share 1: Me - 50,000đ (41.7%)
            - Share 2: [Friend Name] - 70,000đ (58.3%)
        ✓ Split method shows current value (equal/custom)
        ✓ "Delete Split" button appears at bottom
    
    Test Edit Flow:
        1. Change Share 1 from 50k → 60k
        2. Change Share 2 from 70k → 60k
        3. Verify sum = 120k ✓
        4. Click "Update Transaction"
        5. Success message appears
        6. Reload page → Changes persist
        7. Check database: child amounts updated

TEST 3.4: Transaction Form - Try Toggle OFF (Should Fail)
────────────────────────────────────────────────────────────────────────────────
    Setup:
        1. Edit existing split transaction
        2. Try to toggle OFF "Split this bill"
    
    Verify:
        ✓ Toggle does not respond (locked)
        ✓ Alert/tooltip appears:
            "This transaction is already split. Use 'Delete Split' 
             button to remove split."
        ✓ Form remains in split mode

TEST 3.5: Delete Split Button
────────────────────────────────────────────────────────────────────────────────
    Setup:
        1. Edit split transaction
        2. Click "Delete Split" button
    
    Verify:
        ✓ Modal opens: "Delete Split Transaction?"
        ✓ Modal shows warning icon (AlertTriangle)
        ✓ Modal lists all transactions to delete:
            - Parent: -120,000đ (Note text)
            - Child #1 (My share): -50,000đ
            - Child #2 (Friend): -70,000đ
        ✓ Warning text: "⚠️ This action cannot be undone. Bank 
                         reconciliation may be affected."
        ✓ Two buttons: [Cancel] [Delete All]
    
    Test Cancel:
        1. Click Cancel
        2. Modal closes
        3. Transaction still exists
    
    Test Confirm Delete:
        1. Click "Delete All"
        2. Loading state appears
        3. Success message: "Split transaction deleted"
        4. Redirect to transaction list
        5. Verify in database: parent + children all deleted
        6. Transaction list no longer shows them

TEST 3.6: Child Transaction - Read-Only Mode
────────────────────────────────────────────────────────────────────────────────
    Setup:
        1. Click on split CHILD transaction (not parent)
    
    Verify:
        ✓ Modal opens: "Transaction Details"
        ✓ Badge shows: "SPLIT 1/2" (or similar)
        ✓ Subtitle: "This is a split share transaction (Read-only)"
        ✓ Info banner appears:
            "This is a split share transaction. To edit, modify 
             the parent transaction."
        ✓ "View Parent →" button in banner
        ✓ All form fields are DISABLED (grayed out, 🔒 icon)
        ✓ Fields show: Date, Amount, Category, Note, etc.
        ✓ "Linked to Parent Transaction" section shows parent ID
        ✓ Only "Close" button (NO Edit or Delete buttons)
    
    Test View Parent:
        1. Click "View Parent →" button
        2. Navigates to parent transaction edit page
        3. Parent form opens in edit mode

TEST 3.7: Child Transaction - No Delete Button
────────────────────────────────────────────────────────────────────────────────
    Setup:
        1. Find split child transaction in list
        2. Hover over row / click actions menu
    
    Verify:
        ✓ NO delete button/icon appears
        ✓ Or if delete button exists, clicking shows error:
            "Cannot delete split share directly. Edit parent 
             transaction to adjust split."


═══════════════════════════════════════════════════════════════════════════════
SECTION 4: END-TO-END WORKFLOW TESTS
═══════════════════════════════════════════════════════════════════════════════

TEST 4.1: Complete Split Bill Creation Flow
────────────────────────────────────────────────────────────────────────────────
    Scenario: "Dinner at restaurant, split with 2 friends"
    
    Steps:
        1. New Transaction
        2. Fill in:
            - Date: Today
            - Amount: 450,000đ
            - Category: Food & Drink
            - Account: Vpbank Diamond World
            - Note: "Dinner at Quán Ngon"
        3. Toggle ON "Split this bill"
        4. Select "Custom Amounts"
        5. Set shares:
            - Me: 150,000đ (33.3%)
            - Friend 1 (Nghĩa): 200,000đ (44.4%)
            - Click "Add Participant"
            - Friend 2 (Tuấn): 100,000đ (22.2%)
        6. Verify sum = 450,000đ ✓
        7. Click "Create Transaction"
    
    Verify:
        ✓ Success message appears
        ✓ Redirects to transaction list
        ✓ 4 transactions visible:
            - Parent (SPLIT badge): -450,000đ
            - Child 1 (SPLIT 1/3, blue): -150,000đ (Me, Food & Drink)
            - Child 2 (SPLIT 2/3, orange): -200,000đ (Nghĩa, Debt)
            - Child 3 (SPLIT 3/3, orange): -100,000đ (Tuấn, Debt)
        ✓ Database:
            - 1 parent with is_split_bill=true
            - 3 children with parent_transaction_id set
            - Sum: 150k + 200k + 100k = 450k ✓

TEST 4.2: Edit Split Amounts After Creation
────────────────────────────────────────────────────────────────────────────────
    Scenario: "Friend Tuấn actually paid less, adjust split"
    
    Steps:
        1. Find parent transaction (450k dinner)
        2. Click Edit
        3. Split section shows current split
        4. Adjust amounts:
            - Me: 150k → 180k
            - Nghĩa: 200k → 200k (unchanged)
            - Tuấn: 100k → 70k
        5. Verify sum = 450k ✓
        6. Click "Update Transaction"
    
    Verify:
        ✓ Success message
        ✓ Transaction list updates:
            - Child 1 now shows: -180,000đ
            - Child 3 now shows: -70,000đ
        ✓ Database reflects changes
        ✓ metadata.split_shares updated with new amounts

TEST 4.3: Delete Entire Split Transaction
────────────────────────────────────────────────────────────────────────────────
    Scenario: "Cancelled the dinner, delete all transactions"
    
    Steps:
        1. Edit parent transaction
        2. Click "Delete Split" button
        3. Modal shows all 4 transactions
        4. Click "Delete All"
    
    Verify:
        ✓ All 4 transactions removed from list
        ✓ Database: parent + 3 children all deleted
        ✓ No orphaned child transactions

TEST 4.4: Try to Edit Child (Should Be Blocked)
────────────────────────────────────────────────────────────────────────────────
    Scenario: "User tries to directly edit split child"
    
    Steps:
        1. Click on child transaction (e.g., Nghĩa's 200k share)
        2. Modal opens in read-only mode
        3. Try clicking Edit button (should not exist)
        4. Click "View Parent →"
        5. Redirects to parent edit page
        6. User can edit from there
    
    Verify:
        ✓ Child transaction is not editable directly
        ✓ User must edit via parent
        ✓ Data integrity maintained

TEST 4.5: Void Parent Transaction
────────────────────────────────────────────────────────────────────────────────
    Scenario: "Payment failed, void the transaction"
    
    Steps:
        1. Find parent transaction
        2. Click "Void" button
        3. Confirm void action
    
    Verify:
        ✓ Parent status = 'voided'
        ✓ All children status = 'voided' (CASCADE)
        ✓ Transactions show "VOIDED" badge/indicator
        ✓ Transactions don't affect reports


═══════════════════════════════════════════════════════════════════════════════
SECTION 5: REPORTING & ANALYTICS TESTS
═══════════════════════════════════════════════════════════════════════════════

TEST 5.1: Expense Report by Category
────────────────────────────────────────────────────────────────────────────────
    Setup:
        Create split: 450k dinner
        - My share: 150k (Food & Drink)
        - Friends: 300k (Debt, no category)
    
    Test:
        1. Navigate to "Expense Report"
        2. Filter by "Food & Drink" category
    
    Verify:
        ✓ My share (150k) is INCLUDED in Food & Drink total
        ✓ Friends' shares (300k) are NOT included (no category)
        ✓ Parent transaction (450k) is NOT double-counted
    
    Expected Logic:
        SELECT SUM(amount) FROM transactions
        WHERE category_id = 'food-drink'
          AND (parent_transaction_id IS NULL  -- regular
               OR metadata->>'is_my_share' = 'true')  -- my split shares

TEST 5.2: Receivables Report
────────────────────────────────────────────────────────────────────────────────
    Setup:
        Create split: 450k dinner
        - Nghĩa owes: 200k
        - Tuấn owes: 100k
    
    Test:
        1. Navigate to "Receivables Report"
        2. View "Amount Owed by Person"
    
    Verify:
        ✓ Nghĩa: 200,000đ
        ✓ Tuấn: 100,000đ
        ✓ Total Receivables: 300,000đ
    
    Expected Query:
        SELECT person_id, SUM(amount)
        FROM transactions
        WHERE type = 'debt'
          AND metadata->>'is_receivable' = 'true'
        GROUP BY person_id

TEST 5.3: Cashback Dashboard
────────────────────────────────────────────────────────────────────────────────
    Setup:
        Parent transaction: 450k (with 4% cashback = 18k)
        Children: No cashback (cashback_mode = 'none_back')
    
    Test:
        1. Navigate to Cashback Dashboard
        2. View total cashback received
    
    Verify:
        ✓ Cashback shows: 18,000đ (from parent only)
        ✓ NOT 18k × 4 = 72k (not double-counted from children)
    
    Expected Query:
        SELECT SUM(cashback_received)
        FROM transactions
        WHERE parent_transaction_id IS NULL  -- Only parents
          OR metadata->>'is_split_bill' != 'true'

TEST 5.4: Bank Reconciliation View
────────────────────────────────────────────────────────────────────────────────
    Setup:
        Bank statement shows: -450,000đ (Quán Ngon)
        App has: 1 parent + 3 children
    
    Test:
        1. Navigate to Reconciliation page
        2. Find bank statement row
    
    Verify:
        ✓ Bank: -450,000đ
        ✓ App match: Parent -450,000đ ✓
        ✓ Children are hidden or grouped under parent
        ✓ Match status: ✓ Matched
    
    Filter Option:
        ✓ Toggle "Show only parent transactions"
        ✓ When enabled: Children hidden, cleaner view

    Sheet Sync Tasks:
      - [x] Fix "Ghost Rows" (Duplicate rows) in Google Sheet Sync
      - [x] Refine Google Sheet Summary Table
        - [x] Implement "Total Back" row
        - [x] Correct "Remains" calculation (Signed J column)
        - [x] Position "Remains" (Row 5) and "Bank Info" (Row 6)
        - [x] Verify J Column Logic
        - [x] Fix Bank Info Text Wrapping


═══════════════════════════════════════════════════════════════════════════════
SECTION 6: EDGE CASES & ERROR HANDLING
═══════════════════════════════════════════════════════════════════════════════

TEST 6.1: Split with 0 Amount
────────────────────────────────────────────────────────────────────────────────
    Try: Create split with amount = 0đ
    Expected: Error "Cannot split transaction with zero amount"

TEST 6.2: Split with Only 1 Participant
────────────────────────────────────────────────────────────────────────────────
    Try: Toggle split ON, remove all participants except 1
    Expected: Error "Split requires at least 2 participants"

TEST 6.3: Sum Mismatch on Submit
────────────────────────────────────────────────────────────────────────────────
    Try: Create split where sum ≠ parent amount
    Expected:
        ✓ Submit button disabled
        ✓ Red warning: "Split sum must equal total amount"

TEST 6.4: Edit Parent Amount After Split
────────────────────────────────────────────────────────────────────────────────
    Scenario: Change parent from 450k → 500k
    
    Expected Behavior (Option A - Proportional Recalc):
        Old: 150k (33.3%) + 200k (44.4%) + 100k (22.2%) = 450k
        New: 167k (33.3%) + 222k (44.4%) + 111k (22.2%) = 500k
        ✓ Children auto-update proportionally
    
    OR (Option B - Force Re-Split):
        ✓ Warning: "Amount changed, please re-enter split"
        ✓ User must manually adjust shares

TEST 6.5: Delete Parent with Many Children (10+)
────────────────────────────────────────────────────────────────────────────────
    Setup: Create split with 10 participants
    
    Test:
        1. Delete parent
        2. Modal shows all 11 transactions (1 parent + 10 children)
        3. Confirm delete
    
    Verify:
        ✓ All 11 transactions deleted
        ✓ No orphaned children
        ✓ Performance is acceptable (< 2 seconds)

TEST 6.6: Concurrent Edit of Same Split
────────────────────────────────────────────────────────────────────────────────
    Scenario: Two users edit same split simultaneously
    
    Test:
        1. User A opens parent transaction for edit
        2. User B opens same parent transaction for edit
        3. User A updates split amounts, saves
        4. User B tries to save (may have stale data)
    
    Expected:
        ✓ Optimistic locking or version check
        ✓ User B gets error: "Transaction was modified by another user"
        ✓ User B must reload and re-edit

TEST 6.7: Split Transaction with Installment
────────────────────────────────────────────────────────────────────────────────
    Question: Can a split transaction also be an installment?
    
    Recommendation: ❌ NOT ALLOWED (too complex)
        ✓ Show error: "Cannot split installment transactions"
        ✓ Or disable split toggle if is_installment = true


═══════════════════════════════════════════════════════════════════════════════
SECTION 7: PERFORMANCE & REGRESSION TESTS
═══════════════════════════════════════════════════════════════════════════════

TEST 7.1: Page Load Performance
────────────────────────────────────────────────────────────────────────────────
    Test: Load transaction list with 100+ transactions (mix of split and regular)
    
    Verify:
        ✓ Page loads in < 2 seconds
        ✓ Badges render correctly for all split transactions
        ✓ No console errors
        ✓ No infinite loops or excessive re-renders

TEST 7.2: Database Query Performance
────────────────────────────────────────────────────────────────────────────────
    Test: Query for all split transactions
    
    SQL:
        SELECT * FROM transactions
        WHERE parent_transaction_id IS NOT NULL
        LIMIT 1000;
    
    Verify:
        ✓ Query completes in < 500ms
        ✓ Index is used (check EXPLAIN plan)

TEST 7.3: Regression - Existing Features Still Work
────────────────────────────────────────────────────────────────────────────────
    Test Existing Features:
        ✓ Create regular (non-split) transaction
        ✓ Edit regular transaction
        ✓ Delete regular transaction
        ✓ Cashback calculation (non-split)
        ✓ Installment transactions
        ✓ Refund transactions
        ✓ Transfer transactions
        ✓ Recurring transactions
    
    Verify:
        ✓ All existing features work as before
        ✓ No broken functionality
        ✓ No UI regressions

TEST 7.4: Mobile Responsiveness
────────────────────────────────────────────────────────────────────────────────
    Test on Mobile:
        ✓ Transaction list: badges visible
        ✓ Create split form: usable on small screen
        ✓ Edit split form: touch-friendly
        ✓ Delete modal: fits screen
        ✓ No horizontal scroll
        ✓ Buttons accessible


═══════════════════════════════════════════════════════════════════════════════
SECTION 8: SIGN-OFF CRITERIA
═══════════════════════════════════════════════════════════════════════════════

PHASE 1+2 IS COMPLETE WHEN:

    Database:
        ✅ Migration applied successfully
        ✅ Trigger validates split sum integrity
        ✅ CASCADE delete works correctly
        ✅ No orphaned child transactions
    
    Backend:
        ✅ createSplitBill() creates parent + N children
        ✅ Always creates "my_share" child
        ✅ updateSplitBill() updates amounts correctly
        ✅ deleteSplitBill() removes all related transactions
        ✅ Validation catches errors before DB insert
    
    UI:
        ✅ Badges display on all split transactions
        ✅ Split form works in create mode
        ✅ Split form works in edit mode
        ✅ Toggle is LOCKED in edit mode
        ✅ Delete modal shows warning + all transactions
        ✅ Child transactions are read-only
        ✅ "View Parent" navigation works
    
    Data Integrity:
        ✅ Sum of children always equals parent
        ✅ Cannot delete parent without cascade
        ✅ Cannot edit children directly
        ✅ Void cascades to children
    
    Reporting:
        ✅ Expense reports include my_share children
        ✅ Receivables reports include split debts
        ✅ Cashback dashboard excludes children
        ✅ Bank reconciliation matches parent amounts
    
    Testing:
        ✅ All 30+ test cases passed
        ✅ No critical bugs found
        ✅ No regressions in existing features
        ✅ Performance acceptable
    
    Documentation:
        ✅ Code comments added
        ✅ README updated with split bill feature
        ✅ Migration notes documented
        ✅ Known limitations listed


═══════════════════════════════════════════════════════════════════════════════
SECTION 9: POST-DEPLOYMENT MONITORING
═══════════════════════════════════════════════════════════════════════════════

Monitor After Deployment:

    Week 1:
        - Check error logs for split-related errors
        - Monitor database for orphaned children
        - Track user feedback on split feature
        - Measure performance metrics (load times)
    
    Week 2-4:
        - Review edge cases not caught in testing
        - Gather user feedback on UX
        - Identify optimization opportunities
        - Plan Phase 3 enhancements (if needed)

Common Issues to Watch:
    ⚠️ Sum rounding errors (float precision)
    ⚠️ Concurrent edit conflicts
    ⚠️ Performance with 10+ participants
    ⚠️ Mobile UX issues
    ⚠️ Confusion between parent and child rows


═══════════════════════════════════════════════════════════════════════════════
END OF TESTING SCOPE
═══════════════════════════════════════════════════════════════════════════════

SUMMARY:
    - 8 Test Sections
    - 30+ Individual Test Cases
    - 50+ Verification Points
    - Covers: Database, Backend, UI, E2E, Reports, Edge Cases, Performance
    
ESTIMATED TESTING TIME:
    - Manual testing: 4-6 hours
    - Automated tests (if written): 1-2 hours to run
    - Total: ~1 full working day

NEXT STEPS:
    1. Developer implements Phase 1+2 (using prompt above)
    2. QA/Tester follows this checklist
    3. Log any bugs found
    4. Retest after fixes
    5. Sign-off when all criteria met
    6. Deploy to production

═══════════════════════════════════════════════════════════════════════════════
