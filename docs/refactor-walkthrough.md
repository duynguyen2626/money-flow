# Transaction Header & Date Picker Refactor - Walkthrough

## Overview
This update refreshes the `TransactionHeader` interaction model to improve usability, performance, and correctness. The changes transition from a strict real-time filtering model to a **Hybrid Manual/Real-time** user experience, accompanied by a completely rewritten Date Picker and Dynamic Filtering options.

## Key Changes

### 1. Manual & Hybrid Filtering
- **State Buffer**: All filter dropdowns (Account, People, Type, Status, Cycle) now use local buffering. Changing a value does NOT trigger a full page reload or API call immediately.
- **Filter Button**:
  - **"Filter" Mode**: When no filters are active, users make selections and click "Filter" to apply them all at once.
  - **"Clear" Mode**: When filters are active, the button becomes "Clear".
  - **Hybrid Updates**: If "Clear" is visible (filters are active), changing any dropdown **immediately** updates the results (mimicking real-time) for smoother refinement.
- **Clear Confirmation**: Clicking "Clear" now triggers an `AlertDialog` to prevent accidental resets.

### 2. Manual Search
- The Search Bar no longer debounces real-time.
- Users must press **Enter** or click the **Search Icon** to execute a search. This prevents UI stuttering during typing.

### 3. Date Picker V3 (`MonthYearPickerV2` Rewrite)
- **Tabs Interface**: Visual separation between **Month**, **Date** (Single), and **Range** selection modes.
- **No Auto-Close**: The popover stays open until explicitly closed or applied.
- **Smart Range**: Selecting a range requires an explicit "Apply" (or mode switch) to confirm.
- **Locked State**: Visual indicators (opacity, cursor) clearly show when the Date Picker is disabled by a specific Cycle selection.

### 4. Dynamic Filter Options
- **Context-Aware Dropdowns**: The "Account" and "People" dropdowns now filter their options based on the **current view results**.
  - Example: If you filter by a specific Date Range, the "People" dropdown will only show people involved in transactions during that range.
  - Optimization: If reset (viewing all), full lists are shown without extra calculation.

## Technical Details
- **Components Modified**:
  - `src/components/transactions-v2/header/TransactionHeader.tsx`: Core logic for hybrid state properties and layout.
  - `src/components/transactions-v2/header/MonthYearPickerV2.tsx`: Complete rewrite using local state for robust interaction.
  - `src/components/transactions/UnifiedTransactionsPage.tsx`: Calculation of `availableAccountIds` and `availablePersonIds`.

## Verification
- [x] Select multiple filters -> Click "Filter" -> Updates correctly.
- [x] While filtered -> Change Account -> Updates immediately (Hybrid).
- [x] Clear Filters -> Dialog appears -> Confirmed reset.
- [x] Date Picker -> Select Range -> Does not close prematurely.
- [x] Dynamic Options -> Filter by Date -> Check Account list reduces to relevant items.
