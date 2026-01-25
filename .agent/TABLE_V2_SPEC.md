# Transaction Table V2 - Design Specification

## Overview
Create a modernized transaction table component (V2) that improves UI/UX while preserving all V1 business logic and display requirements.

**File**: `src/components/moneyflow/unified-transaction-table-v2.tsx`  
**Usage**: New page at `src/app/transactions/page-v2.tsx` for testing/comparison

---

## Column Layout (Redesigned)

### 1. **Date** (Date + Type Badge)
**Current V1**: Separate columns for date & type  
**V2 Design**: Merge into single column with better hierarchy

Content:
- Date/Time (top): `20.01 | 11:30` (compact format)
- Type Badge (bottom): Small colored pill badge
  - **IN**: Green (emerald-700)
  - **OUT**: Red (red-500)
  - **LEND**: Orange (orange-700)
  - **REPAY**: Green (emerald-700)
  - **TF**: Blue (sky-700)

Styling:
- Flex col layout
- Checkbox on left
- Hover color change
- Sticky left position

---

### 2. **Flow** (Source → Target with Flow Logic)
**Current V1**: Separate "Account" & "People" columns  
**V2 Design**: Single "Flow" column with smart context display

**Content Structure**:
```
Source Entity (with icon) ➜ Target Entity (with icon)
↓ (badges below: cycle tag, debt tag)
```

**Display Logic** (Same as V1):
- **Person Context Page**: Hide person, show account with FROM/TO badge
- **Account Context Page**: Hide self, show other side with FROM/TO badge
- **General View**: Show Source ➜ Target with badges

**Features**:
- Square avatars (w-8 h-8, rounded-none) with initials
- Entity names clickable links
- Badges underneath:
  - Cycle tag (purple): `2026-01` format
  - Debt tag (teal): `25.10-24.11` format
  - FROM/TO badges (orange/sky)

**Width**: Flexible, min-w-[280px]

---

### 3. **Notes + Category** (Merged)
**Current V1**: Separate notes & category columns  
**V2 Design**: Unified column with shop image, notes, and category badges

**Content Structure**:
```
[Shop Image] Notes Text
├─ Badge: SPLIT / SHARE
├─ Badge: Category (with icon/color)
└─ Badge: Other metadata
```

**Sub-elements** (in order):
1. **Shop Image** (left): 8×8px rounded-sm, if not available show category icon
2. **Notes Text** (middle): Font bold, truncate on hover show full
3. **ID Copy Button** (on hover): Copy txn ID, show "Copied!" state
4. **Badges Below Notes**:
   - **SPLIT** (indigo): Split bill parent
   - **SHARE** (slate): Split bill child with 🔗 icon
   - **Refund Badges**: Request/Confirmed/OK states
   - **Category Badge**: With color coding and icon

**Width**: min-w-[280px]

---

### 4. **Amount** (Redesigned with Cashback)
**Current V1**: Separate "Base" & "Final Price" columns  
**V2 Design**: Single column showing both with clear hierarchy

**Content Structure**:
```
Base Amount (top)
↓ (-30% cashback)
Net Amount (bottom, highlighted)
```

**Display Logic** (preserve from V1):
- If no cashback: Show amount once (dimmed)
- If cashback exists:
  - Top: Base amount (original)
  - Middle: Cashback discount info with icon
  - Bottom: Net amount (final price, bold)

**Styling**:
- Color based on type (green income, red expense, etc.)
- Font bold for net
- Font semibold for base
- Tabular numbers

**Width**: min-w-[140px], text-right

---

### 5. **Actions** (Modern Icon Cluster)
**Current V1**: Action menu trigger  
**V2 Design**: Wrench/Settings icon with nested dropdown on hover

**Icon Style**:
- Single ⚙️ wrench icon (Settings2 from lucide)
- Tooltip: "More actions"
- On click: Open Sheet/Popover with action list (same as V1)

**Actions Preserved**:
- Edit ✏️
- Duplicate 📋
- Void ⛔
- Request Refund 🔄
- Cancel Order 🚫
- Delete 🗑️
- View History 📜

**Width**: min-w-[60px], text-center

---

## Row Styling (Modern)

**Background**:
- Default: white
- Voided: gray-50 with opacity & dashed border
- Installment: amber-50
- Refund: purple-50
- Repayment: slate-50
- Pending: emerald-50

**Hover Effects**:
- Smooth transition (200ms)
- bg-slate-50 on hover
- Pointer cursor

**Height**:
- py-3 (better spacing than V1's py-2)
- Content should have better breathing room

**Borders**:
- border-b border-slate-100 (lighter than V1)
- Clear separation between rows

---

## Header Styling (Modern)

**Background**:
- Gradient: from-slate-50 to-slate-100
- Subtle and professional

**Typography**:
- font-semibold text-sm
- text-slate-700

**Padding**:
- py-4 px-3 (more spacious)

**Borders**:
- border-b border-slate-200
- Subtle shadow for depth

**Sticky**:
- sticky top-0 z-40
- Maintains visibility on scroll

---

## Mobile Responsiveness

**Desktop** (md+):
- Full table layout with all columns
- Horizontal scroll if needed

**Tablet** (sm - md):
- Simplified column set
- Merge some columns if space limited

**Mobile** (< sm):
- Keep existing MobileTransactionsSimpleList fallback
- OR simplified card view if needed

---

## Feature Preservation (100% of V1)

### Logic
- ✅ All sorting (date, amount)
- ✅ All filtering (search, date range, account, person)
- ✅ All pagination
- ✅ All selection (single, multi, range, all)
- ✅ Excel mode with cell selection
- ✅ Bulk actions (void, restore, delete)

### Display
- ✅ Amount calculations (base + cashback = net)
- ✅ Badge logic (refund, split, cycle, debt tags)
- ✅ Context-aware display (person/account/general)
- ✅ Status indicators (voided, pending, installment)
- ✅ Metadata parsing and display

### Interactions
- ✅ Row actions (edit, duplicate, refund, void, delete)
- ✅ ID copy button
- ✅ Link navigation (account, person, installment)
- ✅ Tooltips and help text
- ✅ Keyboard shortcuts (shift-click for range)

---

## Implementation Strategy

1. **Copy V1 file** → `unified-transaction-table-v2.tsx`
2. **Keep all logic intact**, only change:
   - Column definitions (remove/merge columns)
   - `renderCell()` function (new layout)
   - Header styling (gradient, spacing)
   - Row styling (py-3, border-slate-100, hover effects)
3. **Test against V1**:
   - Same data rendering
   - Same calculations
   - Same interactions
   - Same accessibility
4. **Create V2 page** at `src/app/transactions/page-v2.tsx` for side-by-side comparison
5. **Compare visually** before deciding on final approach

---

## Success Criteria

✅ All V1 logic works identically  
✅ All data displays correctly  
✅ All interactions functional  
✅ Modern, clean design  
✅ Better column organization  
✅ No bugs or broken features  
✅ Build passes  
✅ No console errors  

---

## Not Changed

- Component props/API
- Data fetching
- Server actions
- Database queries
- Business logic
- Accessibility features
