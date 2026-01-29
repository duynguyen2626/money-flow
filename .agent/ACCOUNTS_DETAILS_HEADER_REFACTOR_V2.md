# Account Details Filter Bar & Header Refactor - V2

**Status:** ✅ Completed
**Date:** January 29, 2026
**Branch:** `refactor-accounts-details-header-v2`
**Scope:** Account details page filter bar redesign with enhanced UX and consistency with /transactions page

## Overview

Complete refactor of the account details filter bar to match the `/transactions` page pattern, including:
- Hover-based dropdown Clear button (like Add button)
- Working paste button with clipboard API
- Clear X icon inside search input
- Clear Filter vs Clear All separation with modal confirmation
- beforeunload warning when filters active (F5/close tab)
- Disabled Filter button until filters selected
- QuickFilterDropdown for People/Accounts with search capability
- Proper image rounding (accounts: rounded-sm, people: rounded-full)
- Consistent red destructive color for Clear buttons on both pages

## Files Changed

### New Components Created
1. **src/components/accounts/v2/AccountDetailTransactions.tsx**
   - Main component for account details transactions
   - Manages filter state, filtering logic, and UI
   - Clear confirmation modal (AlertDialog)
   - beforeunload warning for active filters

2. **src/components/accounts/v2/AccountDetailViewV2.tsx**
   - Wrapper component for account details view

3. **src/components/accounts/v2/AccountDetailFilterBar.tsx**
   - Filter controls section

4. **src/components/accounts/v2/AccountDetailControlBar.tsx**
   - Control bar for status and filter buttons

5. **src/components/accounts/v2/AccountDetailAddDropdown.tsx**
   - Add transaction dropdown for account details

6. **src/components/accounts/v2/AccountDetailHeaderV2.tsx**
   - Header component for account details

### Components Modified

#### TransactionHeader.tsx
- Added Clipboard import for paste functionality
- Added paste button to search input (left side, clickable)
- Added clear X icon inside search (right side, shows when text present)
- Integrated clipboard.readText() API with error handling
- Disabled search button when input empty
- Updated ClearDropdownButton to show confirmation for "Clear All" option
- Both "Clear Filter" and "Clear All" now require confirmation via AlertDialog

#### QuickFilterDropdown.tsx
- Added optional `type?: 'person' | 'account'` to QuickFilterItem interface
- Image rounding based on type:
  - `rounded-sm` for accounts (rounded square)
  - `rounded-full` for people (circle)
- Updated both trigger button and dropdown content to use conditional rounding

#### AccountDetailTransactions.tsx (New)
- Complete filter management with local state:
  - `filterType`: Transaction type filter (all/income/expense/lend/repay/transfer/cashback)
  - `statusFilter`: Status filter (active/void/pending)
  - `selectedTargetId`: People or Account target (with person-/account- prefix)
  - `selectedCycle`: Credit card cycle
  - `dateMode`: Month/range/date picker mode
  - `searchTerm`: Search input value
  - `isFilterActive`: Filter application state
- `hasAnyFilterSelected`: Computed state to disable Filter button until filters selected
- Filter application logic:
  - Only applies when isFilterActive = true
  - Filters include: status, type, search, target, cycle, date
- Clear confirmation modal with two options:
  - "Clear Filter": Resets filters, keeps search (keeps searchTerm)
  - "Clear All": Resets all filters AND search (clears searchTerm)
- beforeunload event listener:
  - Warns user on F5/refresh when filters active
  - Warns on tab close when filters active
  - Auto cleanup on unmount
- ClearDropdown component:
  - Hover-based popover (120ms delay before closing)
  - Icons: FilterX for "Clear Filter", Trash2 for "Clear All"
  - Hint text: "Keep search" and "Including search"
  - Opens modal confirmation when clicked
- QuickFilterDropdown usage for People and Accounts separately:
  - Each has built-in search functionality
  - Proper image rounding (accounts: rounded-sm, people: rounded-full)
  - Clear X icon in dropdown trigger when selected

### UI/Color Standardization
- **Clear Button Color:** Both pages now use `variant="destructive"` (red)
- **Clear Button Styling:** Added `font-medium` for consistency
- **Modal Dialogs:** Both pages use AlertDialog for confirmations
- **Paste Icon:** Clipboard icon (left side of search)
- **Clear Icon:** X icon (right side of search, conditional display)
- **Search Button:** Disabled when input empty

## Key Features

### 1. Hover-Based Clear Dropdown
```
- No click needed to see options
- Hover over Clear button → 120ms delay → dropdown shows
- Click option → Modal confirmation appears
- Same pattern as Add Transaction button
```

### 2. Search with Paste Button
```
- Left side: Clipboard icon (clickable)
- Right side: X icon (when text present) + Search button
- Clipboard.readText() with permission handling
- Search button disabled when input empty
```

### 3. Clear Actions
```
- Clear Filter: Resets filters, keeps search
- Clear All: Resets filters AND search
- Both open modal confirmation
- Modal explains action consequence
```

### 4. beforeunload Warning
```
- Listens to window.beforeunload event
- Triggers when isFilterActive = true
- Shows browser's native "Leave page?" dialog
- Prevents accidental navigation with active filters
```

### 5. Filter Activation State
```
- hasAnyFilterSelected computed state
- Filter button disabled until any filter selected
- User selects filter → button enables → clicks Filter → modal opens
```

## Component Structure

```
AccountDetailTransactions (main)
├── ClearDropdown (popover with hover)
│   ├── Clear Filter option
│   └── Clear All option
├── Filter Button (disabled until filters selected)
├── Type Filter (TypeFilterDropdown with built-in X)
├── People Filter (QuickFilterDropdown)
├── Accounts Filter (QuickFilterDropdown)
├── Cycle Filter (CycleFilterDropdown with built-in X)
├── Date Picker (MonthYearPickerV2)
├── Search Bar
│   ├── Clipboard paste icon (left)
│   ├── Clear X icon (right, conditional)
│   └── Search button (right, disabled when empty)
├── UnifiedTransactionTable (filtered results)
├── TransactionSlideV2 (add transaction)
└── AlertDialog (clear confirmation)
```

## State Management

### Filter State
```typescript
const [filterType, setFilterType] = useState<FilterType>('all')
const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
const [selectedTargetId, setSelectedTargetId] = useState<string | undefined>()
const [selectedCycle, setSelectedCycle] = useState<string | undefined>()
const [date, setDate] = useState<Date>(new Date())
const [dateRange, setDateRange] = useState<DateRange | undefined>()
const [dateMode, setDateMode] = useState<'month' | 'range' | 'date'>('month')
const [searchTerm, setSearchTerm] = useState('')
const [isFilterActive, setIsFilterActive] = useState(false)
```

### Computed State
```typescript
const hasAnyFilterSelected = useMemo(() => {
  return (
    filterType !== 'all' ||
    selectedTargetId !== undefined ||
    selectedCycle !== undefined
  )
}, [filterType, selectedTargetId, selectedCycle])
```

### Confirmation Modal State
```typescript
const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false)
const [clearType, setClearType] = useState<'filter' | 'all'>('filter')
```

## UX Flow

### Filtering
1. User selects Type, Target, Cycle, or Date filters
2. Filter button becomes enabled (hasAnyFilterSelected = true)
3. User clicks "Filter" button
4. isFilterActive = true
5. Transactions table updates with filtered results
6. Filter button changes to "Clear" (red)

### Clearing Filters
1. User hovers over Clear button
2. Dropdown appears with "Clear Filter" and "Clear All" options
3. User clicks either option
4. Modal confirmation appears with explanation
5. User confirms → filters cleared
6. Modal closes
7. isFilterActive = false
8. Filter button reverts to "Filter" state
9. Toast shows "Filters cleared" or "All filters and search cleared"

### Search
1. User types or pastes into search input
2. Search button becomes enabled
3. User presses Enter or clicks Search button
4. Filter is applied (search is part of filtering)
5. X icon shows in search input
6. User can click X to clear search only (without opening modal)

### beforeunload Warning
1. Filters are active (isFilterActive = true)
2. User tries to refresh page (F5) or close tab
3. Browser shows native "Are you sure?" dialog
4. User confirms → page reloads/closes
5. Warning only shows if filters actually active

## Consistency Between Pages

Both `/accounts/[id]` (account details) and `/transactions` now have:
- ✅ Same filter pattern (Type, Status, Target, Cycle, Date)
- ✅ Same search functionality (paste button + clear icon)
- ✅ Same clear button color (red/destructive)
- ✅ Same modal confirmations for clear actions
- ✅ Same image rounding (accounts rounded-sm, people rounded-full)
- ✅ Same hover patterns (Clear dropdown, Add dropdown)
- ✅ Same beforeunload warning behavior

## Testing Coverage

### Manual Testing
1. **Filter Selection:**
   - Select each filter type (Type, Target, Cycle, Date)
   - Verify Filter button enables/disables correctly
   - Verify filtering applies when Filter button clicked

2. **Search:**
   - Type text in search input
   - Press Enter → should apply filter
   - Click search button → should apply filter
   - Click X to clear → search only clears (modal doesn't appear)
   - Use paste button to paste from clipboard

3. **Clear Actions:**
   - Hover over Clear button → dropdown appears
   - Click "Clear Filter" → modal appears → confirm → filters clear, search kept
   - Click "Clear All" → modal appears → confirm → all clear
   - Verify toast messages show

4. **beforeunload:**
   - Set filters to active
   - Try to refresh page (F5) → browser warning
   - Try to close tab → browser warning
   - No warning when filters inactive

5. **Image Rounding:**
   - People avatars: should be circular (rounded-full)
   - Account avatars: should be rounded square (rounded-sm)

### Automated Testing
Run scoped tests:
```bash
pnpm test -- AccountDetailTransactions
pnpm test -- QuickFilterDropdown
pnpm test -- TransactionHeader
```

## Code Quality

- ✅ TypeScript: 0 errors
- ✅ ESLint: No critical errors (warnings only for existing img tags)
- ✅ Build: Successful
- ✅ No `any` types (proper generics used)
- ✅ Proper error handling (clipboard permissions, clipboard API errors)
- ✅ Event listener cleanup (beforeunload effect cleanup)

## Breaking Changes

None - This is a refactor that maintains backward compatibility while improving UX.

## Migration Guide

For developers using `AccountDetailTransactions`:
- Import from `src/components/accounts/v2/AccountDetailTransactions.tsx`
- Pass required props: account, transactions, accounts, categories, people, shops
- Component manages all filter state internally
- No need to handle filter state in parent

## Future Improvements

1. Persist filter state to localStorage
2. Share filter state via URL params
3. Add filter presets/saved filters
4. Add batch clear actions
5. Keyboard shortcuts for filter actions
6. Filter history tracking

## Related Documentation

- See `.agent/README.md` for architecture overview
- See `CASHBACK_GUIDE_VI.md` for related business logic
- See `MANUAL_GUIDE_VI.md` for user-facing documentation

## Rollback Plan

If issues arise:
```bash
git revert <commit-hash>
```

All changes are isolated to:
- Account details page components
- TransactionHeader modifications (search + clear confirmation)
- QuickFilterDropdown (image rounding type support)

## Sign-off

**Reviewed by:** Auto-generated documentation
**Date:** 2026-01-29
**Status:** Ready for PR
