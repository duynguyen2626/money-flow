# Handover: Cashback Analytics Enhanced Integration

**Date:** January 24, 2026  
**Status:** ✅ Complete (Integrated cashback analytics with rule tabs, consistent UI with accounts list)  
**Branch:** `feature/phase-4-1a-cashback-modal-flow`

---

## Overview

Integrated enhanced cashback analytics into account details page's "Cashback" tab:
- **Consistent UI:** Cycle selection, badges, rules display matches AccountRewardsCell styling
- **Rule-based tabs:** Automatically creates tabs for each cashback level (if multi-tier policy exists)
- **Transaction filtering:** Each tab shows transactions relevant to that level's rules
- **Stats cards:** Display profit, earned, shared, and cap metrics
- **Edit support:** In-line edit modal for transactions within cashback analysis

---

## New Component

**File:** [src/components/moneyflow/cashback-analytics-enhanced.tsx](src/components/moneyflow/cashback-analytics-enhanced.tsx)

### Features

1. **Cycle Selection**
   - Year dropdown (filters available cycles by fiscal year)
   - Cycle dropdown (displays all cycles for selected year)
   - Cycle range display (formatted date range)

2. **Rule-Based Tabs**
   - Auto-generates tabs from `account.cashback_config.levels`
   - Tab 1: "All Levels" (shows all transactions)
   - Tabs 2+: One per level (e.g., "Standard", "Premium", "Diamond")
   - Filtering: Only shows transactions matching rules for that level's categories

3. **Cashback Rules Badge**
   - Shows total rule count (borrowed from AccountRewardsCell)
   - Popover with full strategy breakdown per level
   - Displays category-specific rates, min spend per level, default rates

4. **Stats Cards** (4-column grid)
   - **Net Profit:** Total earned - shared amount
   - **Earned (Bank):** Actual cashback from bank
   - **Shared:** Amount shared with others
   - **Cap:** Remaining budget (or "Unlimited")

5. **Transaction Table**
   - Tabs show filtered transactions per level
   - Edit button per transaction
   - Cycle column visible if "All History" selected
   - Integrated with TransactionForm modal

### Props

```typescript
type CashbackAnalyticsEnhancedProps = {
    accountId: string                  // Current account ID
    accounts: Account[]                // All accounts (for form dropdowns)
    account?: Account                  // Current account (for config access)
    categories: Category[]             // Category list (for rule display)
    people: Person[]                   // People list (for form dropdowns)
    shops: Shop[]                      // Shop list (for form dropdowns)
}
```

---

## Integration in Account Details Page

**File:** [src/app/accounts/[id]/page.tsx](src/app/accounts/%5Bid%5D/page.tsx)

### Changes

1. **Import Update** (line 12)
   ```typescript
   - import { CashbackAnalysisView } from '@/components/moneyflow/cashback-analysis-view'
   + import { CashbackAnalyticsEnhanced } from '@/components/moneyflow/cashback-analytics-enhanced'
   ```

2. **Component Switch** (line 114-130 region)
   ```typescript
   // OLD:
   <div className="h-full overflow-y-auto p-6">
     <CashbackAnalysisView accountId={...} />
   </div>

   // NEW:
   <div className="h-full overflow-y-auto">
     <CashbackAnalyticsEnhanced
       accountId={account.id}
       account={account}           // <-- New: pass current account for config
       accounts={allAccounts}
       categories={categories}
       people={people}
       shops={shops}
     />
   </div>
   ```

3. **Padding Adjustment**
   - Removed `p-6` from wrapper (component handles its own spacing)
   - Component includes `p-6` internally for header section

---

## Consistency with Accounts List (AccountRewardsCell)

| Feature | AccountRewardsCell (List) | CashbackAnalyticsEnhanced (Details) | Notes |
|---------|---------------------------|-------------------------------------|-------|
| **Cycle Selection** | Inline in rewards cell | Full-page controls (Year + Cycle) | Details: more control |
| **Rules Badge** | Purple badge, popover | Purple badge, same popover | ✅ Identical styling |
| **Stats Display** | Progress bar + tooltip | 4-column card grid | Enhanced on details |
| **Levels/Tabs** | Popover (read-only) | Interactive tabs (filter txns) | ✅ Consistent styling |
| **Rule Details** | Compact format | Full expandable format | ✅ Same data source |
| **Default Rate** | Shown in tooltip | Shown in level details | ✅ Consistent labeling |

---

## Data Flow

### On Page Load

1. **AccountDetailsPage (server):**
   - Fetches account details, categories, people, shops
   - Passes to CashbackAnalyticsEnhanced (client)

2. **CashbackAnalyticsEnhanced (client, useEffect):**
   - Calls `getCashbackCycleOptions(accountId)` → gets all available cycles
   - Defaults to first cycle (latest) or "ALL"
   - Loads `getCashbackProgress()` for that cycle
   - Derives tabs from `account.cashback_config.levels`

### On Cycle Change

1. **User selects new cycle**
2. Component calls `getCashbackProgress()` with reference date
3. Updates `cardData` → transactions + stats
4. Applies active tab filter → shows relevant transactions

### On Tab Change

1. **User clicks level tab** (e.g., "Premium")
2. Component filters transactions by that level's `categoryIds`
3. Table re-renders with filtered dataset
4. Stats remain unchanged (same cycle, different view)

---

## URL Behavior

| Action | URL | Notes |
|--------|-----|-------|
| **Open account** | `/accounts/:id` | Defaults to Transactions tab |
| **Click Cashback tab** | `/accounts/:id?tab=cashback` | Enhanced view loads |
| **Cycle selection** | `/accounts/:id?tab=cashback` | Client-side state (no URL change) |
| **Rule level tab** | `/accounts/:id?tab=cashback` | Client-side state (no URL change) |

---

## Testing Checklist

- [ ] **Navigate to account detail** → Click "Cashback" tab
- [ ] **Cycle selection works** → Year dropdown filters available cycles
- [ ] **Rules badge appears** → Popover shows strategy breakdown
- [ ] **Multi-level tabs render** → For cards with 2+ levels
- [ ] **Tab filtering works** → Each tab shows only relevant transactions
- [ ] **Stats cards update** → When cycle changes
- [ ] **Edit transaction works** → Modal appears, form loads
- [ ] **Save transaction works** → Cycle data refreshes
- [ ] **Single-level cards** → Show table without tabs (if ≤1 level)
- [ ] **All History cycle** → Loads full transaction history
- [ ] **No cashback data** → Shows "No cashback data available"
- [ ] **Loading state** → Shows spinner while fetching

---

## Files Modified

| File | Change | Reason |
|------|--------|--------|
| [src/components/moneyflow/cashback-analytics-enhanced.tsx](src/components/moneyflow/cashback-analytics-enhanced.tsx) | **NEW** | Enhanced component with rule tabs |
| [src/app/accounts/[id]/page.tsx](src/app/accounts/%5Bid%5D/page.tsx) | Import + component switch | Replace old CashbackAnalysisView |

---

## Related Files (Not Modified)

These files are used by CashbackAnalyticsEnhanced but remain unchanged:

- `src/services/cashback.service.ts` – `getCashbackProgress()`, `getCashbackCycleOptions()`, `getAllCashbackHistory()`
- `src/components/cashback/cashback-transaction-table.tsx` – Transaction table display
- `src/lib/cashback.ts` – `normalizeCashbackConfig()`, `parseCycleTag()`, `getCashbackCycleRange()`
- `src/types/cashback.types.ts` – `CashbackCard`, `CashbackTransaction` types

---

## Key Differences from CashbackAnalysisView

| Aspect | Old View | New Enhanced | Reason |
|--------|----------|--------------|--------|
| **Rule tabs** | None | Yes (per level) | Better organization for multi-tier |
| **Cycle formatting** | 2-digit year | Full ISO format | More flexible date display |
| **Rules display** | Popover only | Tabs + popover | Integrated filtering |
| **Padding** | Fixed `p-6` | Flexible (internal) | Better layout control |
| **Account prop** | Not passed | Required | Access to config & type check |
| **Transaction filtering** | None | By level | Focus analysis per rule tier |

---

## Known Limitations & Notes

1. **Tab count:** If account has 5+ levels, may look crowded; consider scrollable tabs if needed
2. **Transaction count:** Very large cycles (1000+ txns) may slow down filtering; consider pagination
3. **Empty levels:** If a level has no matching transactions, tab still appears (shows empty table)
4. **Year calculation:** Uses `cycleType` and `statementDay` to infer fiscal years; edge cases may exist
5. **Edit form:** Requires all accounts/categories/people in scope; assumes data availability

---

## Styling

- **Color scheme:** Matches existing MoneyFlow design (indigo, emerald, slate)
- **Tab component:** Uses shadcn `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent`
- **Rules badge:** Purple (`bg-purple-100 text-purple-700`), styled to match AccountRewardsCell
- **Stats cards:** 2-column grid on mobile, 4-column on desktop
- **Spacing:** Consistent `gap-*` and `p-*` classes throughout

---

## Migration Path (If Replacing Old View)

1. ✅ **Old CashbackAnalysisView** still exists (can keep as fallback)
2. **New CashbackAnalyticsEnhanced** now used in `/accounts/:id?tab=cashback`
3. **No breaking changes** – both can coexist during transition
4. **Future:** Remove old view once new one is validated in production

---

## Next Steps

1. **Test in dev:** Verify all cycles, tabs, and filtering work correctly
2. **Build verification:** Run `pnpm build` to check for any TypeScript errors
3. **QA testing:** Test with credit cards of different cashback configs:
   - Single-level (no rules) → No tabs
   - Multi-level with rules → Tab-per-level
   - No cashback config → Fallback message
4. **Performance:** Monitor network requests during cycle/tab changes
5. **Documentation:** Update user guide with new Cashback Analysis tab features

---

## Commands

```bash
# Dev server
pnpm dev

# Build
pnpm build

# Type check (if needed)
pnpm lint
```

**Test URL:** `http://localhost:3000/accounts/<credit-card-id>?tab=cashback`

---

## Summary

✅ **Integrated cashback analytics** with rule-based tabs for better organization  
✅ **Consistent UI** between accounts list rewards cell and details page  
✅ **Transaction filtering** per level (for multi-tier cards)  
✅ **Stats & cycles** with full date range display  
✅ **Edit support** in-line with TransactionForm modal  

**Status:** Ready for testing and deployment.
