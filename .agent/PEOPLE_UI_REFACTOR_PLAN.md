# People & Details UI Refactor Plan

**Branch**: `refactor/people-details-ui`  
**Date**: 2026-01-23  
**Status**: Planning Phase

---

## PART A: People Details Page Redesign

### Current Issues
1. **Fragmented Header**: Person name, Timeline selector, Split Bill, Edit scattered
2. **Poor Timeline UI**: All year filter + "JAN:7,142,977...JUN:No Data...More" - confusing
3. **Bad Table Header**: Not modern, action column has extra spacing
4. **Cluttered Info Section**: "JAN +1 Paid | Original | Cashback | Net Lend | Repay" - too crowded
5. **Button Confusion**: Rollover icon looks like sync, no quick sheet link
6. **Bugs**:
   - "+1 Paid" shows wrong value (should match selected month)
   - Clicking month doesn't update paid indicator correctly

### A1: Unified Header Section
**Goal**: Consolidate scattered controls into clean header

```
┌─────────────────────────────────────────────┐
│ ← | [Avatar] Name  [Badges] [Edit] [Split]  │
│    Status: SETTLED | Sheet Link [↗]         │
└─────────────────────────────────────────────┘
```

**Changes**:
- Combine: Person name + avatar + status in left side
- Right side: Badges (SETTLED), Edit button, Split Bill, Sheet link icon
- Remove scattered controls
- Status badge color: Green (settled), Red (owes you), Blue (you owe them)

### A2: Timeline/Month Selector Section
**Goal**: Clean month filter with visual feedback

```
┌─────────────────────────────────────────────┐
│ Year: [2026▼]  Month: [Jan ▼]               │
│ Financial Summary:                          │
│  In (Gross): 7,286,891 | Cashback: 143,914 │
│  Net Lend: 7,142,977 | Remains: 7,142,977  │
└─────────────────────────────────────────────┘
```

**Changes**:
- Replace "All year JAN:7,142,977...JUN:No Data...More" with dropdown selectors
- Move financial numbers into clear labeled section
- 2 rows: Year/Month selectors on top, Summary stats below
- Summary cards in grid: In(Gross) | Cashback | Net Lend | Remains

### A3: Improved Table Header
**Goal**: Modern, spacious, clear column alignment

```
Current:
┌────┬──────────────────┬──────────┬──────────┐
│    │ Date             │ Note     │ ... [Action icons crowded] │
└────┴──────────────────┴──────────┴──────────┘

New:
┌────┬────────┬────────────┬─────────┬──────────┬──────────┐
│ ▢  │ Date   │ Note       │ Category│ Amount   │ Action   │
└────┴────────┴────────────┴─────────┴──────────┴──────────┘
```

**Changes**:
- Remove extra spacing on right (action column)
- Use grid layout for cleaner alignment
- Icons in action column: Edit, Copy, Delete (no extra padding)
- Header: bold, slightly darker background

### A4: Consolidate Transaction Summary Section
**Goal**: Unify "Paid" info with proper structure

```
Current layout problem:
JAN  +1 Paid  | Original: 7,286,891 | Cashback: 143,914 | 
Net Lend: 7,142,977 (7.3M - 143.9K) | Repay: 0 | Remains: 7,142,977

New layout:
┌─────────────────────────────────────────────┐
│ [2026-01]  Paid: 1 txn  Original: 7,286,891 │
├─────────────────────────────────────────────┤
│ Cashback: 143,914 | Net Lend: 7,142,977    │
│ Remaining: 7,142,977 | Repay: 0             │
└─────────────────────────────────────────────┘
```

**Changes**:
- Move "+1 Paid" to month badge (2026-01)
- Structure: Month badge + Paid count | Original amount
- Below: 2 rows of metrics (Cashback | Net Lend, Remaining | Repay)
- Add icon explanations: ⓘ tooltip on hover

### A5: Fix Month-Paid Tracking Bug
**Root Cause**: "+1 Paid" always shows Jan data, doesn't follow month selection

**Fix**:
- Track selected month in state
- Filter transactions by selected month
- Show count only for that month
- Update all metrics when month changes

---

## PART B: People List Table Redesign

### Current Issues
1. **Too Many Columns**: Name, Subs, Debt Tag, Current Debt, Current, Entire Base, Entire Repaid, Remains, Actions
2. **Inconsistent Badges**: Subs below name (hard to interact), Debt Tag as column
3. **Duplicate Columns**: "Current Debt" + "Current" = same thing
4. **Wrong Calculation**: Entire Repaid not summing correctly
5. **Poor Debt Tracking**: No way to see multiple outstanding debt periods

### B1: Consolidate Columns
**Goal**: Reduce from 9 columns to 6

```
Old Layout:
┌──┬────────────┬──────────┬──────────┬──────────┬────────────┬────────┬──────┬──────────┐
│  │ Name       │ Subs     │ Debt Tag │ Current  │ Entire     │ Entire │ Rem  │ Actions  │
│  │            │          │          │ Debt     │ Base       │ Repaid │      │          │
└──┴────────────┴──────────┴──────────┴──────────┴────────────┴────────┴──────┴──────────┘

New Layout:
┌──┬────────────────┬────────────┬────────────┬────────────┬──────┐
│  │ Name           │ Status     │ Entire Base│ Remaining  │ Act  │
│  │ [Badges] [Sub] │ [Debt Tags]│            │            │      │
└──┴────────────────┴────────────┴────────────┴────────────┴──────┘
```

**Changes**:
- Keep: Name, Status (Settled/Owes/Owed), Entire Base, Remaining, Actions
- Remove: Subs column, Current Debt (merge to Status), Debt Tag (merge to Status as badges)
- Entire Repaid: Remove or move to details page

### B2: Integrate Subs + Status Badges into Name
**Goal**: Rich info in Name cell without clutter

```
┌─────────────────────┐
│ [CA] C Ánh          │  ← Name + Avatar
│ [Sheet] [+2 Slots]  │  ← Badges: sheet link, sub count
└─────────────────────┘
```

**Changes**:
- Name cell: Avatar + Name in same line
- Badges below name (same row): [Sheet icon] [+2 Slots badge]
- Hover sheet icon: tooltip "Open sheet in new tab"
- Easy to see subs at a glance

### B3: Debt Tags as Badges with Modal
**Goal**: Show multiple debt periods with quick view

```
Status Column:
┌────────────────────────┐
│ SETTLED                │  ← No debt
│ OWES [2026-01] [+1]    │  ← 1 debt period + 1 more
│ YOU OWE [2026-01]      │  ← Only 1 period
└────────────────────────┘

Click [+1]:
Modal shows:
┌──────────────────────┐
│ Outstanding Periods  │
├──────────────────────┤
│ □ 2026-01 (Selected) │  ← Click to go to this timeline
│ □ 2025-12           │
│ □ 2025-11           │
└──────────────────────┘
```

**Changes**:
- Status column shows: Color + Status text + Debt badge [2026-01] + Count [+X]
- Click [+X] → Modal listing all debt periods
- Click period → Navigates to details page with that month selected
- Visual distinction: Settled (grey), You Owe (blue), Owe You (red)

### B4: Unify Current / Current Debt
**Decision**: Keep only "Current Debt" (rename to "Outstanding")
- Show net debt for latest month
- Clear meaning: positive = they owe you, negative = you owe them

### B5: Fix Entire Repaid Calculation
**Current Bug**: Sum of all "In" transactions not matching
**Fix**: Verify formula in sheet service or database query

---

## PART C: User Experience Improvements

### C1: Open Details in New Tab
**Changes**:
- Person name click → `target="_blank"` on link
- Sheet icon click → Opens sheet in new tab
- Debt badge click → Opens details in new tab with month pre-selected

**Implementation**:
```tsx
// In people-row-v2.tsx
<Link href={`/people/details?ids=${person.id}`} target="_blank">
  {person.name}
</Link>
```

---

## Implementation Order

### Phase 1: People List (B1-B5)
1. **B1**: Remove columns, rename "Current Debt" → "Outstanding"
2. **B2**: Move subs badges into Name cell
3. **B3**: Convert Debt Tag column to Status badges + Modal
4. **B4**: Verify Outstanding calculation
5. **C1**: Add `target="_blank"` to links

### Phase 2: Details Page (A1-A5)
1. **A1**: Consolidate header (person name + edit + split)
2. **A2**: Redesign timeline/month selector
3. **A3**: Fix table header spacing + alignment
4. **A4**: Reorganize financial summary cards
5. **A5**: Fix month-paid tracking bug

---

## Component Files to Modify

### People List
- `src/components/people/v2/people-row-v2.tsx` (main table row)
- `src/components/people/v2/people-directory-v2.tsx` (table wrapper)

### Details Page
- `src/app/people/[id]/details/member-detail-view.tsx` (main layout)
- `src/app/people/[id]/details/month-selector.tsx` (new: timeline selector)
- `src/app/people/[id]/details/transaction-summary.tsx` (new: financial summary)
- `src/app/people/[id]/details/transaction-detail-table.tsx` (table component)

### New Components
- `src/components/people/debt-periods-modal.tsx` (debt periods list)

---

## Visual Mockups (ASCII)

### Final People List Row
```
┌──┬──────────────────────┬────────────────────┬────────────┬────────────┬──────┐
│  │ [CA] C Ánh           │ SETTLED            │ 14,345,827 │ 143,914    │ [→]  │
│  │ [Sheet] [+2 Slots]   │                    │            │            │      │
└──┴──────────────────────┴────────────────────┴────────────┴────────────┴──────┘

Status Options:
  SETTLED (grey)
  OWES [2026-01] [+1] (red) → click [+1] for modal
  YOU OWE [2026-01] (blue)
```

### Final Details Header
```
┌────────────────────────────────────────────────────────────┐
│ ← │ [CA] C Ánh (SETTLED) │ [Edit] [Split Bill] [Sheet→]  │
└────────────────────────────────────────────────────────────┘

Year [2026▼]  Month [Jan▼]
Financial Summary:
  In (Gross): 7,286,891 │ Cashback: 143,914
  Net Lend: 7,142,977   │ Remains: 7,142,977
```

---

## Success Criteria
- ✅ People list shows max 6 columns (clean)
- ✅ Details page header unified (no scattered controls)
- ✅ Month selection updates all metrics correctly
- ✅ Debt badges show multiple periods
- ✅ No extra spacing on action column
- ✅ Links open in new tab
- ✅ No 404 errors on navigation
- ✅ Consistent UI across list & details

