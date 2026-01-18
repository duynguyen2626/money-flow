# Transaction Slide V2 - Task Breakdown

## Project Status: Phase 1 Complete ✅

Current build includes fully functional Transaction Slide V2 with Single and Bulk modes.

---

## Phase 1: Core Implementation ✅

### Single Mode
- [x] Create base component structure
- [x] Implement Personal/External tabs
- [x] Implement transaction type buttons (Expense, Income, Transfer)
- [x] Create BasicInfoSection (Date, Tag, Account)
- [x] Create AccountSelector (Account, Person, Target Account)
- [x] Implement CashbackSection
  - [x] Cashback mode selection
  - [x] Percentage/Fixed input
  - [x] Cycle badge display
  - [x] Input validation (10% warning)
- [x] Create form submission handler
- [x] Integrate with createTransaction service

### Bulk Mode
- [x] Create BulkInputSection
- [x] Implement field array for rows
- [x] Create BulkRow component
  - [x] Amount input
  - [x] Shop selector
  - [x] Person selector
  - [x] Notes input
- [x] Create QuickCashbackInput
  - [x] Cashback mode popover
  - [x] Cycle badge in popover
- [x] Implement global date picker
- [x] Implement global tag input with sync
- [x] Add total amount display with text
- [x] Create bulkCreateTransactions action
- [x] Integrate with backend

### Advanced Features
- [x] **Tag Sync**: Auto-update tag when date changes
- [x] **Cashback Cycle Badge**: Display for credit cards with statement day
- [x] **Category Defaults**: Auto-select for Debt/Repayment
- [x] **Input Validation**: Warn and reset if cashback > 10%
- [x] **Bulk Total Text**: Show amount in words using readMoney
- [x] **Data Integrity**: Fixed account.service.ts to map cashback_config correctly
- [x] **Bulk Data Fix**: Pass tag and person_id in bulk creation

### Testing & Verification
- [x] Create test page at /txn/v2
- [x] Verify Single mode transactions
- [x] Verify Bulk mode transactions
- [x] Test cashback tracking
- [x] Test with real data
- [x] Build verification (npm run build)

---

## Phase 2: Integration with Cards (Planned)

### Account Cards
- [x] Add "Quick Add" button to Account detail page
- [x] Pre-fill source_account_id from context
- [ ] Add quick action buttons:
  - [ ] "💳 Pay Bill" (for credit cards)
  - [ ] "🔄 Transfer Out"
  - [ ] "💸 Add Expense"
- [ ] Auto-select transaction type based on account type
- [ ] Test integration

### People Cards
- [x] Add "Quick Lend" button to People detail page
- [x] Add "Quick Repay" button to People detail page
- [x] Pre-fill person_id from context
- [x] Auto-detect debt direction based on balance
- [ ] Show current debt balance in slide
- [ ] Suggest repayment amount
- [ ] Test integration

### Implementation Steps
1. Add `initialData` prop to TransactionSlideV2
2. Create wrapper components for each card type
3. Update card detail pages to include buttons
4. Pass context data to slide
5. Test all scenarios

---

## Phase 3: Modal Refactoring (Future)

### Edit Transaction
- [ ] Create EditTransactionSlide component
- [ ] Migrate edit logic from modal
- [ ] Add history view
- [ ] Test edit flow

### Create Account
- [ ] Create AccountSlide component
- [ ] Migrate account creation form
- [ ] Test account creation

### Create Person
- [ ] Create PersonSlide component
- [ ] Migrate person creation form
- [ ] Test person creation

### Service Management
- [ ] Create ServiceSlide component
- [ ] Migrate service management
- [ ] Test service CRUD

### Split Bill
- [ ] Implement SplitBillSection in V2
- [ ] Test split bill logic
- [ ] Integrate with backend

---

## Phase 4: Main Integration (Future)

### Replace Quick Add
- [ ] Add "New Transaction" button to /transactions
- [ ] Open TransactionSlideV2 instead of modal
- [ ] Test from main page

### Replace Edit Modal
- [ ] Use EditTransactionSlide for editing
- [ ] Deprecate old edit modal
- [ ] Test edit flow

### Navigation Updates
- [ ] Update keyboard shortcuts
- [ ] Update navigation menu
- [ ] Add tooltips/help

### Cleanup
- [ ] Remove V1 components
- [ ] Remove unused modals
- [ ] Update documentation

---

## Backlog / Future Enhancements

### UX Improvements
- [ ] Add keyboard shortcuts (Ctrl+N for new, Esc to close)
- [ ] Add auto-save drafts
- [ ] Add recent transactions quick-fill
- [ ] Add transaction templates

### Performance
- [ ] Implement virtual scrolling for bulk mode
- [ ] Optimize re-renders
- [ ] Add loading states

### Features
- [ ] Recurring transactions
- [ ] Batch edit
- [ ] Import from CSV
- [ ] Export to Excel

---

## Notes

- **V3 Exploration**: Smart Context Layout was prototyped but deferred. Focus remains on V2 stability.
- **Current Priority**: Phase 2 (Cards Integration) for better UX.
- **Testing Strategy**: Manual testing on /txn/v2, then gradual rollout.
- **Code Quality**: All changes pass `npm run build` verification.

---

## Recent Tickets Completed

### Phase 16.2: Bulk Mode Enhancements
- ✅ Add Person/Debt column to Bulk Row
- ✅ Fix Cashback Cycle badge in Bulk mode
- ✅ Category auto-defaults for Debt/Repayment
- ✅ Strict category filtering for Transfer

### Phase 16.3: UI Refinements
- ✅ Tag sync with date in Single/Bulk modes
- ✅ Bulk total text (readMoney)
- ✅ Cashback rate input validation (10% warning)
- ✅ Cycle badge styling consistency
- ✅ Data integrity fixes (account.service.ts, bulk-transaction-actions.ts)

### Phase 16.4: Safety and Customization (Latest)
- ✅ Implemented Unsaved Changes Warning (Slide-based)
- ✅ Added Column Customization Feature
  - ✅ Drag-and-drop reordering
  - ✅ Visibility toggling
  - ✅ Frozen columns (Date, Action)
  - ✅ Resizing support (input based)
- ✅ Fixed infinite loop issues in Transaction Slide

---

**Last Updated**: 2026-01-18
**Current Build**: Transaction Slide V2 + Unified Table Customization
**Next Milestone**: Phase 2 - Cards Integration
