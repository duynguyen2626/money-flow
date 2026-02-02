# Transaction System Architecture - Feb 2026 Cleanup

## ✅ Current System (V2)
**Location:** `src/components/transaction/slide-v2/`

### Main Components
- **transaction-slide-v2.tsx** - Main slide panel container
- **single-mode/** - Single transaction entry sections
- **bulk-mode/** - Bulk transaction entry
- **types.ts** - TypeScript definitions

### Key Features
- ✅ Slide-in from right edge (Sheet UI)
- ✅ Back button with forced close (no warning)
- ✅ Single/Bulk mode toggle
- ✅ Modular architecture
- ✅ Clean separation of concerns

## 🗄️ Archived (V1)
**Location:** `Archive/components/moneyflow/`

### Archived Files
- `add-transaction-dialog.DEPRECATED.tsx` (552 lines)
- `transaction-form.DEPRECATED.tsx` (5366 lines)

### Why Archived?
1. **Old UI Pattern:** Center-screen modal dialog (confusing UX)
2. **Monolithic:** 5k+ lines in single file (unmaintainable)
3. **Agent Confusion:** AI kept editing wrong file
4. **Duplicate Code:** Multiple implementations of same features

### Stub Files
Created minimal stub files at original locations to prevent import errors:
- `src/components/moneyflow/add-transaction-dialog.tsx` - Logs deprecation warning
- `src/components/moneyflow/transaction-form.tsx` - Logs deprecation warning

Legacy components still importing these will get console warnings but won't break.

## 📊 Impact Analysis

### Components Using V2 (✅ Good)
- `/transactions` page - UnifiedTransactionsPage
- `/people/[id]` page - People Directory V2
- `/accounts/[id]` page - Account Detail Header
- Paid Transactions Modal

### Components Still Using V1 (⚠️ Need Migration)
- debt-cycle-group.tsx
- debt-cycle-list.tsx
- debt-cycle-tabs.tsx
- debt-list.tsx
- filterable-transactions.tsx
- installment-table.tsx
- person-card.tsx (old version)
- people-directory-desktop/mobile.tsx
- split-bill-row.tsx
- unified-transaction-table.tsx (v1)
- unified-transaction-table-v2.tsx

These components will render `null` with console warnings until migrated.

## 🎯 Migration Guide

### Before (V1 - Deprecated)
```tsx
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'

<AddTransactionDialog
  accounts={accounts}
  categories={categories}
  people={people}
  shops={shops}
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  mode="edit"
  transactionId={txnId}
  onSuccess={handleSuccess}
/>
```

### After (V2 - Current)
```tsx
import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'

<TransactionSlideV2
  open={isOpen}
  onOpenChange={setIsOpen}
  mode="single"
  editingId={txnId}
  initialData={defaultValues} // Optional
  accounts={accounts}
  categories={categories}
  people={people}
  shops={shops}
  onSuccess={handleSuccess}
/>
```

### Key Differences
| Feature | V1 (Old) | V2 (Current) |
|---------|----------|-------------|
| UI Type | Modal (center) | Slide (right edge) |
| Prop: Open | `isOpen` | `open` |
| Prop: Edit | `transactionId` + `mode="edit"` | `editingId` |
| Prop: Initial | `initialValues` | `initialData` |
| Lines of Code | 5366 | ~400 (modular) |
| Back Button | ❌ Hidden/broken | ✅ Top-left, force close |

## 🔧 Fixes Applied (Feb 2, 2026)

### Back Button Enhancement
**File:** `transaction-slide-v2.tsx` lines 286-295

```tsx
<button
  type="button"
  onClick={() => {
    // Force close without warning
    setHasChanges(false);
    onHasChanges?.(false);
    onOpenChange(false);
  }}
  className="p-1.5 bg-slate-100 rounded-full..."
  title="Close"
>
  <ArrowLeft className="w-4 h-4" />
</button>
```

**Why:** User reported back button didn't close slide. Issue was `hasChanges` state blocking close. Fixed by resetting state before closing.

## 📝 Future Work

### Phase 1: Core Features (✅ Done)
- [x] Back button with force close
- [x] Archive old files
- [x] Create stub files
- [x] Document architecture

### Phase 2: Migrate Remaining Components (🔜 Next)
- [ ] Migrate debt-related components
- [ ] Migrate installment-table
- [ ] Migrate people directory (old versions)
- [ ] Remove stub files once all migrations done

### Phase 3: Remove Duplicate Feature (Deferred)
Per user request: "Tạm thời xóa sạch code liên quan đến duplicate, reboot viết mới sau"
- Duplicate transaction feature temporarily removed
- Will rewrite from scratch later with cleaner approach

## 🚫 What NOT to Do
1. ❌ Do NOT edit files in `Archive/`
2. ❌ Do NOT create new features in V1 files
3. ❌ Do NOT import from deprecated stub files
4. ❌ Do NOT use AddTransactionDialog or TransactionForm directly

## ✅ Best Practices
1. ✅ Always use TransactionSlideV2 for new features
2. ✅ Keep sections modular (max 200 lines each)
3. ✅ Use react-hook-form + Zod validation
4. ✅ Force close on Back button (UX priority)
5. ✅ Document breaking changes in this file

---
**Last Updated:** February 2, 2026  
**Build Status:** ✅ Compiled successfully in 27.2s  
**Active System:** TransactionSlideV2 only
