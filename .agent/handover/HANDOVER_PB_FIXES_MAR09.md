# PB Migration Fixes - Mar 9, 2025

## Summary
Fixed 3 critical bugs discovered after initial PB migration, verified 2 existing behaviors, and documented 1 performance optimization opportunity.

## Bugs Fixed

### 1. ✅ Duplicate Records (Critical)
**Problem:** Re-running migration created duplicate PB records with same `source_id` but different IDs:
- `n99r9y300000000` (deterministic ID from backfill)
- `ona8dkddkr96b7m` (legacy record ID from cleanup)

**Root Cause:** 
- `backfillTransactions()` used deterministic `toPocketBaseId(source_id)`
- `cleanupLegacyTransactions()` patched existing records using their original PB IDs
- Result: 2 records with same `source_id`

**Fix:** Added deduplication check in `backfillTransactions()`:
```typescript
// Build map of existing PB records by source_id to avoid duplicates
const pbRecordsBySourceId = new Map<string, string>()
// Fetch all existing transactions from PB
// Map source_id → PB ID

// When backfilling, reuse existing ID if source_id already exists
const existingPbId = pbRecordsBySourceId.get(txn.id)
const pbId = existingPbId ?? toPocketBaseId(txn.id)
```

**Location:** `src/app/api/migrate/backfill/route.ts` lines 370-450

---

### 2. ✅ Wrong Est. Cashback Calculation
**Problem:** Est. Cashback showed `18,480,000 × 0.10% = 18,480` for lending transactions that have `cashback_share_fixed: 300000`.

**Root Cause:** 
Est calculation only checked `policy.rate`, never looked at `cashback_share_fixed` field.

**Fix:** Check `cashback_share_fixed` FIRST, then fall back to rate calculation:
```typescript
cycleCashbackRows.forEach((tx: any) => {
    const amountAbs = Math.abs(Number(tx?.original_amount ?? tx?.amount ?? 0))
    if (amountAbs <= 0) return

    // Check for explicit cashback_share_fixed first (lending/debt transactions)
    const shareFixed = Number(tx?.cashback_share_fixed ?? 0)
    if (shareFixed > 0) {
        est += shareFixed
        estDetailLines.push(`${numberFormatter.format(shareFixed)} (fixed)`)
        return
    }

    // Fall back to rate calculation
    const policy = resolveCashbackPolicy(...)
    const policyRate = Number(policy?.rate ?? 0)
    const baseVal = amountAbs * policyRate
    // ... rest of calculation
})
```

**Location:** `src/components/accounts/v2/AccountDetailHeaderV2.tsx` lines 257-289

---

### 3. ✅ UI Label Rename
**Problem:** Section header said "Cashback Performance" instead of "Cashback Health" per design spec.

**Fix:** Simple string replacement.

**Location:** `src/components/accounts/v2/AccountDetailHeaderV2.tsx` line 1198

---

## Behaviors Verified

### 4. ✅ Cycle Totals ARE Cumulative
**User Question:** "Công thức của cycle có đang tính cộng dồn không vậy?"

**Answer:** Yes! All cashback metrics use `reduce()` patterns that sum across ALL transactions in the cycle:
- **Est.** = `cycleCashbackRows.forEach((tx) => est += ...)`
- **Shared** = `cycleShareRows.reduce((sum, tx) => sum + resolvedShared, 0)`
- **Current Spend** = `cycleCashbackRows.reduce((sum, tx) => sum + amount, 0)`
- **Actual** = `cycleTransactions.reduce((sum, tx) => sum + cashback_income, 0)`

**Location:** `src/components/accounts/v2/AccountDetailHeaderV2.tsx` lines 257-341

---

### 5. ✅ Accounts Section Using PB
**User Question:** "Section Accionts đã xài PB chưa (receiver + account number)?"

**Answer:** Yes! `getAccounts()` uses PB via `executeWithFallback()`:
```typescript
export async function getAccounts() {
  return executeWithFallback(
    () => getPocketBaseAccountRows(),  // ← Primary: PB
    () => getSupabaseAccountRows()     // ← Fallback: SB
  )
}
```

`mapPocketBaseAccountRow()` reads both fields:
- `receiver_name: record.receiver_name || null` (line 74)
- `account_number: record.account_number || null` (line 66)

**Location:** `src/services/account.service.ts` lines 58-95, 352-360

---

## Performance Optimization Opportunity

### 6. ⚠️ Slow Cycle Loading
**User Report:** "Loading cycles..." shows for several seconds when switching cycles.

**Root Cause:** 
`getAccountSpendingStats()` makes **5+ sequential DB queries** per cycle switch:
1. Fetch account cashback config
2. Query `cashback_cycles` (resolved tag)
3. Query `cashback_cycles` (legacy tag fallback)
4. Query `categories` if categoryId provided
5. Query `transactions` by `persisted_cycle_tag`
6. Query `transactions` by legacy `tag` column
7. Additional queries for income transactions, cashback_entries, etc.

**Potential Optimizations:**
1. **Parallelize independent queries** using `Promise.all()`
2. **Client-side caching** - cache cycle stats in component state to avoid re-fetching
3. **Pagination** for large transaction sets
4. **Preload next/prev cycles** when user opens account detail
5. **Add loading skeleton** instead of blank screen during fetch

**Location:** `src/services/cashback.service.ts` lines 537-660, `src/app/api/cashback/stats/route.ts`

**Recommendation:** This requires significant refactoring. Consider implementing in separate performance optimization phase.

---

## Files Modified
1. `src/app/api/migrate/backfill/route.ts` - Added deduplication logic
2. `src/components/accounts/v2/AccountDetailHeaderV2.tsx` - Fixed Est calculation + UI label

## Migration Impact
- **Existing duplicates:** Will persist until manual cleanup (can delete older record by ID)
- **Future migrations:** No longer create duplicates
- **Est calculation:** Now shows correct values for lending/debt transactions
- **UI:** Cleaner terminology

## Next Steps
1. ✅ Committed + pushed to `feat/pb-refactor-clean-20260308`
2. ✅ PR link: https://github.com/rei6688/money-flow/pull/new/feat/pb-refactor-clean-20260308
3. ⚠️ Consider manual cleanup of existing duplicates (query by duplicate source_id, delete older record)
4. ⚠️ Performance optimization requires separate refactor phase

## Testing Checklist
- [x] Lint passes
- [x] Type check passes
- [x] Duplicate fix verified (no new duplicates on re-migration)
- [x] Est calculation shows fixed amounts correctly
- [x] UI label renamed
- [ ] Manual cleanup of existing duplicates (optional)
- [ ] Performance optimization (separate phase)
