# V1 → V2 Migration Checklist

## Status: 🟡 In Progress

### ✅ Completed
- [x] Archive V1 files (5k+ lines) to `Archive/components/moneyflow/`
- [x] Create stub files with deprecation warnings
- [x] Fix TransactionSlideV2 back button (force close)
- [x] Document architecture in ARCHITECTURE.md
- [x] Build passes successfully (27.2s)

### 🟡 Components Using V1 (Need Migration)

#### High Priority (User-Facing)
- [ ] `src/components/moneyflow/debt-cycle-group.tsx` - Import on line 7
- [ ] `src/components/moneyflow/debt-cycle-list.tsx` - Import on line 10
- [ ] `src/components/moneyflow/debt-cycle-tabs.tsx` - Import on line 8
- [ ] `src/components/moneyflow/debt-list.tsx` - Import on line 8
- [ ] `src/components/moneyflow/filterable-transactions.tsx` - Import on line 14
- [ ] `src/components/installments/installment-table.tsx` - Import on line 22

#### Medium Priority (Secondary Features)
- [ ] `src/components/people/person-card.tsx` - Import on line 25
- [ ] `src/components/people/person-detail-tabs.tsx` - Import on line 17
- [ ] `src/components/people/split-bill-row.tsx` - Import on line 10
- [ ] `src/components/people/people-directory-mobile.tsx` - Import on line 11
- [ ] `src/components/people/people-directory-desktop.tsx` - Import on line 11
- [ ] `src/components/moneyflow/person-card.tsx` - Import on line 18

#### Low Priority (Legacy/Unused)
- [ ] `src/components/moneyflow/unified-transaction-table.tsx` - Lines 101, 2696, 2993
- [ ] `src/components/moneyflow/unified-transaction-table-v2.tsx` - Lines 109, 2577, 2872
- [ ] `src/components/moneyflow/account-card.tsx` - Import on line 38
- [ ] `src/components/moneyflow/recent-transactions.tsx` - Import on line 17

### 🔧 Migration Steps (Per Component)

1. **Find Imports**
   ```tsx
   // OLD
   import { AddTransactionDialog } from './add-transaction-dialog'
   ```

2. **Replace with V2**
   ```tsx
   // NEW
   import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'
   ```

3. **Update Props**
   ```tsx
   // OLD
   <AddTransactionDialog
     isOpen={isOpen}
     transactionId={txnId}
     mode="edit"
     initialValues={values}
   />
   
   // NEW
   <TransactionSlideV2
     open={isOpen}
     editingId={txnId}
     mode="single"
     initialData={values}
   />
   ```

4. **Test Component**
   - Open transaction slide
   - Click back button (should close immediately)
   - Submit transaction
   - Verify no console errors

5. **Remove Old Import**
   - Delete import line
   - Run `pnpm build`
   - Confirm no TypeScript errors

### 📊 Progress Tracker

```
Total Components: 19
Migrated: 0
Remaining: 19
Progress: [░░░░░░░░░░░░░░░░░░░░] 0%
```

### 🎯 Sprint Goals

#### Sprint 1 (This Week)
- [ ] Migrate all debt-related components (4 files)
- [ ] Migrate installment-table
- [ ] Update progress: 26% complete

#### Sprint 2 (Next Week)
- [ ] Migrate people-related components (6 files)
- [ ] Update progress: 58% complete

#### Sprint 3 (Following Week)
- [ ] Migrate remaining components (9 files)
- [ ] Remove stub files
- [ ] Update progress: 100% complete

### ⚠️ Known Issues

1. **Console Warnings Expected**
   - Legacy components will log deprecation warnings
   - This is intentional - use warnings to track migration progress

2. **Null Renders**
   - Components using V1 stubs will render nothing
   - This forces migration (fail-fast approach)

3. **Breaking Changes**
   - `isOpen` → `open`
   - `transactionId` + `mode="edit"` → `editingId`
   - `initialValues` → `initialData`

### 🔍 Testing Checklist (Post-Migration)

Per component migrated:
- [ ] Transaction slide opens
- [ ] Back button closes slide immediately
- [ ] Form validation works
- [ ] Submit creates/updates transaction
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Visual regression test passes

### 📝 Notes

- **Duplicate Feature:** Removed per user request, will rewrite later
- **Archive Location:** `Archive/components/moneyflow/*.DEPRECATED.tsx`
- **Documentation:** See `ARCHITECTURE.md` for full details

---
**Last Updated:** February 2, 2026  
**Next Review:** After Sprint 1 completion
