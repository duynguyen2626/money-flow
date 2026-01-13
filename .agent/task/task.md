# Task: Refund Logic Recovery

- [x] **Phase 1: Analysis & Extraction**
  - [x] Read `money-flow-refund-logic-recovery-guide.md`
  - [x] Extract Refund Code
  - [x] Document 3-state model

- [x] **Phase 2: Missing File Recovery**
  - [x] Check `src/components/moneyflow/request-refund-dialog.tsx`
  - [x] Check `src/components/moneyflow/confirm-refund-dialog.tsx`

- [x] **Phase 3: Integration & Verification**
  - [x] Add `cancelOrderAction`
  - [x] Add Menu Items
  - [x] Fix Build Errors
  - [x] Fix Data Configuration (Created 'Refund' category)
  - [x] **UI Refinements**
    - [x] Add "Confirm Refund" button logic
    - [x] Disable "Request Refund" if duplicate
    - [x] **UI Polish (Sprint 7)**
        - [x] Move "Confirm Refund" to Badge in Note column.
        - [x] Add "Pending" Filter Toggle with Yellow styling.
        - [x] Update Active/Void Filter styling (Green/Gray with Icons).
        - [x] Shrink Search Bar.
        - [x] **Bug Fix**: Resolved `ReferenceError: splitBadge is not defined`.
        - [x] **Bug Fix**: Enabled "Confirm Refund" badge for account name mismatch.
        - [x] **Data Fix**: Updated 'Refund' category type to 'income'.
  - [x] Test "Request Refund" UI
  - [x] Test "Cancel Order" UI
  - [x] Test "Confirm Refund" UI
