# PHASE 1A: Transaction Slide V2 Integration & Edit/Update/Duplicate

## 🎯 Mission Statement

Integrate the Transaction Slide V2 component into Money Flow 3 with full CRUD operations:
- **CREATE**: Replace the black "+ Add" button with Slide V2 button
- **READ**: Display transaction data in the slide
- **UPDATE**: Edit existing transactions via Slide Edit
- **DUPLICATE**: Clone transactions via Slide Duplicate
- **WARNINGS**: Show unsaved data warning when closing without saving

---

## 📋 Phase 1A Scope

### Part A: Slide Button Integration
Replace the black "+ Add" button (top-right, next to Account/People filters) with a styled button that triggers the Slide V2 component for creating new transactions.

### Part B: Form Submission Logic
Integrate transaction submission into the Slide:
- When user clicks "Save" in Slide → Submit transaction
- Validate form data
- Show warning dialog if user tries to close with unsaved data
- Use app-level styling (NOT browser default dialogs)

### Part C: Edit Transaction
- Pen icon in Action column → Click opens Slide Edit
- Pre-populate slide with existing transaction data
- Update button replaces "Add new" button
- Same warning system for unsaved changes

### Part D: Duplicate Transaction
- Copy icon in Action column → Click opens Slide Duplicate
- Pre-populate with existing data
- Button text: "Duplicate to Save"
- Create new transaction with duplicated values

### Part E: Customize Columns
- Check if `Customize Columns` feature exists in codebase
- If YES → Add Customize icon to Action column header
- Icon placement: Action column (next to header text)

---

## 🔍 Code Analysis Required

### 1. Current "+ Add" Button Location
```
Location: Top toolbar (next to Account/People filters)
Current: Black button labeled "+ Add"
Color: Dark/Black
Icon: Plus icon
Action: Should trigger Slide V2 for new transaction
```

### 2. Transaction Data Structure
- [ ] Find transaction interface/type definition
- [ ] Identify required fields (date, amount, category, account, etc.)
- [ ] Check validation rules
- [ ] Document field types and constraints

### 3. Slide V2 Component Status
- [ ] Component exists and is importable?
- [ ] What props does it accept?
- [ ] Does it have isOpen/onClose handlers?
- [ ] Transaction form validation already built-in?

### 4. Action Column Structure
```
Current: Pen icon (edit) + Copy icon (duplicate) visible
Need to: Connect these to Slide Edit/Duplicate flows
Check: If Customize Columns icon exists and where
```

---

## 🛠️ Implementation Steps

### Step 1: Replace "+ Add" Button
```
Current Code (FIND):
  - Top toolbar with "+ Add" button
  - Click handler (if any)

Replace With:
  - Same button position
  - New styling (v2 design tokens)
  - OnClick → Open Slide with mode="CREATE"
  
Code Location:
  - src/components/layout/Header.tsx (or toolbar component)
  - src/pages/Transactions.tsx (or dashboard)
```

### Step 2: Connect Slide Form to API
```
Logic:
  1. User clicks "+ Add" or Pen icon (edit) → Open Slide
  2. Slide displays form
  3. User fills form → onSubmit handler triggered
  4. Validate form data
  5. If valid → Call transaction API (create/update)
  6. If invalid → Show error in Slide
  7. On success → Close Slide, refresh table, show success message

File to Update:
  - src/components/TransactionSlide/TransactionSlide.tsx
  - src/hooks/useTransactions.ts (or API hook)
  - src/pages/Transactions.tsx (integration)
```

### Step 3: Implement Warning Dialog
```
Trigger: When user tries to close Slide with unsaved data
Dialog: Custom app-level modal (NOT browser confirm)

Implementation:
  1. Track form state (isDirty)
  2. On close attempt → Check isDirty
  3. If isDirty === true → Show custom warning dialog:
     - Message: "You have unsaved changes. Discard?"
     - Buttons: "Save" | "Discard" | "Cancel"
     - Styling: Use app design tokens

Files:
  - src/components/TransactionSlide/TransactionSlide.tsx
  - src/components/ui/WarningDialog/WarningDialog.tsx (create if not exists)
```

### Step 4: Connect Pen Icon (Edit)
```
Current: Pen icon in Action column
New: Click → Open Slide Edit mode

Code:
  1. Find Pen icon onClick handler
  2. Get transaction ID from row data
  3. Fetch full transaction data
  4. Open Slide with mode="EDIT" + transactionData
  5. Slide shows pre-filled form
  6. Save button → Update transaction
  7. Close Slide → Refresh table

File Location:
  - src/components/TransactionTable/ActionCell.tsx (or similar)
  - src/pages/Transactions.tsx
```

### Step 5: Connect Copy Icon (Duplicate)
```
Current: Copy icon in Action column
New: Click → Open Slide Duplicate mode

Code:
  1. Find Copy icon onClick handler
  2. Get transaction ID from row data
  3. Fetch full transaction data
  4. Open Slide with mode="DUPLICATE" + transactionData
  5. Clear certain fields (date → today, maybe ID)
  6. Save button text: "Duplicate to Save"
  7. Submit → Create new transaction with duplicated data
  8. Close Slide → Refresh table

File Location:
  - src/components/TransactionTable/ActionCell.tsx (or similar)
  - src/pages/Transactions.tsx
```

### Step 6: Add Customize Columns Icon
```
Check: Does Customize Columns feature exist?

If YES:
  1. Find icon/component
  2. Add to Action column header
  3. Icon placement: Right side of "Action" text
  4. OnClick → Open customize modal
  
If NO:
  1. Skip this step for now
  2. Document for future implementation

Code Location:
  - src/components/TransactionTable/TableHeader.tsx
  - src/components/TransactionTable/CustomizeColumnsModal.tsx
```

---

## ⚠️ Warning Dialog Implementation

### Design Requirements
```
Dialog Box (Modal):
  - Title: "Unsaved Changes"
  - Message: "You have unsaved changes. Do you want to discard them?"
  - Buttons:
    ├─ "Save" (Primary button, blue)
    ├─ "Discard" (Secondary button, red)
    └─ "Cancel" (Tertiary button, gray)
  - Styling: App design tokens (NOT browser CSS)
  - Close on ESC: YES
  - Click outside to close: NO (disable backdrop click)

Behavior:
  - Save: Submit form → Close Slide
  - Discard: Close Slide without saving
  - Cancel: Return to form (keep Slide open)
```

### Code Example
```typescript
interface WarningDialogProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  message?: string;
}

export const WarningDialog: React.FC<WarningDialogProps> = ({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
  message = "You have unsaved changes. Do you want to discard them?",
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} closeOnEsc closeOnBackdropClick={false}>
      <Modal.Header>Unsaved Changes</Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onDiscard}>
          Discard
        </Button>
        <Button variant="primary" onClick={onSave}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
```

---

## 📊 Slide Modes & Behavior

### Mode: CREATE (New Transaction)
```
Trigger: Click "+ Add" button
Slide Title: "Add New Transaction"
Form: Empty fields
Submit Button: "Add Transaction" (blue)
After Save: Close slide, refresh table, show success toast
Warning: If user closes with unsaved data
```

### Mode: EDIT (Update Transaction)
```
Trigger: Click Pen icon in Action column
Slide Title: "Edit Transaction"
Form: Pre-filled with transaction data
Submit Button: "Update Transaction" (blue)
After Save: Close slide, refresh table, show success toast
Warning: If user closes with unsaved data
```

### Mode: DUPLICATE (Clone Transaction)
```
Trigger: Click Copy icon in Action column
Slide Title: "Duplicate Transaction"
Form: Pre-filled with transaction data
Fields to Clear: ID (generate new), Date (set to today)
Submit Button: "Duplicate to Save" (blue)
After Save: Close slide, refresh table, show success toast
Warning: If user closes with unsaved data
```

---

## 🔗 Integration Points

### 1. Transaction API Calls
```typescript
// CREATE
POST /api/transactions
Body: { date, amount, category, account, note, ... }

// READ (get one)
GET /api/transactions/:id

// UPDATE
PUT /api/transactions/:id
Body: { date, amount, category, account, note, ... }

// DUPLICATE (create from existing)
POST /api/transactions
Body: { ...existingTransaction, id: undefined, date: today() }
```

### 2. Component Dependencies
```
TransactionSlide depends on:
  ├─ Form inputs (text, number, date, select)
  ├─ Category dropdown
  ├─ Account dropdown
  ├─ Validation logic
  ├─ API service for create/update
  └─ Modal/Slide component

Transaction Table depends on:
  ├─ ActionCell component (pen icon, copy icon)
  ├─ Transaction data from API
  ├─ Click handlers (edit, duplicate)
  └─ Toast notifications for success/error
```

### 3. State Management
```
Slide State:
  - isOpen: boolean
  - mode: 'CREATE' | 'EDIT' | 'DUPLICATE'
  - transactionData: Transaction | null
  - isDirty: boolean
  - isLoading: boolean
  - error: string | null

Table State:
  - transactions: Transaction[]
  - isLoading: boolean
  - selectedTransaction: Transaction | null (for edit/duplicate)
```

---

## ✅ Testing Checklist

### Functionality Tests
- [ ] "+ Add" button opens Slide in CREATE mode
- [ ] Pen icon opens Slide in EDIT mode with pre-filled data
- [ ] Copy icon opens Slide in DUPLICATE mode with pre-filled data
- [ ] Form validation works in all modes
- [ ] Submit creates/updates transaction correctly
- [ ] Table refreshes after save
- [ ] Success toast shows after save
- [ ] Error toast shows on save failure

### Warning Dialog Tests
- [ ] Closing Slide with unsaved data shows warning
- [ ] Closing Slide without changes does NOT show warning
- [ ] "Save" button in warning saves and closes
- [ ] "Discard" button closes without saving
- [ ] "Cancel" button keeps Slide open
- [ ] Warning dialog styling uses app tokens (not browser)

### UI/UX Tests
- [ ] Button styling matches v2 design
- [ ] Slide opens/closes smoothly
- [ ] Form fields respond to input
- [ ] Buttons are disabled during loading
- [ ] All icons are visible and clickable
- [ ] Customize Columns icon visible (if feature exists)

### Edge Cases
- [ ] Required fields show validation error
- [ ] Invalid data (negative amount, wrong date) rejected
- [ ] Duplicate of transaction preserves all data except ID
- [ ] Concurrent edits handled gracefully
- [ ] Network errors show user-friendly message

---

## 📁 Files to Create/Update

### New Files to Create
```
src/components/TransactionSlide/
├─ TransactionSlide.tsx (main component)
├─ TransactionSlide.module.css (styles)
├─ TransactionSlide.types.ts (types & interfaces)
└─ TransactionSlide.test.tsx (tests)

src/components/ui/WarningDialog/
├─ WarningDialog.tsx (warning modal component)
├─ WarningDialog.module.css (styles)
└─ WarningDialog.test.tsx (tests)
```

### Files to Update
```
src/pages/Transactions.tsx
  - Import TransactionSlide
  - Add state for slide (isOpen, mode, selectedTransaction)
  - Add handlers (openSlide, closeSlide, handleEdit, handleDuplicate)
  - Render Slide component

src/components/TransactionTable/TableHeader.tsx
  - Replace "+ Add" button with new styled button
  - Add Customize Columns icon (if feature exists)

src/components/TransactionTable/ActionCell.tsx
  - Connect Pen icon → handleEdit
  - Connect Copy icon → handleDuplicate
  - Add loading state during API call

src/hooks/useTransactions.ts (or API service)
  - Add createTransaction()
  - Add updateTransaction()
  - Add getTransactionById()
  - Add form validation logic

src/types/transaction.ts
  - Ensure Transaction interface defined
  - Add validation types if needed
```

---

## 🚀 Implementation Priority

### Priority 1 (Must Have)
1. Replace "+ Add" button with Slide trigger
2. Connect form submission to API
3. Implement warning dialog
4. Connect Pen icon (Edit)

### Priority 2 (Should Have)
5. Connect Copy icon (Duplicate)
6. Add success/error toasts
7. Form validation

### Priority 3 (Nice to Have)
8. Customize Columns icon
9. Loading states
10. Error handling edge cases

---

## 📝 Code Style Requirements

### TypeScript
```typescript
// Always use strict types
interface TransactionSlideProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'CREATE' | 'EDIT' | 'DUPLICATE';
  transactionData?: Transaction;
}

// Use React.FC for function components
export const TransactionSlide: React.FC<TransactionSlideProps> = ({
  isOpen,
  onClose,
  mode,
  transactionData,
}) => {
  // Component code
};
```

### CSS Modules
```css
/* Use design system tokens */
.slideContainer {
  background-color: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-lg);
}

.button {
  padding: var(--space-16);
  font-size: var(--font-size-md);
}
```

### File Organization
```
src/
├─ components/
│  ├─ TransactionSlide/
│  │  ├─ index.ts (export)
│  │  ├─ TransactionSlide.tsx (main)
│  │  ├─ TransactionSlide.types.ts
│  │  ├─ TransactionSlide.module.css
│  │  └─ TransactionSlide.test.tsx
│  └─ ...
├─ hooks/
│  ├─ useTransactions.ts
│  └─ ...
├─ pages/
│  └─ Transactions.tsx
└─ ...
```

---

## 💡 Notes for Agent

### Important Considerations
1. **Styling**: Use app design tokens, NOT browser defaults
2. **State Management**: Keep slide state in parent component (Transactions.tsx)
3. **Validation**: Validate before submit, show errors in slide
4. **Loading**: Disable buttons/inputs during API call
5. **Errors**: Show user-friendly error messages, not stack traces
6. **Accessibility**: Ensure form labels, ARIA attributes, keyboard navigation
7. **Testing**: Write tests for all modes (CREATE, EDIT, DUPLICATE)
8. **Performance**: Memoize components if needed to prevent re-renders

### Known Potential Issues
- [ ] Form validation might need custom rules for this domain
- [ ] Customize Columns feature might not exist - check first!
- [ ] Icon styling in Action column might need adjustment
- [ ] Date handling might need timezone consideration
- [ ] Concurrent edits could cause conflicts - implement optimistic locking if needed

---

## 🔄 Workflow for Agent

### Day 1: Analysis
- [ ] Read this entire prompt
- [ ] Find + Add button in codebase
- [ ] Find Pen/Copy icons in Action column
- [ ] Check if Customize Columns feature exists
- [ ] Review Transaction data structure
- [ ] Check existing Slide V2 component

### Day 2: Create Base
- [ ] Create TransactionSlide.tsx skeleton
- [ ] Create WarningDialog.tsx component
- [ ] Create types file with interfaces
- [ ] Set up basic styling (CSS Modules)

### Day 3: Implement CREATE
- [ ] Replace "+ Add" button
- [ ] Implement Slide open/close
- [ ] Build form with inputs
- [ ] Connect form submission
- [ ] Add success toast

### Day 4: Implement EDIT
- [ ] Connect Pen icon to Slide
- [ ] Pre-fill form with transaction data
- [ ] Implement update logic
- [ ] Add success toast

### Day 5: Implement DUPLICATE
- [ ] Connect Copy icon to Slide
- [ ] Pre-fill form (with ID cleared)
- [ ] Implement duplicate logic
- [ ] Add success toast

### Day 6: Polish & Testing
- [ ] Add warning dialog for unsaved changes
- [ ] Add error handling
- [ ] Implement loading states
- [ ] Write comprehensive tests

### Day 7: QA & Integration
- [ ] Manual testing of all modes
- [ ] Accessibility audit
- [ ] Performance check
- [ ] PR preparation

---

## 📞 Questions to Answer Before Starting

1. Where exactly is the "+ Add" button in the UI?
2. What's the Transaction data structure/interface?
3. Does Slide V2 component already exist? Where?
4. What API endpoints exist for transactions?
5. Is there a Customize Columns feature implemented?
6. What validation rules apply to transactions?
7. How are success/error messages currently shown (Toast, Alert, etc.)?
8. What's the app's date/time handling approach?
9. Are there any existing edit/form components to reference?
10. What's the table refresh mechanism (refetch, optimistic update, etc.)?

---

## 🎯 Success Criteria

### Phase 1A Complete When:
✅ "+ Add" button replaced with Slide trigger
✅ Slide opens in CREATE mode and submits transaction
✅ Pen icon opens Slide in EDIT mode and updates transaction
✅ Copy icon opens Slide in DUPLICATE mode and creates duplicate
✅ Warning dialog shows when closing with unsaved changes
✅ All CRUD operations work without browser dialogs
✅ Form validation works
✅ Success/error toasts show
✅ Tests pass (>80% coverage)
✅ Accessibility compliant (WCAG AA)
✅ Code reviewed and approved
✅ PR merged to main

---

*Phase 1A Prompt - Transaction Slide Integration*  
*Version: 1.0*  
*Created: January 18, 2026*  
*Status: Ready for Agent*
