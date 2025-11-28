PROJECT: MONEY FLOW 3.0

PHASE: 41 - EMERGENCY FIX LOOP & UI STABILIZATION

WORKFLOW:

Branch: fix/phase-41-react-loop

Safety: Run npm run build.

OBJECTIVE:

Critical Fix: Stop the React Infinite Loop (Error #185) in Account Page.

Logic Fix: Correct "Incoming/Outgoing" calculation (Expense belongs to Out).

UI Polish: Fix Action Menu clipping, fix Key prop warning, and redesign Account Card avatars.

I. CRITICAL BUG: REACT INFINITE LOOP (#185)

Target: src/app/accounts/[id]/page.tsx OR UnifiedTransactionTable

Diagnosis:
The error "Maximum update depth exceeded" usually happens when:

Updating state inside the main component body (not in useEffect).

useEffect dependencies changing on every render (e.g., passing a new object/array reference).

Action:

Audit AccountDetailsPage:

Check if recalculateBalance is called directly in the component body. Move it to Server Action or useEffect.

Check if getAccountStats is causing re-renders.

Audit UnifiedTransactionTable:

Check if onSelectionChange or similar callback is updating parent state infinitely.

II. ACCOUNT STATISTICS (LOGIC FIX)

Target: src/services/account.service.ts -> recalculate_account_stats (SQL) OR JS Logic.

1. Fix Math Logic

Current Bug: "Expense" transactions are counted as "Incoming".

Correct Logic:

Total In (Income): type IN ('income', 'repayment', 'transfer_in') AND amount > 0.

Total Out (Expense): type IN ('expense', 'debt', 'transfer_out') AND amount < 0.

Note: Ensure the absolute values are summed correctly.

2. Update UI Display

Labels: Rename "Incoming" -> "Thu (In)", "Outgoing" -> "Chi (Out)".

Badges:

Waiting: Show ONLY if (TotalFunded - TotalConfirmed) > 0.

Confirmed: Show TotalConfirmed.

III. UI POLISH & FINAL TOUCHES

1. Fix Table Key Warning

Error: "Each child in a list should have a unique 'key' prop".

Fix: Inside UnifiedTransactionTable, ensure the map loop for columns has key={column.id} on the Table Cell (td).

2. Fix Action Menu Clipping

Problem: Dropdown menu is hidden/clipped by table overflow.

Fix: Add side="left" and collisionPadding={10} to the DropdownMenuContent. Remove overflow-hidden from the last table cell if necessary.

3. Account Card Redesign

Avatar: Use object-contain and let it fill the height. Remove border radius if it cuts off the vertical card image.

Credit Logic:

Available = Limit + CurrentBalance (Balance is negative).

Display "Dư nợ: [Abs(Balance)]" (Red).

IV. EXECUTION STEPS

Priority 1: Find and fix the Infinite Loop in AccountDetails.

Priority 2: Fix the Key Warning in Table.

Priority 3: Update Account Stats Logic.

Priority 4: Polish Account Card UI.