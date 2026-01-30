# Handover Document - Phase 9 (January 30, 2026)

## Completed Work

### 1. ✅ Header Redesign (PeopleHeader.tsx)
- **Avatar Shape Fixed**: Changed from `rounded-full` to `rounded-sm` (rounded square, not circular)
- **Separator Added**: Visual divider between "Current Cycle" section and "Balance" section with `border-r`
- **Icons Made Distinctive**: 
  - Current Cycle: `Calendar` icon (amber color) for cycle tracking
  - Balance: `TrendingUp` icon (emerald color) for total balance
- **Label Text Added**: Balance section now shows `Balance (Year)` or `Balance (All Time)` dynamically based on selected year
- **Font Fix**: Added `tabular-nums` class to prevent variable-width number rendering (no strikethrough zeros)
- **Progress Bar**: Percentages display inside bars only when >15% to avoid crowding

**File Modified**: [src/components/people/v2/PeopleHeader.tsx](src/components/people/v2/PeopleHeader.tsx)

### 2. ✅ Type Badge Positioning Fixed (unified-transaction-table.tsx)
- **Badge Order Corrected**: Type badges now appear AFTER debt/cycle badges instead of before
  - Old: `[typeBadge, debtBadge]`
  - New: `[debtBadge, typeBadge]`
- **Badge Style Consistency**: Type badges now use full text (IN, OUT, TF, DEBT, REPAY) instead of compact icon-only
  - Changed all `buildTypeBadge(txn.type, true)` → `buildTypeBadge(txn.type, false)`
- **Applied to All Scenarios**:
  - SCENARIO 1: Person context (viewing person page)
  - SCENARIO 2a: Account outbound (viewing source account, showing target)
  - SCENARIO 2b: Account inbound (viewing target account, showing source)

**File Modified**: [src/components/moneyflow/unified-transaction-table.tsx](src/components/moneyflow/unified-transaction-table.tsx)

---

## Outstanding Issues (NOT FIXED - Requires Deep Research/Investigation)

### Issue 1: Loading Indicator Not Visible on Cycle Switch
**Status**: ❌ NOT FIXED  
**Location**: [src/components/people/v2/TransactionControlBar.tsx](src/components/people/v2/TransactionControlBar.tsx) (Lines 87-102)

**Problem**:
- Loading indicator shows briefly (500ms timeout) but is not visible in practice
- The issue is that `isLoading` is cleared by a hardcoded timeout, NOT by actual data arrival
- User reports: "Only see 'Rendering' in bottom-left corner locally, won't show on Vercel at all"

**Root Cause Analysis**:
```tsx
// Current implementation (LINE 97-102)
useEffect(() => {
    if (!isLoading) return
    const timeout = setTimeout(() => setIsLoading(false), 500)  // ❌ HARDCODED TIMEOUT
    return () => clearTimeout(timeout)
}, [isLoading, activeCycle.tag, selectedYear])
```

The `isLoading` state is tied to a timeout dependency that clears it too quickly. The actual data fetch (via `onCycleChange` callback to parent component) may take longer than 500ms, so the loading indicator disappears before data arrives.

**What Needs Investigation**:
1. **Data Fetch Duration**: How long does `member-detail-view.tsx` actually take to fetch transaction data after cycle tag changes?
2. **Loading State Management**: Should `isLoading` be tied to:
   - A loading state from the parent component (member-detail-view)?
   - A data-arrival signal instead of timeout?
   - React Query/SWR cache invalidation completion?
3. **Network Visibility**: Check if loading indicator is even visible in production (CSS issues with z-index, backdrop-blur, etc.)

**Suggested Fix Direction**:
- Move loading state management to parent component ([src/app/people/details/member-detail-view.tsx](src/app/people/details/member-detail-view.tsx))
- Wait for actual data update before clearing `isLoading`
- OR: Increase timeout to 1500-2000ms and verify visibility with browser DevTools

---

### Issue 2: Sort Icons Missing on ALL Transaction Table Pages
**Status**: ❌ NOT FIXED  
**Affected Files**:
- [src/components/moneyflow/unified-transaction-table.tsx](src/components/moneyflow/unified-transaction-table.tsx) - Main /transactions page
- [src/components/moneyflow/unified-transaction-table-v2.tsx](src/components/moneyflow/unified-transaction-table-v2.tsx) - Account/People details pages

**Problem**:
- User reports: "Pic2: BASE and Net Value columns have no sort icons"
- Expected: Visible sort icons (▲▼) in column headers when sorting is active
- Expected: Tooltips showing "Sorted: Low to High" / "Sorted: High to Low" / "Click to sort"

**Investigation Needed**:
1. Verify if CustomTooltip wrapper is correctly applied to sort buttons
2. Check if sort buttons themselves are visible (check CSS, opacity, colors)
3. Verify tooltip content is displaying correctly
4. Test on actual deployed version (not just local)

**Code Locations to Check**:
- Lines 1444-1468: BASE amount sort button (unified-transaction-table.tsx)
- Lines 1469-1493: Net Value sort button (unified-transaction-table.tsx)
- Similar locations in unified-transaction-table-v2.tsx

---

### Issue 3: Cycle/Debt Badges Not Clickable on /transactions Page
**Status**: ❌ NOT FIXED  
**Location**: [src/components/moneyflow/unified-transaction-table.tsx](src/components/moneyflow/unified-transaction-table.tsx)

**Problem**:
- User reports: "Can't click badges (cycle, debt) in Flow column on /transactions page"
- Expected: Clicking badges should open filtered view in new tab (same behavior as account/people details pages)
- Actual: Badges appear but are not clickable

**Root Cause - RESEARCH NEEDED**:
1. **Badge Wrapping**: Check if `wrapBadgeWithFilter()` is properly wrapping cycle/debt badges in /transactions context
2. **Context Mismatch**: /transactions page might not have proper context information to generate filter URLs
3. **SCENARIO 3 Logic**: The standard view (SCENARIO 3) might have different badge handling that doesn't support clickability

**Code Analysis Required**:
- Check SCENARIO 3 in unified-transaction-table.tsx (Lines ~2750+) - "STANDARD VIEW (No Context or context mismatch)"
- Verify `buildTagFilterLink()` function works without context
- Check if badges are wrapped with `wrapBadgeWithFilter()` in SCENARIO 3

**Current Badge Status in /transactions**:
```
✅ Cycle badges: Visible but NOT CLICKABLE
✅ Debt badges: Visible but NOT CLICKABLE  
✅ Type badges: Just added, visibility needs verification
```

---

### Issue 4: Search Debt Functionality (Not Yet Started)
**Status**: ❌ NOT IMPLEMENTED  
**Location**: [src/components/people/v2/TransactionControlBar.tsx](src/components/people/v2/TransactionControlBar.tsx) (cycle dropdown section)

**Requirement**:
- Add search input inside cycle dropdown
- Filter cycles by month/year as user types
- Keep "All History" and "Back to Current" buttons above search results
- Maintain existing cycle selection/filtering

**Implementation Guide**:
1. Add `searchQuery` state to TransactionControlBar
2. Add `<Input>` component inside PopoverContent with search functionality
3. Filter `allCycles` array based on searchQuery (match tag like "2025-12")
4. Render filtered cycles in dropdown with selection handler

---

## Testing Checklist for Next Agent

Before attempting fixes, verify current state:

```
❌ Issue 1: Loading Indicator
  - [ ] Open /people/details page
  - [ ] Switch between cycle tabs
  - [ ] Look for backdrop overlay with spinner (should appear/disappear)
  - [ ] On Vercel, does it show at all?

❌ Issue 2: Sort Icons
  - [ ] Open /transactions page
  - [ ] Scroll to BASE Amount and Net Value column headers
  - [ ] Are sort icons (▲▼) visible?
  - [ ] Hover over sort icons - does tooltip appear?
  - [ ] Do same on account/people details pages

❌ Issue 3: Badge Clickability
  - [ ] Open /transactions page
  - [ ] Look at Flow column - do badges have hover effects?
  - [ ] Try clicking a cycle badge (yellow, e.g., "01-01~30-01")
  - [ ] Try clicking a debt badge (if visible)
  - [ ] Does new tab open? URL format correct?
```

---

## File Summary

### Modified Files (Phase 9)
1. **[src/components/people/v2/PeopleHeader.tsx](src/components/people/v2/PeopleHeader.tsx)**
   - Avatar shape: rounded-sm
   - Icon imports: Added Calendar, TrendingUp
   - Header layout: Separator, dynamic labels, tabular-nums

2. **[src/components/moneyflow/unified-transaction-table.tsx](src/components/moneyflow/unified-transaction-table.tsx)**
   - Type badge order: AFTER debt badges
   - Type badge style: Full text (false param)
   - All 3 scenarios updated (SCENARIO 1, 2a, 2b)

### Files Needing Investigation
1. [src/components/people/v2/TransactionControlBar.tsx](src/components/people/v2/TransactionControlBar.tsx) - Loading indicator issue
2. [src/app/people/details/member-detail-view.tsx](src/app/people/details/member-detail-view.tsx) - Data fetch timing
3. [src/components/moneyflow/unified-transaction-table.tsx](src/components/moneyflow/unified-transaction-table.tsx) - Sort icons, SCENARIO 3 badge clickability

---

## Notes for Next Agent

1. **Do NOT attempt fixes blindly**: All 3 remaining issues require detailed investigation first
2. **Performance**: Loading indicator issue might be a browser rendering/timing issue, not code issue
3. **Sort Icons**: Verify with browser DevTools (inspect element, check computed styles)
4. **Badge Clickability**: Likely requires refactoring SCENARIO 3 badge logic to include filter URL generation
5. **Documentation**: Create detailed investigation report before implementing any fixes

---

**Handover Date**: January 30, 2026  
**Phase**: 9 (Part 1 Complete, Part 2 Documented)  
**Status**: Ready for Next Agent Investigation
