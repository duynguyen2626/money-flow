# ⚠️ DEPRECATED: Add Transaction Modal V1

**Status:** ARCHIVED (January 25, 2026)  
**Reason:** Replaced by `TransactionSlideV2` with modern UI/UX  
**Do NOT use in new code.**

---

## Overview

The old modal-based transaction dialog was replaced with the new slide component for better UX:

**Old Component:** `/src/components/moneyflow/add-transaction-dialog.tsx` (DEPRECATED)  
**New Component:** `/src/components/transaction/slide-v2/transaction-slide-v2.tsx` (ACTIVE)

---

## What Was Deprecated

### Old Component: `AddTransactionDialog`
- **Location:** `src/components/moneyflow/add-transaction-dialog.tsx`
- **Type:** Modal dialog with portal rendering
- **Mode:** Create/Edit only
- **Issues:**
  - Limited mobile responsiveness
  - Single mode only (no bulk transactions)
  - Complex state management with unsaved changes warnings
  - Inconsistent with modern UI standards

### Related Files (Still Used But Reference Old Dialog):
- `src/components/moneyflow/transaction-form.tsx` – Legacy form component (still used by v1)
- `src/components/moneyflow/recent-transactions.tsx` – Still uses old dialog for editing
- `src/components/people/paid-transactions-modal.tsx` – Still uses old dialog

---

## New Component: `TransactionSlideV2`

**Location:** `src/components/transaction/slide-v2/transaction-slide-v2.tsx`

**Improvements:**
- ✅ Sheet-based slide drawer (better mobile UX)
- ✅ Single & Bulk transaction modes with toggle
- ✅ Modern React Hook Form + Zod validation
- ✅ Advanced cashback configuration
- ✅ Split bill support
- ✅ Cleaner state management

**How to Use:**
```typescript
import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'
import { TransactionTrigger } from '@/components/transaction/slide-v2/transaction-trigger'

// Option 1: Direct component
<TransactionSlideV2
  open={open}
  onOpenChange={setOpen}
  accounts={accounts}
  categories={categories}
  people={people}
  shops={shops}
/>

// Option 2: Wrapper with trigger
<TransactionTrigger
  accounts={accounts}
  categories={categories}
  people={people}
  shops={shops}
>
  <button>Add Transaction</button>
</TransactionTrigger>
```

---

## Migration Checklist

### For Feature Developers:
- ❌ **DO NOT** import `AddTransactionDialog` in new code
- ✅ **DO** use `TransactionSlideV2` or `TransactionTrigger` instead
- ✅ **DO** review `.agent/README.md` for Slide V2 architecture

### For Existing Code:
- [ ] Refactor `recent-transactions.tsx` to use Slide V2
- [ ] Refactor `paid-transactions-modal.tsx` to use Slide V2
- [ ] Remove `transaction-form.tsx` dependency gradually (it's v1-specific)
- [ ] Delete `AddTransactionDialog` after all refactoring complete

---

## File Structure (Old)

```
src/components/moneyflow/
├── add-transaction-dialog.tsx         ⚠️ DEPRECATED
├── transaction-form.tsx               ⚠️ DEPRECATED (v1 form)
├── recent-transactions.tsx            ⚠️ Uses old dialog
└── account-card.tsx                   ⚠️ Uses old dialog
```

## File Structure (New)

```
src/components/transaction/slide-v2/
├── transaction-slide-v2.tsx           ✅ ACTIVE
├── transaction-trigger.tsx            ✅ ACTIVE
├── types.ts                           ✅ ACTIVE
├── single-mode/
│   ├── basic-info-section.tsx         ✅ ACTIVE
│   ├── account-selector.tsx           ✅ ACTIVE
│   ├── cashback-section.tsx           ✅ ACTIVE
│   └── split-bill-section.tsx         ✅ ACTIVE
└── bulk-mode/
    ├── bulk-input-section.tsx         ✅ ACTIVE
    ├── bulk-row.tsx                   ✅ ACTIVE
    └── quick-cashback-input.tsx       ✅ ACTIVE
```

---

## Key Differences

| Feature | V1 Modal | V2 Slide |
|---------|----------|----------|
| **Form Library** | Custom form handler | react-hook-form + zod |
| **Rendering** | Portal modal dialog | Sheet component |
| **Modes** | Create / Edit only | Create / Edit / Bulk |
| **Mobile UX** | Dialog (limited) | Full-height sheet |
| **Validation** | Manual | Zod schemas |
| **State** | Complex (unsaved warnings) | Simple (FormProvider) |

---

## Code Snippets (Old - DO NOT USE)

```typescript
// ❌ OLD - DO NOT USE
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog'

export function MyComponent() {
  return (
    <AddTransactionDialog
      accounts={accounts}
      categories={categories}
      people={people}
      shops={shops}
      buttonText="Add Transaction"
      defaultType="expense"
    />
  )
}
```

```typescript
// ✅ NEW - USE THIS
import { TransactionTrigger } from '@/components/transaction/slide-v2/transaction-trigger'

export function MyComponent() {
  return (
    <TransactionTrigger
      accounts={accounts}
      categories={categories}
      people={people}
      shops={shops}
    >
      <button>Add Transaction</button>
    </TransactionTrigger>
  )
}
```

---

## Documentation References

- `.agent/README.md` – Transaction Slide V2 architecture overview
- `.agent/CASHBACK_GUIDE_VI.md` – Cashback integration with Slide V2
- `src/components/transaction/slide-v2/` – All source files

---

## Questions?

**Before using any transaction dialog:**
1. Check if you need v1 or v2
2. Search codebase for recent patterns
3. Refer to `.agent/README.md` section "Transaction Slide V2"
4. Ask in code review if uncertain

---

**Archived by:** GitHub Copilot  
**Date:** January 25, 2026  
**Status:** ⚠️ DEPRECATED - Do not use in new code
