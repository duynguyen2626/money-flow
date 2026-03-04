# HANDOVER: Account Detail – Cycle Filter & Cashback Performance Sync

**Date**: 2026-03-01  
**Phase**: 15 (In Progress)  
**Status**: ⚠️ INCOMPLETE – 2 issues remain  

---

## 🎯 Objective

Refine the filtering and date selection logic on the **account detail page** (`/accounts/[id]`):

1. Add a "Cycle" tab to the date filter that is always visible for credit cards
2. Show a **loading spinner** (not "No Cycles") while cycles load on first visit
3. Show **accurate cycle labels** (e.g. `27.01 - 26.02`) not raw ISO tags
4. Ensure the **Cashback Performance** header section reflects the **selected cycle** (dynamic, not the current cycle)
5. Reset to current cycle on F5 / back-navigation

---

## ✅ What Was Done (Completed)

### 1. `MonthYearPickerV2.tsx`
- **DONE**: Replaced `accountCycleTags: string[]` prop with `accountCycles: Array<{label, value}>` + `isLoadingCycles: boolean`
- **DONE**: Added loading spinner in Cycle tab content while `isLoadingCycles=true`
- **DONE**: `CycleGrid` now renders descriptive labels (`27.01 - 26.02`) not raw tags
- **DONE**: Fixed `useEffect` that still referenced deleted `accountCycleTags` variable → updated to `accountCycles`

### 2. `AccountDetailTransactions.tsx`
- **DONE**: Added `isLoadingCycles` state (`useState(false)`)
- **DONE**: Set `isLoadingCycles=true` before calling `fetchAccountCycleOptionsAction`, reset in `.finally()`
- **DONE**: Pass `accountCycles={cycles}` and `isLoadingCycles={isLoadingCycles}` to `MonthYearPickerV2`
- **DONE**: `cycles` state is now `Array<{label, value}>` (was `string[]`)

### 3. `AccountDetailHeaderV2.tsx`
- **DONE**: Fixed malformed fetch URL in cashback stats API call
- **DONE**: Added `formatShortNumber` helper function
- **DONE**: Improved footer badges: combined Limit+Target, added dynamic "Missing" badge
- **DONE**: Swapped Actual ↔ Profit visual positions
- **DONE**: Added comprehensive `i` tooltip with "Cashback Performance Report"

### 4. `cashback.service.ts` → `getAccountSpendingStats`
- **DONE**: Changed cycle query from `.eq('persisted_cycle_tag', cycleTag)` to `.or('persisted_cycle_tag.eq.X,tag.eq.X')` for dual-column matching

### 5. `cashback.types.ts`
- **DONE**: Added `estYearlyTotal?: number` to `AccountSpendingStats` type

### 6. `AccountDetailTransactions.tsx` – Tooltip import
- **DONE**: Added missing `Tooltip, TooltipContent, TooltipProvider, TooltipTrigger` imports

---

## ❌ Remaining Issues (Next Agent Must Fix)

### Issue 1: Date Picker Display Shows ISO Tag, Not Label

**Symptom**: After selecting cycle `27.01 - 26.02` in the dropdown, the trigger button still shows `2026-01` (the raw ISO tag `selectedCycle`) instead of the descriptive label.

**Root Cause**: In `MonthYearPickerV2.tsx` line ~158:
```tsx
// CURRENT (WRONG):
if (mode === 'cycle' && selectedCycle) return selectedCycle === 'all' ? 'All Cycles' : selectedCycle
```
This returns `selectedCycle` which is the ISO tag (e.g. `2026-01`), not the label.

**Fix Needed**:
```tsx
// PROPOSED FIX:
if (mode === 'cycle' && selectedCycle) {
  if (selectedCycle === 'all') return 'All Cycles'
  // Look up label from accountCycles
  const found = accountCycles?.find(c => c.value === selectedCycle)
  return found?.label ?? selectedCycle
}
```

**File**: `src/components/transactions-v2/header/MonthYearPickerV2.tsx`  
**Line**: ~158 (in the `displayText` computed block)

---

### Issue 2: Cashback Performance Data Always Shows 0 / Doesn't Reflect Selected Cycle

**Symptom**: On the header's Cashback Performance section, the data (Cycle Earned, Profit, Shared, etc.) always shows 0, even when selecting a different cycle from the dropdown. The "Period" badge also shows the current cycle range instead of the selected one.

**Root Cause – Two sub-issues**:

#### 2a. `AccountDetailHeaderV2` fetches stats using wrong date
In `AccountDetailHeaderV2.tsx` around line 175:
```tsx
const cycleDate = new Date(year, month - 1, 10) // day=10, arbitrary middle of month
```
The API `getAccountSpendingStats` uses this date to `getCashbackCycleRange(config, referenceDate)`.

For a **statement cycle** (e.g., statementDay=26), passing `month=01, day=10` results in the range `Dec 26 → Jan 25` (the cycle ending in January), not the cycle with `tag=2026-01` which ends `Jan 26`.

**Fix needed**: Use the last day of the selected month as the reference date so it falls within the correct statement cycle:
```tsx
// For tag "2026-01" where statementDay=26:
// We want date to fall within range Dec 27 - Jan 26
// Use day=25 (or statementDay-1) of the tag month
const cycleDate = new Date(year, month - 1, 25) // Use near end of tag month
```
Or better: **pass the cycle tag directly to the API** and resolve it server-side instead of reconstructing from year/month.

#### 2b. `getAccountSpendingStats` date resolution is fragile
The service function `getAccountSpendingStats` in `src/services/cashback.service.ts` around line 540:
```ts
export async function getAccountSpendingStats(accountId: string, date: Date, ...)
```
It uses `getCashbackCycleRange(config, date)` to determine the cycle. For statement cycles, this is based on the reference date position relative to `statementDay`, which breaks if the client sends a date in the wrong part of the month.

**Better Fix**: Extend the API and service to accept an explicit `cycleTag` parameter:
```ts
// In route.ts:
const cycleTag = url.searchParams.get('cycleTag') ?? undefined

// In cashback.service.ts:
export async function getAccountSpendingStats(accountId, date, categoryId, cycleTag?) {
  // If cycleTag provided, look up the cycle directly from DB:
  if (cycleTag) {
    cycle = await supabase.from('cashback_cycles').select('*')
      .eq('account_id', accountId).eq('cycle_tag', cycleTag).maybeSingle()
    // Also calculate cycleRange from config + parseCycleTag(cycleTag)
  }
}
```

**Files to Edit**:
- `src/app/api/cashback/stats/route.ts`: Accept `cycleTag` query param
- `src/services/cashback.service.ts` → `getAccountSpendingStats`: Handle explicit `cycleTag` 
- `src/components/accounts/v2/AccountDetailHeaderV2.tsx`: Pass `&cycleTag=${selectedCycle}` in fetch URL

---

## 🗺️ Data Flow Summary

```
User selects cycle in MonthYearPickerV2
    → handleCycleChange(tag) in AccountDetailTransactions
        → setSelectedCycle(tag) via onCycleChange prop
        → Updates URL: ?tag=2026-01
    → selectedCycle prop passed up to AccountDetailViewV2
        → passed to AccountDetailHeaderV2 as selectedCycle prop
    → AccountDetailHeaderV2 useEffect fires on selectedCycle change
        → Fetches /api/cashback/stats?accountId=&date=...  (BUG: wrong date)
        → Sets dynamicCashbackStats
    → Header renders with dynamicCashbackStats
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/components/transactions-v2/header/MonthYearPickerV2.tsx` | Date/Cycle picker UI |
| `src/components/accounts/v2/AccountDetailTransactions.tsx` | Transaction list + filter state |
| `src/components/accounts/v2/AccountDetailHeaderV2.tsx` | Credit card header with cashback |
| `src/components/accounts/v2/AccountDetailViewV2.tsx` | Parent shell, passes selectedCycle up/down |
| `src/app/api/cashback/stats/route.ts` | REST API for spending stats |
| `src/services/cashback.service.ts` → `getAccountSpendingStats` | Core stats calculation |
| `src/actions/cashback.actions.ts` → `fetchAccountCycleOptionsAction` | Fetches cycle list |

---

## 🧪 Test Scenarios

After fixes, verify:
1. Navigate to VIB credit card: `/accounts/0ece401d-36eb-4414-a637-03814c88c216`
2. Page should auto-select **current cycle** immediately on load (no white flash)
3. Date picker button shows **`27.01 - 26.02`** (not `2026-01`)
4. Select cycle `27.02 - 26.03` → header stats MUST update to reflect that cycle's data
5. "Period" badge in Cashback Performance must match selected cycle range
6. F5 refresh → should still show current cycle
7. Navigate away and back → should reset to current cycle

---

## 📎 Related Docs

- `.agent/CASHBACK_WORKFLOW.md` – Core cashback business rules
- `.agent/prompts/onboarding.md` – Project onboarding
- `.agent/rules/rules.md` – Coding standards
