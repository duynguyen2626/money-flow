---
phase: 75
title: People UI Enhancements & Transaction Slide V2 Refinements
date: 2026-02-08
status: COMPLETED
---

# Phase 75: People UI Enhancements & Transaction Slide V2 Refinements

## Objectives

### A. People Details Page Enhancements
1. ✅ **Sheet Settings Update Trigger**: Auto-sync sheet after settings are saved
2. ✅ **Loading Indicator**: Show spinner on Sync button during save/sync
3. ✅ **Image Display**: Square avatars (rounded-none) for person images
4. ✅ **Sheet Settings UI**: Split mode [Sync | Settings] buttons
5. ✅ **UI Element Sizing**: Increase button heights to h-10
6. ✅ **Edit Modal Fix**: Replaced with People Slide V2
7. ✅ **Archive Old Edit Modal**: Moved legacy components to .archive/

### B. People Page (Main List) Enhancements
1. ✅ **Avatar Images**: Changed from rounded to square (rounded-none)
2. ✅ **Sheet Controls**: Added split-mode [Sync | Settings] to each row
3. ✅ **Button Sizing**: Increased sheet control heights to h-10 for desktop

### C. Transaction Slide V2 Fixes
1. ✅ **Action Title**: Fixed "Edit Transaction" display logic
2. ✅ **Unsaved Changes Warning**: Replaced browser confirm with custom AlertDialog
3. ✅ **Cashback Section - Tabs Design**:
   - Added icons (DollarSign, Gift, Heart) to tabs
   - Removed old header border
   - Added color + icon when selected (emerald/amber/rose)
4. ✅ **Cashback Section - Voluntary Tab**:
   - Matched styling of % Back and Fixed Back from Give Away tab
   - Fixed field styling consistency (h-10, proper labels)

### D. Global Consistency
1. ✅ **Universal Square Avatars**: Enforced `rounded-none` across all transaction table cells (Shop, Account, Person).
2. ✅ **Mobile UI Alignment**: Updated Mobile list with square avatars and consistent flow display.

## Implementation Details

### ✅ Completed Tasks

#### 1. People Detail Header V2
**File**: `src/components/people/v2/PersonDetailHeaderV2.tsx`
- Changed avatar from `rounded-full` to `rounded-none`
- Enabled `splitMode={true}` for ManageSheetButton
- Increased button height to `h-10`
- Integrated `onEdit` callback to trigger `PeopleSlideV2`

#### 2. Manage Sheet Button
**File**: `src/components/people/manage-sheet-button.tsx`
- Auto-trigger sync after settings save
- Show loading state on Sync button during save/sync operations
- Display "Saving..." or "Syncing..." text appropriately

#### 3. Transaction Slide V2
**File**: `src/components/transaction/slide-v2/transaction-slide-v2.tsx`
- Fixed title to show "Edit Transaction" when `editingId` is present
- Replaced `window.confirm` with `UnsavedChangesDialog` component
- Integrated `CashbackSection` redesign

#### 4. Unified Transaction Table
**File**: `src/components/moneyflow/unified-transaction-table.tsx`
- Replaced all usages of `rounded-sm` and `rounded-full` for images/icons with `rounded-none`
- Updated category placeholders to be square

#### 5. Mobile Transactions Simple List
**File**: `src/components/moneyflow/mobile/MobileTransactionsSimpleList.tsx`
- Enforced `rounded-none` for all shop and flow images

## Files Modified

- ✅ `src/components/people/v2/PersonDetailHeaderV2.tsx`
- ✅ `src/components/people/manage-sheet-button.tsx`
- ✅ `src/components/people/v2/MemberDetailView.tsx`
- ✅ `src/components/transaction/slide-v2/transaction-slide-v2.tsx`
- ✅ `src/components/transaction/slide-v2/unsaved-changes-dialog.tsx` (New)
- ✅ `src/components/transaction/slide-v2/single-mode/cashback-section.tsx`
- ✅ `src/components/moneyflow/unified-transaction-table.tsx`
- ✅ `src/components/moneyflow/mobile/MobileTransactionsSimpleList.tsx`
- ✅ `src/app/people/[id]/page.tsx` (Added subscriptions fetch)

## Testing Checklist (ALL PASSED)

### People Details Page
- [x] Avatar displays as square
- [x] [Sync | Settings] buttons visible and functional
- [x] Clicking Settings opens popover
- [x] Clicking Sync triggers sync immediately
- [x] Saving settings auto-triggers sync
- [x] Loading spinner shows during save/sync
- [x] Edit button opens People Slide V2 (not old modal)

### People Page (Main List)
- [x] All avatars are square
- [x] Each row has [Sync | Settings] controls
- [x] Sheet controls are properly sized

### Transaction Slide V2
- [x] Title shows "Edit Transaction" when editing
- [x] Custom modal appears on unsaved changes
- [x] Cashback tabs have icons
- [x] Active tab shows color + icon
- [x] Voluntary tab fields match Give Away styling
- [x] No old borders visible in cashback section

## Notes

- Legacy `edit-person-dialog` has been replaced by `PeopleSlideV2` on all primary entry points.
- Global avatar policy for Phase 75 (Square everything) has been applied to the core Table components.

---

## 🛠 Session 2: Refinements & Bug Fixes (Recent)

### 1. Sync Button Group Standardization
Standardized the "Current Tag" column UI in the People table:
*   **Dimensions**: Set fixed width to **170px** for the `ManageSheetButton` group and the fallback "NO TAG" badge.
*   **Icon Alignment**: Fixed icon buttons (`Settings2` and `FileSpreadsheet`) to be **centered** using `w-9 px-0` and `shrink-0`.
*   **Visual Polish**: Updated the fallback badge to match the button group's **rounded corners** and **border-2** style.
*   **Context Aware**: Replaced the generic external link icon with a custom **Green Sheet icon** (`FileSpreadsheet`) for better recognition of Google Sheets.

### 2. Transaction Duplication Fix
Resolved a critical bug where duplicating a transaction resulted in a blank form:
*   **Data Mapping**: Corrected the `initialData` mapping in `MemberDetailView.tsx` to correctly handle the full transaction object and carry over all relevant fields (Amount, Note, Category, Shop, Person, Account).
*   **Auto-Select Logic**: Modified `BasicInfoSection.tsx` to skip auto-category/shop assignment during **'duplicate'** and **'edit'** modes, preventing original data from being overwritten by defaults.
*   **Metadata Integration**: Added `duplicated_from_id` to the transaction metadata when cloning.

### 3. Header Capitalization & UI Consistency
*   **Title Case Headers**: Removed `uppercase` styling from stat labels and group headers in the People page and Person Details.
*   **Active Subs Column**: Added and integrated the "Active Subs" column into the People list with proper visibility preferences.
*   **Amount Formatting**: Fixed `SmartAmountInput` to correctly display `0` values instead of blank strings.

---

## 🚀 Final Phase 75 Verification Checklist
- [x] `pnpm build` passed without errors.
- [x] Sync group width is stable at 170px (no clipping).
- [x] Icons are centered in the sync group and green sheet icon used.
- [x] Duplicating an expense from the People Detail page pre-fills all fields correctly.
- [x] Duplicating a debt/repayment carries over the correct person and account.
- [x] Header labels follow Title Case project-wide.
- [x] "Active Subs" column displays correctly in the People table.
