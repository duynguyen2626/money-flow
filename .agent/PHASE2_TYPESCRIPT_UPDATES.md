# Phase 2: TypeScript Type Updates

**Goal:** Update all TypeScript interfaces and type definitions to support new cycle columns (`debt_cycle_tag`, `statement_cycle_tag`)

**Status:** PLANNING

---

## Overview

Phase 1 added new columns to the database but kept old columns for backwards compatibility. Phase 2 updates TypeScript types to:

1. ✅ Add new fields to `Transaction` type
2. ✅ Document which fields are deprecated
3. ✅ Update service functions to use new columns
4. ✅ Add type-safe helpers for cycle tag operations

---

## Files to Update

### 1. `src/types/moneyflow.types.ts`
**Current Status:** Uses `TransactionRow` from database.types (auto-generated)
**Changes Needed:**
- Add documentation comments for cycle columns
- Create new types for cycle operations

**Location:** Line 1-10
```typescript
// Current
export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"]
export type Transaction = TransactionRow

// After Phase 2
export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"]
export type Transaction = TransactionRow & {
  // Cycle fields (auto-populated from TransactionRow)
  debt_cycle_tag?: string | null        // Kỳ nợ người (user-defined)
  statement_cycle_tag?: string | null   // Chu kỳ sao kê (auto-calculated)
}
```

### 2. `src/types/database.types.ts`
**Current Status:** Placeholder with `[key: string]: any` for transactions table
**Changes Needed:**
- Add explicit transaction table type with new columns

**Location:** Need to add transactions table definition
```typescript
transactions: {
  Row: {
    id: string
    // ... existing fields ...
    tag?: string | null                  // DEPRECATED: Use debt_cycle_tag
    persisted_cycle_tag?: string | null  // DEPRECATED: Use statement_cycle_tag
    debt_cycle_tag?: string | null       // NEW: Kỳ nợ người
    statement_cycle_tag?: string | null  // NEW: Chu kỳ sao kê
  }
  Insert: {
    id?: string
    // ... existing fields ...
    tag?: string | null
    persisted_cycle_tag?: string | null
    debt_cycle_tag?: string | null
    statement_cycle_tag?: string | null
  }
  Update: {
    id?: string
    // ... existing fields ...
    tag?: string | null
    persisted_cycle_tag?: string | null
    debt_cycle_tag?: string | null
    statement_cycle_tag?: string | null
  }
}
```

---

## Service Functions to Update

### 1. `src/services/cashback.service.ts`
**Uses:** `persisted_cycle_tag` (6 occurrences)

Current:
```typescript
// Line 195
if (transaction.persisted_cycle_tag !== resolvedTag) {
  await txnUpdate
    .update({ persisted_cycle_tag: resolvedTag })
}

// Line 354
.eq('persisted_cycle_tag', (cycle as any).cycle_tag)

// Line 645
const { data: tagTxns } = await txnsQuery.eq('persisted_cycle_tag', resolvedCycleTag);
```

After:
```typescript
// Line 195
if (transaction.statement_cycle_tag !== resolvedTag) {
  await txnUpdate
    .update({ statement_cycle_tag: resolvedTag })  // Keep tag for backwards compat
}

// Line 354
.eq('statement_cycle_tag', (cycle as any).cycle_tag)

// Line 645
const { data: tagTxns } = await txnsQuery.eq('statement_cycle_tag', resolvedCycleTag);
```

### 2. `src/services/debt-calculation.ts`
**Uses:** `tag` (16 occurrences)

Current:
```typescript
// Line 109
const tag = row.tag ?? 'UNTAGGED';

// Line 212
.sort((a, b) => compareTags(a.tag, b.tag));

// Line 230
.filter((d) => d.status !== 'settled' && creditItem.settled_tags!.includes(d.tag))

// Lines 246, 256, 278-283, 298-317, 327
// All use .tag
```

After:
```typescript
// Line 109
const tag = row.debt_cycle_tag ?? row.tag ?? 'UNTAGGED';

// Line 212
.sort((a, b) => compareTags(a.debt_cycle_tag || a.tag, b.debt_cycle_tag || b.tag));

// Line 230
const creditTag = creditItem.debt_cycle_tag || creditItem.tag;
.filter((d) => d.status !== 'settled' && creditItem.settled_tags!.includes(creditTag))

// All other places: Use debt_cycle_tag with fallback to tag
```

### 3. `src/services/people.service.ts`
**Uses:** `tag` (11 occurrences)

Current:
```typescript
// Line 284
const normalizedTag = normalizeMonthTag(txn.tag) ?? txn.tag

// Line 323, 464, etc
// All use .tag
```

After:
```typescript
// Line 284
const normalizedTag = normalizeMonthTag(txn.debt_cycle_tag || txn.tag) ?? (txn.debt_cycle_tag || txn.tag)

// Other places
const debtTag = txn.debt_cycle_tag || txn.tag;
```

### 4. `src/services/sheet.service.ts`
**Uses:** `tag` (3 occurrences)

Current:
```typescript
// Line 232
tag: txn.tag ?? undefined,

// Line 441
const cycleTag = txn.tag || getCycleTag(new Date(txn.occurred_at))
```

After:
```typescript
// Line 232
tag: txn.debt_cycle_tag ?? txn.tag ?? undefined,

// Line 441
const cycleTag = txn.debt_cycle_tag || txn.tag || getCycleTag(new Date(txn.occurred_at))
```

### 5. `src/services/account.service.ts`
**Uses:** `persisted_cycle_tag` (2 occurrences)

Current:
```typescript
// Line 128, 143
.in('persisted_cycle_tag', cycleTags)
```

After:
```typescript
// Use statement_cycle_tag with fallback
.in('statement_cycle_tag', cycleTags)
```

### 6. `src/services/bot-transaction.service.ts`
**Uses:** `tag` and `persisted_cycle_tag` (2 occurrences)

Current:
```typescript
// Line 84
tag: input.tag ?? null,

// Line 94
persisted_cycle_tag: null,
```

After:
```typescript
// Line 84
tag: input.tag ?? null,
debt_cycle_tag: input.tag ?? null,  // Backfill new column

// Line 94
persisted_cycle_tag: null,
statement_cycle_tag: null,  // Backfill new column
```

### 7. `src/services/dashboard.service.ts`
**Uses:** `tag` (3 occurrences)

Current:
```typescript
// Line 329
const tagValue = tx.tag

// Line 367, 370
tag: item.tag,
```

After:
```typescript
// Line 329
const tagValue = tx.debt_cycle_tag || tx.tag

// Line 367, 370
tag: item.debt_cycle_tag || item.tag,
```

---

## Implementation Strategy

### Step 1: Update Type Definitions
1. ✅ Add cycle columns to `database.types.ts` transactions table
2. ✅ Add documentation to `moneyflow.types.ts` for new fields
3. ✅ Create helper type for cycle tag operations

### Step 2: Update Service Functions (Fallback Pattern)
Use fallback pattern for backwards compatibility:
```typescript
// Always prefer new column, fallback to old
const debtCycleTag = transaction.debt_cycle_tag ?? transaction.tag;
const statementCycleTag = transaction.statement_cycle_tag ?? transaction.persisted_cycle_tag;
```

### Step 3: Update Database Queries
1. Update `.eq()`, `.in()` filters to use new columns
2. Update `.update()` calls to backfill both columns
3. Add comments with deprecation warnings

### Step 4: Add Type Safety Helpers
Create utility functions for type-safe cycle operations:
```typescript
// cycle-tag.utils.ts
export function getDebtCycleTag(txn: Transaction): string | null {
  return txn.debt_cycle_tag ?? txn.tag ?? null;
}

export function getStatementCycleTag(txn: Transaction): string | null {
  return txn.statement_cycle_tag ?? txn.persisted_cycle_tag ?? null;
}
```

---

## Test Cases for Phase 2

### Test 1: Type Check
```bash
pnpm type-check
# Expected: No type errors for cycle columns
```

### Test 2: Service Function Usage
Verify services still work with old data:
```typescript
// Legacy transaction (only has tag, persisted_cycle_tag)
const legacyTxn = { tag: '2026-02', persisted_cycle_tag: '2026-02', ... };
const debtTag = getDebtCycleTag(legacyTxn);  // Should return '2026-02'
const stmtTag = getStatementCycleTag(legacyTxn);  // Should return '2026-02'
```

### Test 3: New Data Usage
Verify services work with new columns:
```typescript
// New transaction (has both old and new columns)
const newTxn = { 
  tag: '2026-02', 
  debt_cycle_tag: '2026-02',
  persisted_cycle_tag: '2026-02', 
  statement_cycle_tag: '2026-02', 
  ... 
};
const debtTag = getDebtCycleTag(newTxn);  // Returns '2026-02'
const stmtTag = getStatementCycleTag(newTxn);  // Returns '2026-02'
```

### Test 4: Build Success
```bash
pnpm build
# Expected: Build succeeds with no errors
```

---

## Files Affected Summary

| File | Changes | Priority |
|------|---------|----------|
| `src/types/moneyflow.types.ts` | Add cycle field docs | HIGH |
| `src/types/database.types.ts` | Add transactions table type | HIGH |
| `src/services/cashback.service.ts` | 6 updates (statement_cycle_tag) | HIGH |
| `src/services/debt-calculation.ts` | 16 updates (debt_cycle_tag) | HIGH |
| `src/services/people.service.ts` | 11 updates (debt_cycle_tag) | MEDIUM |
| `src/services/account.service.ts` | 2 updates (statement_cycle_tag) | MEDIUM |
| `src/services/sheet.service.ts` | 3 updates (debt_cycle_tag) | MEDIUM |
| `src/services/bot-transaction.service.ts` | 2 updates (both columns) | MEDIUM |
| `src/services/dashboard.service.ts` | 3 updates (debt_cycle_tag) | LOW |

---

## Backwards Compatibility

✅ All changes maintain backwards compatibility:
- Old columns (`tag`, `persisted_cycle_tag`) remain in database
- Services use fallback pattern: `new_column ?? old_column`
- No breaking changes to function signatures
- Type definitions support both old and new columns

---

## Next Steps After Phase 2

1. ✅ Phase 2 Complete: TypeScript types updated and services refactored
2. → Phase 3: Update React Components & Server Actions
3. → Phase 4: Drop old columns after code migration complete

**Estimated Time:** 2-3 hours (systematic field-by-field replacement)
