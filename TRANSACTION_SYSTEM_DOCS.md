# 📋 Transaction System - Complete Documentation & Onboarding

**Last Updated:** February 2, 2026  
**System Version:** V2 (TransactionSlideV2)  
**Status:** Production Ready  

---

## 🎯 Quick Reference

### Current System (V2 - ACTIVE)
- **Component:** `TransactionSlideV2` in `src/components/transaction/slide-v2/`
- **UI:** Right-side slide panel (400-1000px width)
- **Modes:** Single & Bulk transaction entry
- **Operations:** Add, Edit, Duplicate
- **Page:** `src/components/transactions/UnifiedTransactionsPage.tsx`

### Legacy System (V1 - ARCHIVED)
- **Location:** `Archive/components/moneyflow/` ⚠️
- **Status:** DEPRECATED - Do NOT use
- **Modal Files:** 
  - `add-transaction-dialog.DEPRECATED.tsx` (552 lines)
  - `transaction-form.DEPRECATED.tsx` (5366 lines)
- **Stubs:** Exist at original locations to catch errors

---

## 📁 File Structure

```
src/components/transaction/
├── slide-v2/
│   ├── transaction-slide-v2.tsx          [Main component - 474 lines]
│   ├── types.ts                          [TypeScript definitions]
│   ├── single-mode/
│   │   ├── single-form.tsx
│   │   ├── basic-info-section.tsx
│   │   ├── account-selector.tsx
│   │   └── ...
│   └── bulk-mode/
│       ├── bulk-input-section.tsx
│       └── ...
├── LOADING_INDICATOR.md
├── DUPLICATE_FEATURE.md
└── DUPLICATE_DEBUG_GUIDE.md

src/components/transactions/
└── UnifiedTransactionsPage.tsx           [Main page - handles state]

src/components/moneyflow/
├── add-transaction-dialog.tsx            [STUB - deprecated]
├── transaction-form.tsx                  [STUB - deprecated]
└── unified-transaction-table.tsx         [Table rendering]

Archive/components/moneyflow/
├── add-transaction-dialog.DEPRECATED.tsx [OLD - 552 lines]
└── transaction-form.DEPRECATED.tsx       [OLD - 5366 lines]
```

---

## 🚀 TransactionSlideV2 Usage

### Basic Props
```tsx
<TransactionSlideV2
  open={isSlideOpen}
  onOpenChange={handleSlideOpenChange}
  mode="single"                           // "single" | "bulk"
  operationMode={slideMode}               // "add" | "edit" | "duplicate"
  initialData={initialSlideData}          // Pre-populate form
  editingId={editingId}                   // For edit mode: id to update
  accounts={accounts}
  categories={categories}
  people={people}
  shops={shops}
  onSuccess={handleSlideSuccess}
  onSubmissionStart={handleSlideSubmissionStart}
  onSubmissionEnd={handleSlideSubmissionEnd}
  onBackButtonClick={handleBackButtonClick}
/>
```

### Operation Modes

#### 1. **ADD Mode**
```tsx
handleAdd = () => {
  setSlideMode('add')
  setSelectedTxn(null)          // No txn selected
  setSlideOverrideType(undefined)
  setIsSlideOpen(true)
}
```
- `operationMode` = "add"
- `editingId` = undefined
- `initialData` = undefined (uses defaults)
- **Action:** `createTransaction()`

#### 2. **EDIT Mode**
```tsx
handleEdit = (txn: TransactionWithDetails) => {
  setSlideMode('edit')
  setSelectedTxn(txn)
  setSlideOverrideType(undefined)
  setIsSlideOpen(true)
}
```
- `operationMode` = "edit"
- `editingId` = txn.id
- `initialData` = txn data
- **Action:** `updateTransaction(id, payload)`

#### 3. **DUPLICATE Mode** ⭐
```tsx
handleDuplicate = (txn: TransactionWithDetails) => {
  setSlideMode('duplicate')
  setSelectedTxn(txn)           // Has txn data
  setSlideOverrideType(undefined)
  setIsSlideOpen(true)          // Form populate from txn, date = today
}
```
- `operationMode` = "duplicate"
- `editingId` = undefined ⭐ (IMPORTANT - NOT edit mode!)
- `initialData` = txn data with `occurred_at: new Date()`
- **Action:** `createTransaction()` (creates NEW transaction)

---

## 🔄 Data Flow

### Add/Edit/Duplicate Flow
```
User Action
  ↓
handleAdd/handleEdit/handleDuplicate()
  ↓
Set state: slideMode, selectedTxn, isSlideOpen
  ↓
TransactionSlideV2 opens
  ↓
initialSlideData computed from selectedTxn
  ↓
defaultFormValues populated from initialData
  ↓
Form fields rendered with data
  ↓
User edits & submits
  ↓
onSingleSubmit() → Form validation
  ↓
if (editingId) → updateTransaction()     [EDIT mode]
else → createTransaction()               [ADD/DUPLICATE mode]
  ↓
onSubmissionStart() called
  ↓
Slide closes immediately
  ↓
Loading indicator shown (blue gradient, top-center)
  ↓
Server action executes
  ↓
onSubmissionEnd() called
  ↓
Loading indicator hidden
  ↓
Page refreshed (router.refresh())
```

### Critical: editingId Logic
```tsx
// In UnifiedTransactionsPage.tsx
editingId={(slideMode === 'edit' && selectedTxn) ? selectedTxn.id : undefined}

// In TransactionSlideV2.tsx
if (editingId) {
  // UPDATE existing
  success = await updateTransaction(editingId, payload)
} else {
  // CREATE new (works for ADD and DUPLICATE)
  const newId = await createTransaction(payload)
}
```

**Key Rule:** `editingId` must be `undefined` for DUPLICATE mode, otherwise it will UPDATE instead of CREATE!

---

## ⚙️ Key Features

### 1. **Loading Indicator**
- **Type:** Spinning blue gradient badge
- **Position:** Fixed top-center (never scrolls off)
- **Messages:**
  - "Creating transaction..." (add)
  - "Updating transaction..." (edit)
  - "Duplicating transaction..." (duplicate)
  - "Voiding transaction..." (void action)
  - "Deleting transaction..." (delete action)
- **Implementation:** `isGlobalLoading` + `loadingMessage` states

### 2. **Form Validation**
- **Schema:** Zod with `zodResolver`
- **Required Fields:**
  - `source_account_id` (min 1 char)
  - `amount` (>= 0)
  - `type` (enum check)
  - `occurred_at` (Date object)
- **Optional Fields:** category, shop, person, target_account_id, tag, cashback

### 3. **Console Logging** 🐛
When form validates and submits, you'll see:
```
✅ onSingleSubmit called - Form validation PASSED
📋 Form data: { type, amount, source_account_id, ... }
🎯 Operation: "duplicate" | editingId: undefined
🔀 Will call: "createTransaction()"
🚀 Starting transaction submit...
➕ CREATE mode - creating new transaction
✨ Create result - newId: "xxx-yyy-zzz"
🎉 Submit success: true
```

**Debug logs in parent component:**
```
🔄 initialSlideData useMemo triggered
   slideMode: duplicate
   selectedTxn: { id: "...", type: "debt", amount: 1111 }
   ✅ Computed initialSlideData: { ... }

🎨 defaultFormValues computed:
   initialData: { type: "debt", amount: 1111, ... }
   ✅ Using initialData values: { ... }
```

---

## 🚫 DEPRECATED FILES - DO NOT USE

### ❌ `src/components/moneyflow/add-transaction-dialog.tsx`
- **Status:** STUB only - returns null with warning
- **Old Code:** Archived in `Archive/components/moneyflow/add-transaction-dialog.DEPRECATED.tsx`
- **Lines:** 552 (old) → V2 distributed across slide-v2/*
- **Why Archived:** Modal dialog center-screen, difficult to maintain, V2 is cleaner

### ❌ `src/components/moneyflow/transaction-form.tsx`
- **Status:** STUB only - returns null with warning
- **Old Code:** Archived in `Archive/components/moneyflow/transaction-form.DEPRECATED.tsx`
- **Lines:** 5366 (old) → V2 modularized in single-mode/, bulk-mode/
- **Why Archived:** Monolithic file, poor separation of concerns, impossible to test individual sections

**Stub Behavior:**
```tsx
export function AddTransactionDialog(props: AddTransactionDialogProps) {
  console.error("⚠️ AddTransactionDialog is DEPRECATED. Use TransactionSlideV2 instead");
  return null;  // Never renders
}

export function TransactionForm(props: TransactionFormProps) {
  console.error("⚠️ TransactionForm is DEPRECATED. Use TransactionSlideV2 instead");
  return null;  // Never renders
}
```

---

## 🐛 Known Issues & Debugging

### Issue: Duplicate fails with "Form validation errors: {}"
- **Cause:** Form validation passed but logs show empty errors object
- **Debug:** Check console for:
  1. `🔄 initialSlideData useMemo triggered` - is `selectedTxn` populated?
  2. `🎨 defaultFormValues computed` - does `initialData` exist?
  3. `✅ onSingleSubmit called` - did validation actually pass?
- **Investigation ID:** `aae9c0be-e0e1-456f-b06e-87500607afe8`
- **Next Steps:** Open browser DevTools → Console tab → Check all logs in order

### Issue: Modal dialog appears instead of slide
- **Should NEVER happen** - stubs return null
- **Debug:** Check imports - should be TransactionSlideV2, not AddTransactionDialog
- **Fix:** Search codebase for `AddTransactionDialog` or `TransactionForm` imports

### Issue: Duplicate creates multiple copies
- **Cause:** Race condition in state updates
- **Symptom:** `editingId` not cleared before next open
- **Fix:** Check `handleBackButtonClick` resets all state properly

---

## ✅ Rules & Best Practices

### ✅ DO:
```tsx
// Use TransactionSlideV2
import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'

// Operations trigger through handlers
const handleDuplicate = (txn) => {
  setSlideMode('duplicate')
  setSelectedTxn(txn)
  setIsSlideOpen(true)
}

// Check editingId to determine operation
if (editingId) {
  await updateTransaction(editingId, payload)  // EDIT
} else {
  await createTransaction(payload)             // ADD or DUPLICATE
}
```

### ❌ DON'T:
```tsx
// ❌ Don't import deprecated files
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'
import { TransactionForm } from '@/components/moneyflow/transaction-form'

// ❌ Don't manually create modal dialogs
<Dialog open={isOpen}>
  <DialogContent>
    {/* Modal transaction form */}
  </DialogContent>
</Dialog>

// ❌ Don't use center-screen position for transaction UI
// Use slide-v2 with side="right" instead

// ❌ Don't pass editingId for duplicate mode
// Will UPDATE instead of CREATE
editingId={slideMode === 'duplicate' ? txn.id : undefined}  // WRONG!
editingId={slideMode === 'edit' ? txn.id : undefined}      // CORRECT!
```

---

## 🧪 Testing Duplicate Feature

### Test Steps:
1. Navigate to `/transactions`
2. Find transaction ID: `aae9c0be-e0e1-456f-b06e-87500607afe8`
3. Click **Duplicate** button (Files icon, purple hover)
4. Verify:
   - ✅ Slide opens from right with "Duplicate Transaction" title
   - ✅ All fields populated (date changed to today)
   - ✅ Form validation passes
   - ✅ Console shows 8 logs (see Debug Logs section)
   - ✅ Loading indicator appears (blue, top-center)
   - ✅ Success toast appears
   - ✅ Page refreshes
   - ✅ New transaction appears in table

### Debug with Console:
```javascript
// In DevTools Console, filter by:
> console.logs starting with "✅", "📋", "🎯", "🔀", "🚀", "➕", "✨", "🎉"

// Should see in order:
✅ onSingleSubmit called - Form validation PASSED
📋 Form data: {...}
🎯 Operation: "duplicate"
🔀 Will call: "createTransaction()"
🚀 Starting transaction submit...
➕ CREATE mode - creating new transaction
✨ Create result - newId: "new-id-here"
🎉 Submit success: true
```

---

## 📚 Related Documentation

- [LOADING_INDICATOR.md](./LOADING_INDICATOR.md) - Global loading indicator system
- [DUPLICATE_FEATURE.md](./DUPLICATE_FEATURE.md) - Duplicate button implementation
- [DUPLICATE_DEBUG_GUIDE.md](./DUPLICATE_DEBUG_GUIDE.md) - Debugging duplicate issues
- [HANDOVER_12-2.md](../.agent/HANDOVER_12-2.md) - Agent handover notes

---

## 🔗 Key Code References

| File | Lines | Purpose |
|------|-------|---------|
| `UnifiedTransactionsPage.tsx` | 558-595 | `initialSlideData` computation |
| `UnifiedTransactionsPage.tsx` | 462-475 | Operation handlers (add, edit, duplicate) |
| `transaction-slide-v2.tsx` | 70-103 | `defaultFormValues` population |
| `transaction-slide-v2.tsx` | 215-270 | `onSingleSubmit` with operation routing |
| `unified-transaction-table.tsx` | 824-841 | Delete handler with loading state |

---

## 🎓 For Next Developer

**If duplicate fails:**
1. ✅ Check console logs - all 8 should appear
2. ✅ Check `selectedTxn` population - is it null?
3. ✅ Check `initialData` - is it empty {}?
4. ✅ **Open browser DevTools + Network tab**
5. ✅ Watch network request to `createTransaction` action
6. ✅ Check server response - success or error?
7. ✅ See `HANDOVER_12-2.md` for research notes

**If modal appears:**
1. ✅ Search for `AddTransactionDialog` imports
2. ✅ Replace with `TransactionSlideV2`
3. ✅ Check no direct modal usage in components

**If loading indicator doesn't show:**
1. ✅ Check `onSubmissionStart` passed to TransactionSlideV2
2. ✅ Check `handleSlideSubmissionStart` sets `isGlobalLoading(true)`
3. ✅ Verify `z-index: 9999` on indicator div

---

**Version:** 1.0  
**Created:** Feb 2, 2026  
**Last Review:** Feb 2, 2026
