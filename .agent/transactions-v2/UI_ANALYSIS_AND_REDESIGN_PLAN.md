# Transaction UI Analysis & Redesign Plan
**Date:** January 25, 2026  
**Branch:** `feat/transactions-v2-ui-redesign`  
**Purpose:** Complete redesign của Transaction UI với modern, cohesive interface

---

## 📊 PHÂN TÍCH UI HIỆN TẠI

### 🔴 VẤN ĐỀ CHÍNH (Critical Issues)

#### 1. **Header/Toolbar Layout - Rời rạc & không mạch lạc**
**Vị trí:** `src/components/transactions/TransactionToolbar.tsx` (316 lines)

**Problems:**
- ❌ **Too many filter controls** nằm trên 1 dòng → overflow khi resize window
- ❌ **Split buttons** (All/In/Out/Lend/Repay) + Add buttons → confusing UX
- ❌ **Status toggle** (Active/Pending/Void) nằm riêng biệt, không prominent
- ❌ **MonthYearPicker** chiếm quá nhiều width (140px+)
- ❌ **Search bar** chỉ min-w-[200px] → dễ bị ép nhỏ
- ❌ **Account/People combobox** (140px each) → quá rộng cho filter
- ❌ **FilterX button** riêng lẻ, không clear khi nào có active filters
- ❌ **Color coding** không consistent:
  - All: slate-800
  - Income: emerald
  - Expense: rose
  - Lend: amber
  - Repay: indigo
  - → 5 màu khác nhau, không cohesive

**Current Structure:**
```tsx
<div className="flex flex-wrap"> // ← Wraps cause misalignment
  <MonthYearPicker />               // 140px shrink-0
  <Account Combobox />             // 140px shrink-0
  <People Combobox />              // 140px shrink-0
  <Search Input />                 // flex-1 min-w-[200px]
  <FilterX Button />               // shrink-0
  <Split Buttons x5 />             // shrink-0 ml-auto
  <Status Toggle />                // shrink-0 pl-2 border-l
  <Add Button />                   // shrink-0
</div>
```

#### 2. **Table Headers - Quá nhiều columns, không clear priority**
**Vị trí:** `src/components/moneyflow/unified-transaction-table.tsx` (3187 lines!)

**Problems:**
- ❌ **9 columns** mặc định:
  ```tsx
  date (160px) | shop (250px) | people (150px) | 
  account (280px) | amount (120px) | final_price (120px) | 
  category (180px) | id (100px) | actions (80px)
  ```
  → **Tổng:** ~1440px min width → không responsive
- ❌ **Column names** không clear: "Note" vs "Shop", "BASE" vs "Net Value"
- ❌ **Flow & Entity** column quá rộng (280px) nhưng chỉ show icon + text
- ❌ **People column** riêng biệt nhưng thực tế merged vào Account column theo design
- ❌ **Category** inline badge trong Shop column nhưng vẫn có column riêng
- ❌ **Final Price** vs **BASE** confusing terminology
- ❌ **ID column** ẩn mặc định nhưng vẫn count trong layout

#### 3. **Table Row Design - Thiếu hierarchy & visual consistency**
**Problems:**
- ❌ **Row height** không consistent (có cashback badge → taller)
- ❌ **Avatars/Icons** mix rounded và square (should be all square per rules)
- ❌ **Cashback badges** inline → làm row dài ra
- ❌ **Action buttons** (Edit/Duplicate/Void/Refund) trong DropdownMenu → 2 clicks
- ❌ **Row hover** không clear, chỉ có subtle bg change
- ❌ **Selection checkbox** không clear khi có selection active
- ❌ **Loading states** không smooth, chỉ có loadingIds set
- ❌ **Void transactions** chỉ có opacity change, không clear enough

#### 4. **Mobile View - Hoàn toàn khác desktop**
**Vị trí:** `src/components/moneyflow/mobile/MobileTransactionsSimpleList.tsx`

**Problems:**
- ❌ **Completely different component** → duplicate logic
- ❌ **Mobile columns:** `["date", "shop", "category", "account", "amount"]` hardcoded
- ❌ **Filters collapse** behavior không smooth
- ❌ **Touch targets** quá nhỏ (< 44px)
- ❌ **Swipe actions** không có (iOS standard)

#### 5. **Filter State Management - Quá phức tạp**
**Vị trí:** `src/components/transactions/UnifiedTransactionsPage.tsx` (453 lines)

**Problems:**
- ❌ **15+ useState hooks** trong 1 component:
  ```tsx
  - search, filterType, statusFilter
  - date, dateRange, dateMode
  - selectedAccountId, selectedPersonId
  - isSlideOpen, slideMode, selectedTxn, slideOverrideType
  - hasUnsavedChanges, showUnsavedWarning
  - loadingIds, isGlobalLoading
  - refundTxn, isRefundOpen
  - voidTxn, isVoidAlertOpen
  ```
- ❌ **Filter logic** trong useMemo (200+ lines) → khó maintain
- ❌ **hasActiveFilters** logic phức tạp, không clear
- ❌ **Reset behavior** inconsistent (reset to "active" status)

#### 6. **Performance Issues**
- ❌ **3187 lines** trong 1 file (`unified-transaction-table.tsx`)
- ❌ **Default load 1000 transactions** → không pagination
- ❌ **useMemo dependencies** không optimized
- ❌ **localStorage** reads/writes trong useEffect → blocking
- ❌ **Excel mode** logic mixed với table logic

---

## 🎯 ĐỀ XUẤT REDESIGN (V2)

### 🏗️ Kiến Trúc Mới

#### **Component Structure**
```
src/app/transactions-v2/
├── page.tsx                          # Server Component (data fetch)
└── layout.tsx                        # Optional layout wrapper

src/components/transactions-v2/
├── TransactionsPageV2.tsx            # Main client wrapper
├── header/
│   ├── TransactionHeader.tsx         # Redesigned header (replaces Toolbar)
│   ├── FilterBar.tsx                 # Primary filters (Month, Account, People)
│   ├── SearchBar.tsx                 # Search + quick filters
│   ├── TypeFilter.tsx                # Simplified type filter (pills)
│   └── StatusTabs.tsx                # Active/Pending/Void as tabs
├── table/
│   ├── TransactionTableV2.tsx        # Redesigned table
│   ├── TableHeader.tsx               # Sticky header with sort
│   ├── TableRow.tsx                  # Optimized row component
│   ├── columns/                      # Column components
│   │   ├── DateColumn.tsx
│   │   ├── DescriptionColumn.tsx    # Merged Shop + Note + Category
│   │   ├── FlowColumn.tsx           # Account + Person merged
│   │   ├── AmountColumn.tsx         # BASE + Cashback inline
│   │   ├── FinalColumn.tsx          # Net value
│   │   └── ActionsColumn.tsx        # Quick actions
│   └── EmptyState.tsx
├── filters/
│   ├── useTransactionFilters.ts     # Custom hook for filter state
│   └── FilterPresets.tsx             # Saved filters (future)
└── utils/
    ├── columnConfig.ts               # Column definitions
    └── tableUtils.ts                 # Sorting, grouping logic
```

### 🎨 Design Principles

#### 1. **Header Redesign - Compact & Clear**
**Target Height:** 120px max (currently ~180px)

**New Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ [Transactions]                          [Settings] [+Add]│ ← Title Bar (60px)
├─────────────────────────────────────────────────────────┤
│ [Jan 2026 ▼] [Account ▼] [People ▼]    [🔍 Search...]  │ ← Filter Bar (60px)
│                                                          │
│ ◉ Active  ○ Pending  ○ Void          All In Out Lend Re│ ← Status + Type (inline)
└─────────────────────────────────────────────────────────┘
```

**Improvements:**
- ✅ **2-row layout** thay vì flex-wrap → predictable height
- ✅ **Status tabs** prominent ở đầu (Figma style)
- ✅ **Type filters** as pills, không có split add buttons
- ✅ **Search** expanded, right-aligned
- ✅ **Add button** primary action, top-right
- ✅ **Remove FilterX** → clear filters trong dropdown

#### 2. **Table Columns - Reduced & Merged**
**6 columns** thay vì 9:

| Column | Width | Content | Priority |
|--------|-------|---------|----------|
| **Date** | 120px | Date + Time (if today) | High |
| **Description** | flex-1 | Shop name + Note + Category badge + Tag | High |
| **Flow** | 200px | Account → Person (merged) | High |
| **Amount** | 140px | BASE amount + Cashback % inline | High |
| **Final** | 120px | Net value after cashback | Medium |
| **Actions** | 60px | Quick actions (3-dot) | High |

**Remove:**
- ❌ Separate "People" column → merged into Flow
- ❌ Separate "Category" column → badge in Description
- ❌ "ID" column → show on hover/detail

**Mobile (< 768px):**
- 3 columns: Date | Description | Amount
- Flow + Final → collapse into Description subtitle
- Actions → swipe left

#### 3. **Visual Improvements**

**Colors - Simplified Palette:**
```tsx
// Status
Active:  emerald-50/emerald-600  (green)
Pending: amber-50/amber-600      (yellow)
Void:    slate-100/slate-500     (gray)

// Type (subtle, not primary)
Income:   emerald badge
Expense:  rose badge
Transfer: blue badge
Debt:     amber badge
Repay:    indigo badge

// Cashback
Has cashback: green badge with %
Need spend:   amber warning
```

**Typography:**
- **Header:** font-semibold text-sm (11-12px actual)
- **Row text:** text-sm (13-14px)
- **Secondary:** text-xs text-muted-foreground
- **Amounts:** font-mono font-medium

**Spacing:**
- **Row height:** 48px base, 56px with badges
- **Row padding:** py-2 px-3
- **Column gap:** px-2
- **Header padding:** py-3 px-3

**Borders & Shadows:**
- **Header:** border-b shadow-sm sticky top-0
- **Rows:** border-b border-slate-100
- **Hover:** bg-slate-50 border-slate-200
- **Selected:** bg-blue-50 border-blue-200

#### 4. **Interactions**

**Row Click:** NO ACTION (per rules)
- ✅ Only buttons/menus trigger actions
- ✅ Checkbox for selection
- ✅ 3-dot menu for actions

**Quick Actions (Icons, no dropdown):**
```tsx
<div className="flex gap-1">
  <IconButton icon={Edit} onClick={onEdit} />      // Always visible
  <IconButton icon={Copy} onClick={onDuplicate} /> // Always visible
  <MoreMenu>                                       // 3-dot for destructive
    <MenuItem icon={Ban} onClick={onVoid}>Void</MenuItem>
    <MenuItem icon={RefreshCcw} onClick={onRefund}>Refund</MenuItem>
    <MenuItem icon={History} onClick={onHistory}>History</MenuItem>
  </MoreMenu>
</div>
```

**Keyboard Shortcuts:**
- `Cmd+K`: Focus search
- `Cmd+N`: New transaction
- `Arrow Keys`: Navigate rows (when focused)
- `Enter`: Quick edit focused row
- `Cmd+A`: Select all visible

#### 5. **Filter State Management**

**Custom Hook:**
```tsx
// src/components/transactions-v2/filters/useTransactionFilters.ts
export function useTransactionFilters(initialData: Transaction[]) {
  // Single source of truth
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    dateMode: 'month',
    date: new Date(),
    dateRange: undefined,
    accountId: undefined,
    personId: undefined,
    type: 'all',
    status: 'active',
  })

  const filteredData = useMemo(() => 
    applyFilters(initialData, filters),
    [initialData, filters]
  )

  const hasActiveFilters = useMemo(() => 
    checkActiveFilters(filters),
    [filters]
  )

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  return { filters, setFilters, filteredData, hasActiveFilters, resetFilters }
}
```

**Benefits:**
- ✅ Single state object thay vì 15 useState
- ✅ Reusable logic
- ✅ Easy to add filter presets
- ✅ URL params sync (future)

#### 6. **Performance Optimizations**

**Virtualization:**
```tsx
// Use @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: filteredTransactions.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 48, // Row height
  overscan: 10,
})
```

**Lazy Loading:**
- Load 100 rows initially
- Load more on scroll (infinite scroll)
- Keep 1000 limit for now (will add pagination later)

**Memoization:**
```tsx
// Memo expensive cells
const AmountCell = memo(({ amount, cashback }: AmountCellProps) => {
  // ...
}, (prev, next) => 
  prev.amount === next.amount && 
  prev.cashback === next.cashback
)
```

**Code Splitting:**
```tsx
// Lazy load dialogs
const TransactionSlideV2 = lazy(() => import('./TransactionSlideV2'))
const ConfirmRefundDialog = lazy(() => import('./ConfirmRefundDialog'))
```

---

## 📐 RESPONSIVE BREAKPOINTS

| Breakpoint | Width | Changes |
|------------|-------|---------|
| **Mobile** | < 768px | 3 columns, stacked filters, swipe actions |
| **Tablet** | 768-1024px | 5 columns (hide Final), side-by-side filters |
| **Desktop** | 1024-1440px | 6 columns, full layout |
| **Wide** | > 1440px | Add optional columns (ID, Tag) |

---

## 🚀 IMPLEMENTATION PLAN

### Phase 1: Header Redesign (2-3 hours)
- [ ] Create `TransactionHeader.tsx` component
- [ ] Implement `FilterBar.tsx` (Month, Account, People)
- [ ] Implement `SearchBar.tsx` with debounce
- [ ] Implement `StatusTabs.tsx` (Active/Pending/Void)
- [ ] Implement `TypeFilter.tsx` (pills)
- [ ] Create `useTransactionFilters.ts` hook

### Phase 2: Table Core (3-4 hours)
- [ ] Create `TransactionTableV2.tsx` skeleton
- [ ] Implement `TableHeader.tsx` with sort
- [ ] Implement `TableRow.tsx` with selection
- [ ] Create column components:
  - [ ] `DateColumn.tsx`
  - [ ] `DescriptionColumn.tsx` (merged)
  - [ ] `FlowColumn.tsx` (merged Account + Person)
  - [ ] `AmountColumn.tsx` (with cashback inline)
  - [ ] `FinalColumn.tsx`
  - [ ] `ActionsColumn.tsx` (quick actions)

### Phase 3: Data Integration (2 hours)
- [ ] Create `src/app/transactions-v2/page.tsx`
- [ ] Wire up data fetching (reuse existing services)
- [ ] Connect filters to table
- [ ] Add loading/error states
- [ ] Test with real data

### Phase 4: Polish & Optimization (2-3 hours)
- [ ] Add virtualization with `@tanstack/react-virtual`
- [ ] Implement keyboard shortcuts
- [ ] Add empty states
- [ ] Mobile responsive (< 768px)
- [ ] Accessibility (ARIA labels, focus management)
- [ ] Performance profiling

### Phase 5: Testing & Migration (1-2 hours)
- [ ] Side-by-side comparison with V1
- [ ] Fix any regression bugs
- [ ] Document new patterns
- [ ] Create migration guide
- [ ] Update `.cursorrules` if needed

**Total Estimated Time:** 10-14 hours

---

## 📝 FILES TO CREATE

### New Files
```
src/app/transactions-v2/page.tsx
src/components/transactions-v2/TransactionsPageV2.tsx
src/components/transactions-v2/header/TransactionHeader.tsx
src/components/transactions-v2/header/FilterBar.tsx
src/components/transactions-v2/header/SearchBar.tsx
src/components/transactions-v2/header/StatusTabs.tsx
src/components/transactions-v2/header/TypeFilter.tsx
src/components/transactions-v2/table/TransactionTableV2.tsx
src/components/transactions-v2/table/TableHeader.tsx
src/components/transactions-v2/table/TableRow.tsx
src/components/transactions-v2/table/columns/DateColumn.tsx
src/components/transactions-v2/table/columns/DescriptionColumn.tsx
src/components/transactions-v2/table/columns/FlowColumn.tsx
src/components/transactions-v2/table/columns/AmountColumn.tsx
src/components/transactions-v2/table/columns/FinalColumn.tsx
src/components/transactions-v2/table/columns/ActionsColumn.tsx
src/components/transactions-v2/table/EmptyState.tsx
src/components/transactions-v2/filters/useTransactionFilters.ts
src/components/transactions-v2/utils/columnConfig.ts
src/components/transactions-v2/utils/tableUtils.ts
```

### Files to Preserve (DO NOT EDIT)
```
src/app/transactions/page.tsx                              ← Keep V1
src/components/transactions/UnifiedTransactionsPage.tsx    ← Keep V1
src/components/transactions/TransactionToolbar.tsx         ← Keep V1
src/components/moneyflow/unified-transaction-table.tsx     ← Keep V1
```

---

## ✅ SUCCESS CRITERIA

- [ ] Header height ≤ 120px
- [ ] Table width responsive (375px → 1440px+)
- [ ] 6 columns on desktop (down from 9)
- [ ] Lighthouse Performance score > 90
- [ ] Accessibility score > 95
- [ ] Mobile-friendly (44px+ touch targets)
- [ ] Keyboard navigation works
- [ ] 0 console errors/warnings
- [ ] Pass `pnpm lint`
- [ ] Pass `pnpm build`

---

## 🔗 RELATED DOCS

- `.cursorrules` - Coding standards
- `README.md` - Phase 7 mention
- `.agent/TRANSACTION_TABLE_QUICKSTART.md` - Existing table docs
- `src/PHASE_6_WALKTHROUGH.md` - Previous phases

---

**Next Step:** Start với Phase 1 (Header Redesign)  
**Access V2:** `http://localhost:3000/transactions-v2` (khi ready)  
**Compare V1:** `http://localhost:3000/transactions` (existing)
