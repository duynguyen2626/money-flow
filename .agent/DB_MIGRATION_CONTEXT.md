# DB Migration Context - Cashback Metrics Fix

## 🎯 Quick Summary
**Branch**: `feat/understanding-architecture-mar2026` (commits `04235f3`, `7bdfdaf`)  
**Issue**: Cashback metrics show **0** in header card despite transaction table showing correct values (Est=500k, Shared=300k, Profit=200k)  
**Root Cause**: `persisted_cycle_tag` field is **NULL** in DB → API queries return 0 transactions  
**Status**: ✅ Code fixed & committed | 🚧 Blocked by DB migration

---

## 📖 Required Reading (in order)

### 1. **Handover Document** (START HERE)
**File**: `.agent/handover/CASHBACK_METRICS_DB_MIGRATION.md`

**Why**: Complete context of the issue, includes:
- What changed in code (5 files)
- Why metrics show 0 (API vs UI data mismatch)
- SQL migration script to fix
- Testing checklist
- Troubleshooting guide

**Read time**: 5 min

### 2. **Service Layer** (understand API logic)
**File**: `src/services/cashback.service.ts`

**Focus on**:
- Line 636-695: `getAccountSpendingStats()` transaction queries
- 3 query attempts: `persisted_cycle_tag`, `tag`, date range
- All return 0 results → logs show "Transactions found: 0"

**Key insight**: API queries DB directly, UI loads ALL then filters client-side

### 3. **Header Component** (see how metrics display)
**File**: `src/components/accounts/v2/AccountDetailHeaderV2.tsx`

**Focus on**:
- Line 1127-1145: Metrics calculation using `dynamicCashbackStats` (from API)
- Line 189-245: `selectedCycleMetrics` useMemo (client-side fallback, not used now)
- Tooltips show calculation formulas (Est/Shared/Profit)

**Key insight**: Changed to use API as primary source instead of client calculation

---

## 🔴 Critical Issue

### The Problem
```sql
-- Current state in DB
SELECT count(*) FROM transactions WHERE persisted_cycle_tag IS NOT NULL;
-- Expected: ~1000s | Actual: 0 or very few
```

**Impact**: 
- `/api/cashback/stats?cycleTag=2026-02` returns all zeros
- Header card displays: Est=0, Shared=0, Profit=0, Earned %=0%
- But transaction table shows correct values (client-side works)

### Why This Happens
1. **UI path** (works ✅):
   - Server loads ALL transactions: `loadTransactions({ accountId, limit: 2000 })`
   - Client filters: `tx.persisted_cycle_tag || tx.derived_cycle_tag === selectedCycle`
   - Shows correct data in table

2. **API path** (fails ❌):
   - Direct DB query: `WHERE persisted_cycle_tag = '2026-02'`
   - Field is NULL → 0 matches → returns all zeros

---

## ✅ Solution (Your Task)

### Step 1: Verify Schema
Check if column exists in target DB:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name = 'persisted_cycle_tag';
```

**Expected**: Column exists, VARCHAR/TEXT type, nullable

### Step 2: Check Data Coverage
Count how many transactions need backfill:
```sql
SELECT 
  count(*) as total_transactions,
  count(persisted_cycle_tag) as tagged,
  count(*) - count(persisted_cycle_tag) as missing
FROM transactions
WHERE account_id IN (
  SELECT id FROM accounts WHERE type = 'credit_card'
);
```

**If missing >90%**: Proceed to Step 3

### Step 3: Run Backfill Migration
See **full SQL script** in `.agent/handover/CASHBACK_METRICS_DB_MIGRATION.md` (line 115-140)

**Quick version**:
```sql
UPDATE transactions t
SET persisted_cycle_tag = (
  SELECT 
    CASE 
      WHEN a.cb_cycle_type = 'calendar_month' THEN
        TO_CHAR(t.occurred_at, 'YYYY-MM')
      WHEN a.statement_day IS NOT NULL THEN
        TO_CHAR(
          (t.occurred_at + INTERVAL '1 day' * (a.statement_day - EXTRACT(DAY FROM t.occurred_at))),
          'YYYY-MM'
        )
      ELSE TO_CHAR(t.occurred_at, 'YYYY-MM')
    END
  FROM accounts a
  WHERE a.id = t.account_id
)
WHERE persisted_cycle_tag IS NULL;
```

### Step 4: Validate Fix
```bash
# Test API endpoint
curl "http://localhost:3002/api/cashback/stats?accountId=0ece401d-36eb-4414-a637-03814c88c216&cycleTag=2026-02"

# Expected response (non-zero values):
{
  "earnedSoFar": 500000,
  "sharedAmount": 300000,
  "netProfit": 200000,
  "currentSpend": 18480000,
  ...
}
```

### Step 5: Test in UI
1. Open: `http://localhost:3002/accounts/[accountId]?tag=2026-02`
2. Check header card: Est/Shared/Profit should show same as table
3. Hover tooltips: Should display detailed formulas
4. Progress bar: Should show ~100% (500k/500k)

---

## ⚠️ Important Notes

### DO NOT Modify These Files
Code is already fixed in commits `04235f3` and `7bdfdaf`. Your job is **DB migration only**:
- ✅ Run SQL migration to populate `persisted_cycle_tag`
- ✅ Verify data backfilled correctly
- ❌ Don't change TypeScript/React code

### Alternative Approach (if migration complex)
If calculating `persisted_cycle_tag` is too complex, you can modify API to use date range as primary:

**File**: `src/services/cashback.service.ts:636`
```typescript
// Option B: Skip tag queries, use date range directly
const { data: txns } = await supabase
  .from('transactions')
  .select('...')
  .eq('account_id', accountId)
  .gte('occurred_at', cycleRange.start.toISOString())
  .lte('occurred_at', cycleRange.end.toISOString());
```

But this requires accurate `cycleRange` calculation for all account types.

### Test Data Reference
Known working transaction:
- **Account**: VIB Super Card (ID: `0ece401d-36eb-4414-a637-03814c88c216`)
- **Cycle**: 2026-02 (statement: Jan 27 - Feb 26)
- **Transaction**: PNJ purchase, 18,480,000 VND
- **Expected metrics**: Est=500k, Shared=300k, Profit=200k

---

## 📊 Success Criteria

- [ ] `persisted_cycle_tag` populated for >95% of credit card transactions
- [ ] API returns non-zero values for cycle queries
- [ ] Header card metrics match transaction table values
- [ ] Progress bar shows correct percentage
- [ ] Tooltips display detailed calculation formulas
- [ ] No console errors when loading account detail page

---

## 🆘 If You Get Stuck

**Check server logs**:
```bash
# Look for these log lines
[getAccountSpendingStats] Transactions found by persisted_cycle_tag: X
[getAccountSpendingStats] Eligible transactions: X  # Should be >0
[getAccountSpendingStats] Earned so far: X  # Should be >0
```

**Verify cycle range calculation**:
- Statement day: 27 → Cycle 2026-02 = Jan 27 - Feb 26
- Transaction date: Feb 26 → Should match cycle 2026-02
- Check: `occurred_at BETWEEN cycleRange.start AND cycleRange.end`

**Common pitfalls**:
- Off-by-one errors in statement cycle calculation
- Timezone issues (UTC vs local time)
- NULL account.statement_day → falls back to calendar month

---

**Priority**: 🔴 CRITICAL  
**Estimated effort**: 30-60 min (migrate + test)  
**Blocked features**: Cashback analytics, cycle metrics, progress tracking
