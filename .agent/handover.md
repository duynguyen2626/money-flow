# Transaction Slide V2 - Handover Guide

## For the Next Developer

This document provides everything you need to continue work on Transaction Slide V2.

---

## Quick Start

### What is Transaction Slide V2?
A comprehensive transaction input system with Single and Bulk modes, supporting all transaction types (Expense, Income, Transfer, Debt, Repayment) with advanced features like cashback tracking.

### Where is it?
- **Code**: `src/components/transaction/slide-v2/`
- **Test Page**: http://localhost:3000/txn/v2
- **Status**: ✅ Production-ready, Phase 1 complete

---

## Current State

### What's Working
- ✅ Single transaction mode (all types)
- ✅ Bulk transaction mode (multi-row input)
- ✅ Cashback tracking with cycle badges
- ✅ Tag auto-sync with date
- ✅ Category auto-defaults
- ✅ Input validation
- ✅ Integration with backend services

### What's Not Implemented
- ❌ Split Bill section (placeholder only)
- ❌ Integration with main /transactions page
- ❌ Integration with Account/People cards
- ❌ Edit transaction via slide

---

## Architecture Overview

### Component Structure
```
slide-v2/
├── transaction-slide-v2.tsx          # Main component (Single + Bulk tabs)
├── types.ts                          # Zod schemas, TypeScript types
├── single-mode/
│   ├── basic-info-section.tsx        # Date, Tag, Account selection
│   ├── account-selector.tsx          # Account/Person/Target selectors
│   ├── cashback-section.tsx          # Cashback tracking UI
│   └── split-bill-section.tsx        # (Placeholder)
└── bulk-mode/
    ├── bulk-input-section.tsx        # Header + row list
    ├── bulk-row.tsx                  # Individual transaction row
    └── quick-cashback-input.tsx      # Cashback popover for rows
```

### Data Flow
1. **User Input** → Form (react-hook-form)
2. **Validation** → Zod schema
3. **Submission** → Server Action (`createTransaction` or `bulkCreateTransactions`)
4. **Backend** → `transaction.service.ts` → Database
5. **Cashback** → Automatically processed via `upsertTransactionCashback`

### Key Dependencies
- `react-hook-form` - Form state
- `zod` - Validation
- `date-fns` - Date handling
- `sonner` - Toasts
- Custom UI components (Shadcn/Radix)

---

## How to Make Changes

### Adding a New Field

1. **Update Schema** (`types.ts`)
```typescript
export const singleTransactionSchema = z.object({
  // ... existing fields
  new_field: z.string().optional(),
});
```

2. **Update Form** (e.g., `basic-info-section.tsx`)
```tsx
<FormField
  control={form.control}
  name="new_field"
  render={({ field }) => (
    <FormItem>
      <FormLabel>New Field</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
    </FormItem>
  )}
/>
```

3. **Update Submission** (`transaction-slide-v2.tsx`)
```typescript
await createTransaction({
  // ... existing fields
  new_field: data.new_field,
});
```

### Modifying Cashback Logic

**Frontend**: `cashback-section.tsx` or `quick-cashback-input.tsx`
**Backend**: `src/services/cashback.service.ts` → `upsertTransactionCashback`

**Important**: Cashback is automatically processed when a transaction is created. The frontend only provides the input UI.

### Adding a New Transaction Type

1. Update `types.ts` enum
2. Add button/tab in `transaction-slide-v2.tsx`
3. Update `account-selector.tsx` to show/hide relevant fields
4. Test thoroughly

---

## Common Tasks

### Task: Integrate with Account Cards

**Goal**: Add "Quick Add" button to Account detail pages

**Steps**:
1. Add button to `src/app/accounts/[id]/details/page.tsx`
2. Pass `initialData` to `TransactionSlideV2`:
```tsx
<TransactionSlideV2
  initialData={{
    source_account_id: accountId,
    type: "expense", // or auto-detect
  }}
/>
```
3. Test with different account types

**Estimated Time**: 2-3 hours

---

### Task: Integrate with People Cards

**Goal**: Add "Quick Lend" and "Quick Repay" buttons

**Steps**:
1. Add buttons to `src/app/people/[id]/details/page.tsx`
2. Pass `initialData`:
```tsx
// For Lend
<TransactionSlideV2
  initialData={{
    type: "debt",
    person_id: personId,
  }}
/>

// For Repay
<TransactionSlideV2
  initialData={{
    type: "repayment",
    person_id: personId,
  }}
/>
```
3. Optionally: Auto-detect direction based on debt balance
4. Test both scenarios

**Estimated Time**: 2-3 hours

---

### Task: Implement Split Bill

**Goal**: Complete the split bill feature

**Steps**:
1. Design data structure (who owes what)
2. Implement UI in `split-bill-section.tsx`
3. Update schema to include `participants` array
4. Create backend logic to split transaction
5. Test with multiple participants

**Estimated Time**: 1-2 days

---

### Task: Replace Main Transaction Modal

**Goal**: Use Slide V2 as default on /transactions page

**Steps**:
1. Add "New Transaction" button to `/transactions`
2. Open `TransactionSlideV2` instead of old modal
3. Add feature flag for gradual rollout
4. Test thoroughly
5. Deprecate old modal after 2 weeks

**Estimated Time**: 3-5 days

---

## Testing Strategy

### Manual Testing
1. Go to http://localhost:3000/txn/v2
2. Test each transaction type:
   - Expense (with/without cashback)
   - Income
   - Transfer
   - Debt (Lend)
   - Repayment
3. Test bulk mode with 5+ rows
4. Verify data in database

### Automated Testing
(Not yet implemented - recommended for future)

**Suggested Tests**:
- Form validation (Zod schema)
- Submission flow (mock server actions)
- Cashback calculation
- Tag sync logic

---

## Troubleshooting

### Issue: Cashback cycle badge not showing
**Cause**: Account is not a Credit Card or statement_day not configured
**Fix**: Check `account.service.ts` → `getAccounts` → `credit_card_info` mapping

### Issue: Tag not syncing with date
**Cause**: `useEffect` dependency issue
**Fix**: Check `basic-info-section.tsx` → `useEffect([occurred_at])`

### Issue: Bulk mode total incorrect
**Cause**: Empty rows or invalid amounts
**Fix**: Check `bulk-input-section.tsx` → `totalAmount` calculation

### Issue: Build fails
**Cause**: TypeScript errors or missing imports
**Fix**: Run `npm run build` and fix errors one by one

---

## Important Files to Know

### Core Files
- `transaction-slide-v2.tsx` - Main component, mode switching
- `types.ts` - All schemas and types
- `basic-info-section.tsx` - Date/Tag/Account logic

### Backend Files
- `src/services/transaction.service.ts` - Transaction CRUD
- `src/services/cashback.service.ts` - Cashback processing
- `src/actions/bulk-transaction-actions.ts` - Bulk creation

### Configuration Files
- `src/types/moneyflow.types.ts` - Global types (Account, Person, etc.)
- `src/lib/constants.ts` - System constants
- `src/lib/cycle-utils.ts` - Cashback cycle calculation

---

## Next Steps (Recommended Priority)

1. **Phase 2**: Integrate with Account/People cards (High Priority)
2. **Split Bill**: Complete the feature (Medium Priority)
3. **Main Integration**: Replace /transactions modal (High Priority)
4. **Modal Refactoring**: Unify all modals to slides (Low Priority)

---

## Resources

- **User Guide**: `.agent/guide.md`
- **Implementation Plan**: `.agent/implementation_plan.md`
- **Task Breakdown**: `.agent/task.md`
- **Project Rules**: `gravityrules.md`

---

## Contact / Questions

If you have questions about the implementation:
1. Check this handover guide first
2. Review the code comments
3. Check git history for context
4. Ask the team

---

**Last Updated**: 2026-01-18
**Handover From**: AI Assistant (Antigravity)
**Current Status**: Phase 1 Complete, Ready for Phase 2
