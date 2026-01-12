---
TASK: Complete Transaction Page Cleanup & Rebuild (Nuclear Option)

Date Issued: 2026-01-11 22:30
Priority: CRITICAL 🔴🔴🔴
Estimated Hours: 6-8 hours
Branch: feat/transaction-page-rebuild

SITUATION: Layout vỡ do chập vá liên tục V1/V2. Decision: Xóa sạch, rebuild từ 0.

---

PART 0: UNDERSTAND THE SCOPE

Current Problems:
  1. Layout completely broken (horizontal scroll, jumbled columns)
  2. V1 + V2 components conflicting
  3. Patches everywhere, tech debt stacked
  4. Code unreadable and unmaintainable
  5. Debugging impossible

Decision: NUCLEAR RESET
  ✅ Delete ALL V1/V2 transaction table code
  ✅ Keep ONLY feature components (badges, bulk actions, filters, etc)
  ✅ Implement transactions as SVG-based custom grid from scratch
  ✅ Clean architecture, no legacy code

---

PART 1: INVENTORY & SAFETY (30 minutes)

STEP 1: Understand What Stays
  
  KEEP THESE (Extract if embedded in page):
  ├─ Transaction badges (Paid badge, cashback badge, etc)
  ├─ Bulk action components (select, delete, merge, etc)
  ├─ Refund functionality
  ├─ History timeline
  ├─ Edit bulk float dialog
  ├─ Filters (year, status, etc)
  ├─ Search box
  ├─ Any utility functions (calculations, formatting)
  │
  └─ Action: Search for each in codebase
     grep -r "badge" src/components --include="*.tsx"
     grep -r "bulk" src/components --include="*.tsx"
     grep -r "refund" src/components --include="*.tsx"
     grep -r "history" src/components --include="*.tsx"
     grep -r "float" src/components --include="*.tsx"

STEP 2: Create Backup List
  File: COMPONENTS_TO_PRESERVE.md
  
  ─────────────────────────────────────────
  # Components & Code to Preserve
  
  ## Badge Components
  - Location: src/components/moneyflow/badges/
  - Files:
    □ paid-badge.tsx (shows ✅ PAID)
    □ cashback-badge.tsx (shows 💰 CASHBACK)
    □ status-badge.tsx
  - Extract from any transaction table and keep separate
  
  ## Bulk Actions
  - Location: src/components/moneyflow/bulk-actions/
  - Files:
    □ bulk-select.tsx
    □ bulk-delete-dialog.tsx
    □ bulk-merge-dialog.tsx
  - Separate component, used elsewhere?
  
  ## Refund Functionality
  - Location: src/components/moneyflow/refund/
  - Files:
    □ refund-dialog.tsx
    □ refund-button.tsx
  - Keep as-is
  
  ## History Timeline
  - Location: src/components/moneyflow/history/
  - Files:
    □ transaction-history.tsx
    □ history-timeline.tsx
  - Keep as-is
  
  ## Edit Bulk Float
  - Location: src/components/moneyflow/dialogs/
  - Files:
    □ edit-bulk-float-dialog.tsx
  - Keep as-is
  
  ## Filters & Search
  - Location: src/components/moneyflow/filters/
  - Files:
    □ transaction-filters.tsx
    □ year-filter.tsx
    □ status-filter.tsx
    □ search-box.tsx
  - Keep as-is, will reuse
  
  ## Utility Functions
  - Location: src/lib/transaction-utils.ts
  - Functions:
    □ formatAmount()
    □ formatCurrency()
    □ parseTransactionType()
    □ calculateNetAmount()
  - Keep, will import
  ─────────────────────────────────────────

STEP 3: Create Kill List
  File: COMPONENTS_TO_DELETE.md
  
  ─────────────────────────────────────────
  # Components & Code to DELETE
  
  ## V1 Components (OLD)
  rm src/components/moneyflow/transaction-table.tsx
  rm src/components/moneyflow/v1/ (entire directory)
  rm src/components/moneyflow/transaction-card.tsx
  rm src/components/moneyflow/transaction-row.tsx
  
  ## V2 Components (BROKEN)
  rm src/components/moneyflow/unified-transaction-table.tsx
  rm src/components/moneyflow/v2/ (entire directory if exists)
  rm src/components/moneyflow/simple-transaction-table.tsx
  
  ## Old Page Code
  rm src/app/transactions/page.tsx (the broken one)
  
  ## Old Styles/Utils Related to Old Components
  rm src/styles/transaction-table.module.css (if exists)
  rm src/lib/transaction-table-utils.ts (if exists)
  
  These GET CLEANED:
  ├─ src/app/people/[id]/details/page.tsx (remove old imports, clean render)
  └─ src/app/people/[id]/details/member-detail-view.tsx (remove old imports, clean)
  ─────────────────────────────────────────

---

PART 2: CLEAN SWEEP (1 hour)

STEP 1: Delete Old Components
  
  git rm src/components/moneyflow/transaction-table.tsx
  git rm src/components/moneyflow/unified-transaction-table.tsx
  git rm -r src/components/moneyflow/v1/ 2>/dev/null || true
  git rm -r src/components/moneyflow/v2/ 2>/dev/null || true
  git rm src/components/moneyflow/transaction-card.tsx 2>/dev/null || true
  git rm src/components/moneyflow/transaction-row.tsx 2>/dev/null || true
  
  git status
  # Should show: deleted files only

STEP 2: Clean Import References
  
  File: src/app/transactions/page.tsx
  ├─ FIND: import { TransactionTable } from '@/components/...'
  ├─ DELETE entire import line
  ├─ FIND: <TransactionTable or <UnifiedTransactionTable
  ├─ REPLACE with: <TransactionPageNew /> (we'll create this)
  │
  └─ Simplified page should look like:
     ─────────────────────────────────────
     export default function TransactionsPage() {
       return (
         <div>
           <SearchBox />
           <FilterBar />
           <TransactionPageNew /> {/* new component */}
         </div>
       )
     }
     ─────────────────────────────────────

  File: src/app/people/[id]/details/member-detail-view.tsx
  ├─ FIND: import { ... TransactionTable ... } from '@/components/...'
  ├─ DELETE old imports
  ├─ ADD new import: import { TransactionListNew } from '@/components/moneyflow/transaction-list-new'
  ├─ FIND: <TransactionTable or <UnifiedTransactionTable
  ├─ REPLACE with: <TransactionListNew transactions={data} /> (we'll create)
  │
  └─ Result: clean imports, no orphaned code

STEP 3: Verify No Broken Imports
  
  npm run build
  # Should show compile errors ONLY for the components we're about to create
  # NOT for deleted components (that's already deleted)
  
  # If errors reference deleted components: fix imports above
  # If no errors: good, proceed

STEP 4: Commit Clean Deletion
  
  git add -A
  git commit -m "clean: remove all V1/V2 transaction table components
  
  - Deleted src/components/moneyflow/transaction-table.tsx (V1 old)
  - Deleted src/components/moneyflow/unified-transaction-table.tsx (V2 broken)
  - Deleted src/components/moneyflow/v1/ directory
  - Deleted src/components/moneyflow/v2/ directory
  - Cleaned up all orphaned transaction card components
  - Updated imports in page components
  - Ready for rebuild from scratch
  
  Reason: Layout completely broken from repeated patches.
  Better to rebuild clean than continue with tech debt.
  "
  
  git push origin feat/transaction-page-rebuild

---

PART 3: REBUILD - NEW ARCHITECTURE (4-5 hours)

OBJECTIVE: Build transaction display from scratch using SVG-based grid.
No frameworks, no pre-made table components. Full control, clean code.

STEP 1: Create New Page Component

File: src/components/moneyflow/transaction-list-new.tsx

```tsx
'use client'

import React, { useState, useMemo } from 'react'
import { TransactionData } from '@/types/transaction'
import { TransactionGridSVG } from './transaction-grid-svg'
import { TransactionFilters } from './transaction-filters'
import { TransactionSearch } from './transaction-search'

interface TransactionListNewProps {
  transactions: TransactionData[]
  onSelectTransaction?: (id: string) => void
  onRefund?: (id: string) => void
  onEditBulkFloat?: (id: string) => void
}

export function TransactionListNew({
  transactions,
  onSelectTransaction,
  onRefund,
  onEditBulkFloat,
}: TransactionListNewProps) {
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set()
  )

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Year filter
      const txnYear = new Date(t.occurred_at).getFullYear().toString()
      if (selectedYear !== 'ALL' && txnYear !== selectedYear) return false

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          t.description?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q) ||
          t.flow?.name?.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [transactions, selectedYear, searchQuery])

  return (
    <div className="w-full space-y-4">
      {/* Search & Filters */}
      <div className="space-y-2">
        <TransactionSearch value={searchQuery} onChange={setSearchQuery} />
        <TransactionFilters
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
      </div>

      {/* Transaction Grid (SVG-based) */}
      <TransactionGridSVG
        transactions={filteredTransactions}
        selectedTransactions={selectedTransactions}
        onSelectTransaction={(id) => {
          const newSelected = new Set(selectedTransactions)
          if (newSelected.has(id)) {
            newSelected.delete(id)
          } else {
            newSelected.add(id)
          }
          setSelectedTransactions(newSelected)
          onSelectTransaction?.(id)
        }}
        onRefund={onRefund}
        onEditBulkFloat={onEditBulkFloat}
      />

      {/* No Results Message */}
      {filteredTransactions.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          <p>No transactions found</p>
        </div>
      )}
    </div>
  )
}
```

STEP 2: Create SVG-Based Grid Component

File: src/components/moneyflow/transaction-grid-svg.tsx

```tsx
'use client'

import React, { useMemo } from 'react'
import { TransactionData } from '@/types/transaction'
import { TransactionRowSVG } from './transaction-row-svg'

const COLUMN_WIDTHS = {
  timeline: 80,
  notes: 150,
  flow: 100,
  baseAmount: 120,
  netSettlement: 120,
  actions: 100,
}

const HEADER_HEIGHT = 40
const ROW_HEIGHT = 60
const PADDING = 16

interface TransactionGridSVGProps {
  transactions: TransactionData[]
  selectedTransactions: Set<string>
  onSelectTransaction: (id: string) => void
  onRefund?: (id: string) => void
  onEditBulkFloat?: (id: string) => void
}

export function TransactionGridSVG({
  transactions,
  selectedTransactions,
  onSelectTransaction,
  onRefund,
  onEditBulkFloat,
}: TransactionGridSVGProps) {
  const totalWidth = useMemo(() => {
    return (
      Object.values(COLUMN_WIDTHS).reduce((a, b) => a + b, 0) + PADDING * 2
    )
  }, [])

  const totalHeight = useMemo(() => {
    return HEADER_HEIGHT + transactions.length * ROW_HEIGHT + PADDING * 2
  }, [transactions.length])

  // Calculate column positions
  const columnPositions = useMemo(() => {
    let x = PADDING
    return {
      timeline: x,
      notes: (x += COLUMN_WIDTHS.timeline),
      flow: (x += COLUMN_WIDTHS.notes),
      baseAmount: (x += COLUMN_WIDTHS.flow),
      netSettlement: (x += COLUMN_WIDTHS.baseAmount),
      actions: (x += COLUMN_WIDTHS.netSettlement),
    }
  }, [])

  return (
    <div className="w-full overflow-x-auto bg-white rounded-lg border border-gray-200">
      <svg width={totalWidth} height={totalHeight} className="font-sans">
        {/* Header Row (Fixed) */}
        <g>
          {/* Header Background */}
          <rect
            x={PADDING}
            y={PADDING}
            width={totalWidth - PADDING * 2}
            height={HEADER_HEIGHT}
            fill="#f3f4f6"
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          {/* Column Headers */}
          <text
            x={columnPositions.timeline + 8}
            y={PADDING + HEADER_HEIGHT / 2 + 5}
            fontSize="12"
            fontWeight="bold"
            fill="#374151"
          >
            TIMELINE
          </text>

          <text
            x={columnPositions.notes + 8}
            y={PADDING + HEADER_HEIGHT / 2 + 5}
            fontSize="12"
            fontWeight="bold"
            fill="#374151"
          >
            NOTES
          </text>

          <text
            x={columnPositions.flow + 8}
            y={PADDING + HEADER_HEIGHT / 2 + 5}
            fontSize="12"
            fontWeight="bold"
            fill="#374151"
          >
            FLOW
          </text>

          <text
            x={columnPositions.baseAmount + 8}
            y={PADDING + HEADER_HEIGHT / 2 + 5}
            fontSize="12"
            fontWeight="bold"
            fill="#374151"
          >
            BASE AMOUNT
          </text>

          <text
            x={columnPositions.netSettlement + 8}
            y={PADDING + HEADER_HEIGHT / 2 + 5}
            fontSize="12"
            fontWeight="bold"
            fill="#374151"
          >
            NET SETTLEMENT
          </text>

          <text
            x={columnPositions.actions + 8}
            y={PADDING + HEADER_HEIGHT / 2 + 5}
            fontSize="12"
            fontWeight="bold"
            fill="#374151"
          >
            ACTIONS
          </text>
        </g>

        {/* Data Rows */}
        {transactions.map((transaction, index) => (
          <TransactionRowSVG
            key={transaction.id}
            transaction={transaction}
            index={index}
            isSelected={selectedTransactions.has(transaction.id)}
            columnPositions={columnPositions}
            columnWidths={COLUMN_WIDTHS}
            rowHeight={ROW_HEIGHT}
            startY={PADDING + HEADER_HEIGHT + index * ROW_HEIGHT}
            padding={PADDING}
            onSelect={() => onSelectTransaction(transaction.id)}
            onRefund={() => onRefund?.(transaction.id)}
            onEditBulkFloat={() => onEditBulkFloat?.(transaction.id)}
          />
        ))}
      </svg>
    </div>
  )
}
```

STEP 3: Create SVG Row Component

File: src/components/moneyflow/transaction-row-svg.tsx

```tsx
'use client'

import React from 'react'
import { TransactionData } from '@/types/transaction'
import { formatAmount, formatDate } from '@/lib/transaction-utils'
import { PaidBadge } from './badges/paid-badge'
import { CashbackBadge } from './badges/cashback-badge'

interface TransactionRowSVGProps {
  transaction: TransactionData
  index: number
  isSelected: boolean
  columnPositions: Record<string, number>
  columnWidths: Record<string, number>
  rowHeight: number
  startY: number
  padding: number
  onSelect: () => void
  onRefund: () => void
  onEditBulkFloat: () => void
}

export function TransactionRowSVG({
  transaction,
  index,
  isSelected,
  columnPositions,
  columnWidths,
  rowHeight,
  startY,
  padding,
  onSelect,
  onRefund,
  onEditBulkFloat,
}: TransactionRowSVGProps) {
  const y = startY
  const cx = padding + (columnPositions.actions + columnWidths.actions) / 2

  // Alternate row colors
  const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'

  return (
    <g>
      {/* Row Background */}
      <rect
        x={padding}
        y={y}
        width={cx - padding * 2}
        width={columnWidths.timeline +
          columnWidths.notes +
          columnWidths.flow +
          columnWidths.baseAmount +
          columnWidths.netSettlement +
          columnWidths.actions}
        height={rowHeight}
        fill={bgColor}
        stroke="#e5e7eb"
        strokeWidth="0.5"
        onClick={onSelect}
        style={{ cursor: 'pointer' }}
      />

      {/* Selection Checkbox */}
      <rect
        x={padding + 4}
        y={y + rowHeight / 2 - 8}
        width="16"
        height="16"
        rx="2"
        fill={isSelected ? '#3b82f6' : '#f3f4f6'}
        stroke={isSelected ? '#3b82f6' : '#d1d5db'}
        strokeWidth="1"
        onClick={onSelect}
        style={{ cursor: 'pointer' }}
      />

      {/* Checkmark if selected */}
      {isSelected && (
        <text
          x={padding + 12}
          y={y + rowHeight / 2 + 3}
          fontSize="12"
          fontWeight="bold"
          fill="white"
          textAnchor="middle"
        >
          ✓
        </text>
      )}

      {/* Timeline (Date) */}
      <text
        x={columnPositions.timeline + 8}
        y={y + rowHeight / 2 - 8}
        fontSize="13"
        fontWeight="bold"
        fill="#1f2937"
      >
        {formatDate(transaction.occurred_at).date}
      </text>
      <text
        x={columnPositions.timeline + 8}
        y={y + rowHeight / 2 + 8}
        fontSize="11"
        fill="#6b7280"
      >
        {formatDate(transaction.occurred_at).time}
      </text>

      {/* Notes */}
      <text
        x={columnPositions.notes + 8}
        y={y + rowHeight / 2 + 3}
        fontSize="12"
        fill="#374151"
        textLength={columnWidths.notes - 16}
      >
        {transaction.notes || transaction.description || 'No notes'}
      </text>

      {/* Flow (Source/Destination) */}
      <text
        x={columnPositions.flow + 8}
        y={y + rowHeight / 2 + 3}
        fontSize="12"
        fill="#374151"
      >
        {transaction.flow?.name || 'Unknown'}
      </text>

      {/* Base Amount */}
      <text
        x={columnPositions.baseAmount + 8}
        y={y + rowHeight / 2 - 8}
        fontSize="13"
        fontWeight="bold"
        fill={transaction.type === 'expense' ? '#ef4444' : '#10b981'}
      >
        {formatAmount(transaction.amount)}
      </text>

      {/* Badges (Paid, Cashback) */}
      <g>
        {transaction.metadata?.is_settled && (
          <circle cx={columnPositions.baseAmount + 80} cy={y + rowHeight / 2 + 8} r="6" fill="#10b981" />
        )}
        {transaction.metadata?.cashback_amount > 0 && (
          <circle cx={columnPositions.baseAmount + 95} cy={y + rowHeight / 2 + 8} r="6" fill="#f59e0b" />
        )}
      </g>

      {/* Net Settlement */}
      {transaction.net_settlement_amount && (
        <text
          x={columnPositions.netSettlement + 8}
          y={y + rowHeight / 2 + 3}
          fontSize="12"
          fill="#6b7280"
        >
          {formatAmount(transaction.net_settlement_amount)}
        </text>
      )}

      {/* Actions (Buttons) */}
      <g>
        {/* Refund Button */}
        <rect
          x={columnPositions.actions + 8}
          y={y + rowHeight / 2 - 14}
          width="28"
          height="28"
          rx="4"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth="1"
          onClick={onRefund}
          style={{ cursor: 'pointer' }}
        />
        <text
          x={columnPositions.actions + 22}
          y={y + rowHeight / 2 + 5}
          fontSize="12"
          fill="#6b7280"
          textAnchor="middle"
          onClick={onRefund}
          style={{ cursor: 'pointer' }}
        >
          ↩
        </text>

        {/* Edit Float Button */}
        <rect
          x={columnPositions.actions + 42}
          y={y + rowHeight / 2 - 14}
          width="28"
          height="28"
          rx="4"
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth="1"
          onClick={onEditBulkFloat}
          style={{ cursor: 'pointer' }}
        />
        <text
          x={columnPositions.actions + 56}
          y={y + rowHeight / 2 + 5}
          fontSize="12"
          fill="#6b7280"
          textAnchor="middle"
          onClick={onEditBulkFloat}
          style={{ cursor: 'pointer' }}
        >
          ✎
        </text>
      </g>
    </g>
  )
}
```

STEP 4: Create Supporting Components

File: src/components/moneyflow/transaction-search.tsx

```tsx
'use client'

import React from 'react'

interface TransactionSearchProps {
  value: string
  onChange: (value: string) => void
}

export function TransactionSearch({ value, onChange }: TransactionSearchProps) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search transactions..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg"
      />
      <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
    </div>
  )
}
```

File: src/components/moneyflow/transaction-filters.tsx (reuse or create if missing)

```tsx
'use client'

import React from 'react'

interface TransactionFiltersProps {
  selectedYear: string
  onYearChange: (year: string) => void
}

export function TransactionFilters({
  selectedYear,
  onYearChange,
}: TransactionFiltersProps) {
  const years = ['2024', '2025', '2026', 'ALL']

  return (
    <div className="flex gap-2 flex-wrap">
      {years.map((year) => (
        <button
          key={year}
          onClick={() => onYearChange(year)}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedYear === year
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {year}
        </button>
      ))}
    </div>
  )
}
```

STEP 5: Update Page Imports

File: src/app/transactions/page.tsx

```tsx
import { TransactionListNew } from '@/components/moneyflow/transaction-list-new'
import { getTransactions } from '@/actions/transaction-actions'

export default async function TransactionsPage() {
  const transactions = await getTransactions()

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Transactions</h1>
      <TransactionListNew transactions={transactions} />
    </div>
  )
}
```

File: src/app/people/[id]/details/member-detail-view.tsx (clean up)

```tsx
import { TransactionListNew } from '@/components/moneyflow/transaction-list-new'

export function MemberDetailView({ personId }: { personId: string }) {
  // Fetch person data...

  return (
    <div className="space-y-8">
      {/* Other sections... */}
      
      <section>
        <h2 className="text-2xl font-bold mb-4">Transactions</h2>
        <TransactionListNew transactions={transactions} />
      </section>
    </div>
  )
}
```

---

PART 4: TESTING & VALIDATION (1-2 hours)

STEP 1: Build & Run

```bash
npm run build
# Should compile without errors

npm run dev
# Start development server

# Navigate to http://localhost:3000/transactions
# Should see:
# ✅ Clean layout (no horizontal scroll)
# ✅ All columns visible
# ✅ Rows properly spaced
# ✅ Search working
# ✅ Year filter working
# ✅ Badges appearing (Paid, Cashback)
# ✅ Action buttons visible
```

STEP 2: Manual Testing Checklist

```
□ Page Load
  ✅ No 404 errors
  ✅ Data loads
  ✅ Layout renders
  ✅ SVG visible

□ Search
  ✅ Type in search box
  ✅ Results filter correctly
  ✅ Clear search shows all

□ Year Filter
  ✅ Click year button
  ✅ Only that year's txns show
  ✅ "ALL" shows all years

□ Transaction Rows
  ✅ Each row displays correctly
  ✅ All columns visible
  ✅ Text not cut off
  ✅ Alternating row colors

□ Badges
  ✅ Paid badge shows (green dot)
  ✅ Cashback badge shows (orange dot)
  ✅ Both can appear together

□ Action Buttons
  ✅ Refund button clickable (↩)
  ✅ Edit float button clickable (✎)
  ✅ Callbacks work

□ Selection
  ✅ Click checkbox to select
  ✅ Row highlights when selected
  ✅ Multiple selection works

□ Mobile Responsive
  ✅ Horizontal scroll works smoothly
  ✅ Touch targets > 44px
  ✅ Text readable on small screens

□ No Console Errors
  ✅ Browser console clean
  ✅ Network requests OK
  ✅ No warnings
```

STEP 3: Performance Check

```bash
# Check SVG rendering performance
# Open DevTools → Performance tab
# Record while scrolling transactions
# Should be: 60 FPS (smooth)
# Should NOT be: jank or stuttering

# File sizes
ls -lh src/components/moneyflow/transaction-*.tsx
# Should be: each file < 5KB
# Should NOT be: bloated code
```

---

PART 5: FINAL CLEANUP & COMMIT

STEP 1: Remove Debug Code

```bash
grep -r "console.log" src/components/moneyflow/ --include="*.tsx"
# Delete any debug logs
```

STEP 2: Add JSDoc Comments

File: src/components/moneyflow/transaction-list-new.tsx (top)

```tsx
/**
 * TransactionListNew
 * 
 * Complete rebuild of transaction list using SVG-based grid.
 * No V1/V2 legacy code. Clean architecture, full control.
 * 
 * Features:
 * - Search by description/notes
 * - Filter by year
 * - Select multiple transactions
 * - Show paid/cashback badges
 * - Refund & edit float actions
 * 
 * @component
 * @example
 * <TransactionListNew
 *   transactions={data}
 *   onSelectTransaction={handleSelect}
 *   onRefund={handleRefund}
 *   onEditBulkFloat={handleEditFloat}
 * />
 */
```

STEP 3: Commit

```bash
git add -A
git commit -m "feat: rebuild transaction page from scratch (SVG-based grid)

Completely rebuild the transaction display layer due to excessive
tech debt from V1/V2 patches. New architecture provides:

✨ Benefits:
- Clean codebase, no legacy code
- SVG-based custom grid (full control)
- Smooth rendering, no layout shifts
- Easy to maintain and extend
- Proper separation of concerns

🏗️  Architecture:
- TransactionListNew: Main container component
- TransactionGridSVG: SVG grid renderer
- TransactionRowSVG: Individual row in SVG
- TransactionSearch: Search box
- TransactionFilters: Year/status filters

📦 Components Preserved:
- PaidBadge, CashbackBadge (reused)
- Bulk actions (separate)
- Refund dialog (separate)
- History timeline (separate)
- Edit float dialog (separate)

🗑️  Deleted:
- src/components/moneyflow/transaction-table.tsx (V1 old)
- src/components/moneyflow/unified-transaction-table.tsx (V2 broken)
- All v1/ and v2/ directories
- Orphaned card components

✅ Testing:
- All manual tests pass
- No console errors
- 60 FPS smooth rendering
- Mobile responsive
- Search & filters work

Closes PR #174 (completely reimplemented)
Fixes: Layout completely broken from patches
"

git push origin feat/transaction-page-rebuild
```

---

PART 6: CREATE PR & HANDOFF

STEP 1: Create Pull Request on GitHub

```
Title: "Rebuild: Complete Transaction Page from Scratch (SVG Grid)"

Description:

## 🎯 Summary
Complete rebuild of transaction page due to excessive V1/V2 patches
causing broken layout. New SVG-based architecture from scratch.

## ✅ What Works Now
- [x] Clean layout (no horizontal scroll)
- [x] All columns visible and properly spaced
- [x] Search functionality
- [x] Year filtering
- [x] Paid/Cashback badges
- [x] Refund button
- [x] Edit float button
- [x] Bulk selection
- [x] Mobile responsive
- [x] No console errors

## 🏗️  Architecture
- Deleted all V1/V2 code (~1000 lines removed)
- Built new SVG-based grid from scratch
- Preserved feature components (badges, dialogs, etc)
- Proper separation of concerns

## 📊 Metrics
- Lines removed: ~1000
- New components: 4 (core grid only)
- File size: ~15KB total (vs ~80KB before)
- Performance: 60 FPS smooth

## 🧪 Testing
- Manual test checklist completed
- All filters work
- All actions work
- No regressions
- Mobile tested

## 🚀 Next Steps
1. Code review (check SVG structure)
2. Staging deployment
3. User testing
4. Merge when ready
```

STEP 2: Add to PR Description

```markdown
## Files Changed
- ✅ NEW: src/components/moneyflow/transaction-list-new.tsx
- ✅ NEW: src/components/moneyflow/transaction-grid-svg.tsx
- ✅ NEW: src/components/moneyflow/transaction-row-svg.tsx
- ✅ UPDATED: src/app/transactions/page.tsx
- ✅ UPDATED: src/app/people/[id]/details/member-detail-view.tsx
- ✅ DELETED: transaction-table.tsx (V1)
- ✅ DELETED: unified-transaction-table.tsx (V2)
- ✅ DELETED: v1/ and v2/ directories

## Screenshots
[Add before/after if possible]

## Related Issues
- Closes: PR #174 (V1/V2 conflict)
- Fixes: Layout completely broken
- Resolves: Technical debt from patching
```

---

FINAL CHECKLIST

✅ All old code deleted
✅ New components created and working
✅ No compile errors
✅ No runtime errors
✅ All features working
✅ Mobile responsive
✅ SVG rendering clean
✅ Performance good (60 FPS)
✅ Tests manual passed
✅ README cleaned (if touched)
✅ Git history clean
✅ PR created with detail

---

SUCCESS CRITERIA

When you're done:
✅ Layout is clean (no horizontal scroll)
✅ No V1/V2 ghost components
✅ All data displays correctly
✅ Search works
✅ Filters work
✅ Badges show
✅ Actions clickable
✅ Mobile works
✅ No console errors
✅ Code is maintainable

---

TIME BREAKDOWN

Part 1 (Inventory): 30 min
Part 2 (Clean Sweep): 1 hour
Part 3 (Rebuild): 4-5 hours
Part 4 (Testing): 1-2 hours
Part 5 (Cleanup): 30 min
Part 6 (PR): 1 hour

TOTAL: 8-10 hours
REALISTIC: 1 full day

---

GO! 🚀

This is a complete reset. You're rebuilding clean, not patching broken code.
The layout will be much better. Trust the process!
"
