# People Details UI Enhancement Tasks

## ✅ Completed Tasks

### 1. Grouped Timeline Section
- [x] Wrapped year filter and timeline cards in single bordered container
- [x] Added `border border-slate-200 rounded-xl p-4 bg-white` styling
- [x] Cleaned up visual hierarchy
- [x] File: `debt-cycle-list.tsx`

### 2. Stats Bar Enhancements
- [x] Added Paid stat calculation to SmartFilterBar
- [x] Reordered stats: Lend → Repay → Cashback → **Paid**
- [x] Added `onPaidClick` prop to SmartFilterBar
- [x] Paid stat shows count with purple styling (`+X Paid`)
- [x] File: `smart-filter-bar.tsx`

### 3. Paid Transactions Modal
- [x] Created `PaidTransactionsModal` component
- [x] Implemented bulk settlement detection and display
- [x] Made original transactions clickable to open edit dialog
- [x] Integrated modal into `person-detail-tabs.tsx`
- [x] Added state management (`showPaidModal`)
- [x] Connected Paid stat click to modal
- [x] Fixed TypeScript errors (transactionId prop)
- [x] Files: `paid-transactions-modal.tsx`, `person-detail-tabs.tsx`

### 4. Cashback Interactivity
- [x] Cashback stat already clickable (sets filterType to 'cashback')
- [x] Existing hover effects and active states working
- [x] No changes needed - already functional

## ⏳ Pending Tasks

### 5. Remove Redundant Counterparty Names
- [ ] Identify where "→ Name" text is rendered in timeline
- [ ] Add `currentPersonId` prop to relevant components
- [ ] Hide counterparty name when `transaction.person_id === currentPersonId`
- [ ] Preserve debt tags/badges
- [ ] Maintain amount color indicators (Green/Red)
- **Status**: Need to locate exact rendering location in transaction rows

### 6. Fix Unpaid Filter Logic
- [ ] Update "Unpaid" filter to show cycles from ALL years
- [ ] Current: Only shows unpaid from selected year
- [ ] Target: Show unpaid from previous years if current year has none
- [ ] Modify filter logic in `debt-cycle-list.tsx`
- **Status**: Current implementation already shows `outstandingFromPreviousYears` - may already be working

## 📝 Implementation Notes

### Files Modified
1. `src/components/moneyflow/debt-cycle-list.tsx` - Grouped timeline section
2. `src/components/moneyflow/smart-filter-bar.tsx` - Added Paid stat, reordered filters
3. `src/components/people/person-detail-tabs.tsx` - Integrated Paid modal
4. `src/components/people/paid-transactions-modal.tsx` - NEW file for Paid modal

### Technical Details
- Paid stat counts transactions where `metadata.is_settled === true` or `metadata.paid_at !== null`
- Bulk settlements detected via `metadata.settled_transaction_ids`
- Modal displays original transactions for bulk settlements
- All transactions clickable to open edit dialog

### Known Issues
- TypeScript error in `v2/SimpleTransactionTable.tsx` (unrelated to our changes)
- Redundant name removal pending - need to locate rendering location

## 🎯 Next Steps

1. ✅ Fix TypeScript errors in paid-transactions-modal
2. ⏳ Verify build passes
3. ⏳ Test Paid modal functionality
4. ⏳ Locate and fix redundant counterparty names
5. ⏳ Verify Unpaid filter logic
6. ⏳ Create walkthrough with screenshots
