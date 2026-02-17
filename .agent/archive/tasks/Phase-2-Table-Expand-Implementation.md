================================================================================
PHASE 2: TABLE WITH EXPAND/COLLAPSE ROW DETAILS
================================================================================

Branch: feature/phase-2-expand-collapse-details
Timeline: 1-2 days
Status: Ready for Implementation
Depends on: Phase 1B Complete (Customize Columns)
Option Selected: OPTION 1 - TABLE WITH EXPAND/COLLAPSE ⭐

================================================================================
MISSION STATEMENT
================================================================================

Implement expandable transaction rows in the Transaction Table.

DESIGN APPROACH:
• Build on existing Phase 1B code (DO NOT DELETE or overwrite)
• Use expand/collapse icon (▼/►) in first column (before Date)
• Clicking row or icon expands to show full transaction details
• Details row contains all fields in 2-column layout
• Animated slide transition (smooth expand/collapse)
• Persist expanded state using simple Map or session state (NOT localStorage)
• Style consistent with existing design tokens

GOAL:
Provide detailed transaction view without navigating away from table.
Allow quick preview of all transaction fields inline.

================================================================================
PHASE 2 DELIVERABLES
================================================================================

Task 1: Create Expandable Row Hook
- [ ] Create useExpandableRows.ts hook
- [ ] Store expanded row IDs (session state, NOT localStorage)
- [ ] Provide methods: toggleRow, isExpanded, clearAll
- [ ] No localStorage persistence (optional: add later)

Task 2: Create Expanded Row Details Component
- [ ] Create TransactionRowDetails.tsx component
- [ ] Display all transaction fields in 2-column layout
- [ ] Show: Date, Amount, Category, Account, Note, Tags, Status
- [ ] Optional: Add related info (budget category, account balance)
- [ ] Style consistent with existing design
- [ ] Smooth height animation on expand

Task 3: Update TransactionTable Structure
- [ ] Add expand/collapse column (first column, before Date)
- [ ] Add expand icon (▼ when expanded, ► when collapsed)
- [ ] Update table header to include expand column
- [ ] Add TransactionRowDetails component below each row
- [ ] Implement click handler for row/icon
- [ ] Smooth animation on expand/collapse

Task 4: Styling & Animation
- [ ] CSS for expand column (narrow, center-aligned)
- [ ] CSS for expand/collapse icon (rotation animation)
- [ ] CSS for details row (full-width, 2-column layout)
- [ ] Height animation: max-height transition on expand
- [ ] Background color for details row (subtle highlight)
- [ ] Responsive design (stack to 1 column on mobile)

Task 5: Integration with Phase 1B
- [ ] Ensure customize columns doesn't affect expand column
- [ ] Expand column always visible (cannot hide)
- [ ] Verify column reordering doesn't break expand functionality
- [ ] Test together: customize + expand

Task 6: Testing & Polish
- [ ] Click row expands details
- [ ] Click again collapses
- [ ] Icon rotates on expand/collapse
- [ ] Animation smooth (no jank)
- [ ] Details show all fields correctly
- [ ] Multiple rows can expand simultaneously
- [ ] Session state works (no persistence)
- [ ] No TypeScript errors
- [ ] Responsive on mobile/tablet

================================================================================
CODE STRUCTURE
================================================================================

src/
├─ components/
│  ├─ Transaction/
│  │  ├─ TransactionTable.tsx (MODIFY: add expand column)
│  │  ├─ TransactionRow.tsx (NEW: single row + details)
│  │  ├─ TransactionRowDetails.tsx (NEW: details 2-column layout)
│  │  ├─ TransactionSlides/
│  │  │  ├─ ... (Phase 1A/1B)
│  │  │  └─ CustomizeColumnsSlide.tsx (unchanged)
│  │  └─ UI/
│  │     └─ ExpandIcon.tsx (NEW: rotating expand/collapse icon)
│  └─ ...
├─ hooks/
│  ├─ useColumnPreferences.ts (Phase 1B)
│  └─ useExpandableRows.ts (NEW)
└─ ...

================================================================================
SLIDE SPECS (EXPANDED ROW LAYOUT)
================================================================================

┌────────────────────────────────────────────────────────────┐
│ ▼ │ Date | Amount | Category | Account | Note | Action    │
├─┼──────────────────────────────────────────────────────────┤
│   │ 2026-01-15 | $150.00 | Groceries | Checking | ... │
├────────────────────────────────────────────────────────────┤
│   │ ┌──────────────────────────────────────────────────┐   │
│   │ │ Transaction Details                            │   │
│   │ ├──────────────────┬──────────────────────────────┤   │
│   │ │ Date             │ 2026-01-15                   │   │
│   │ │ Amount           │ $150.00                      │   │
│   │ │ Category         │ Groceries                    │   │
│   │ │ Account          │ Checking Account             │   │
│   │ ├──────────────────┼──────────────────────────────┤   │
│   │ │ Note             │ Weekly shopping at Costco    │   │
│   │ │ Tags             │ Recurring, Food, Budget      │   │
│   │ │ Status           │ Completed                    │   │
│   │ │ Budget Category  │ Groceries (Budget: $600)     │   │
│   │ └──────────────────┴──────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘

FEATURES:
• Expand icon in first column (clickable)
• Row click also expands
• Details row full-width below each transaction
• 2-column layout for field/value pairs
• Smooth height animation
• Light background color to distinguish from main table
• Responsive: On mobile, stack to single column
• Multiple rows can expand at once

================================================================================
CODE TEMPLATES
================================================================================

------- TEMPLATE 1: useExpandableRows Hook -------

// src/hooks/useExpandableRows.ts

import { useState } from 'react';

export function useExpandableRows() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const isExpanded = (id: string) => {
    return expandedRows.has(id);
  };

  const clearAll = () => {
    setExpandedRows(new Set());
  };

  const expandAll = () => {
    // Can be used later if needed
  };

  return {
    expandedRows,
    toggleRow,
    isExpanded,
    clearAll,
    expandAll,
  };
}

------- TEMPLATE 2: ExpandIcon Component -------

// src/components/Transaction/UI/ExpandIcon.tsx

import React from 'react';
import './ExpandIcon.css';

interface ExpandIconProps {
  isExpanded: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export function ExpandIcon({ isExpanded, onClick }: ExpandIconProps) {
  return (
    <button
      className={`expand-icon-btn ${isExpanded ? 'expanded' : 'collapsed'}`}
      onClick={onClick}
      aria-label={isExpanded ? 'Collapse' : 'Expand'}
      title={isExpanded ? 'Click to collapse' : 'Click to expand'}
    >
      <span className="expand-icon">▼</span>
    </button>
  );
}

------- TEMPLATE 3: TransactionRowDetails Component -------

// src/components/Transaction/TransactionRowDetails.tsx

import React from 'react';
import type { Transaction } from '@/types/transaction';
import './TransactionRowDetails.css';

interface TransactionRowDetailsProps {
  transaction: Transaction;
  isExpanded: boolean;
}

export function TransactionRowDetails({
  transaction,
  isExpanded,
}: TransactionRowDetailsProps) {
  if (!isExpanded) return null;

  const detailFields = [
    {
      label: 'Date',
      value: new Date(transaction.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
    {
      label: 'Amount',
      value: `$${transaction.amount.toFixed(2)}`,
    },
    {
      label: 'Category',
      value: transaction.category,
    },
    {
      label: 'Account',
      value: transaction.account,
    },
    {
      label: 'Note',
      value: transaction.note || '—',
    },
    {
      label: 'Tags',
      value: transaction.tags?.length
        ? transaction.tags.join(', ')
        : '—',
    },
    {
      label: 'Status',
      value: transaction.status || 'Completed',
    },
    {
      label: 'Budget Category',
      value: `${transaction.category} (Budget: $${transaction.budgetAmount?.toFixed(2) || '0.00'})`,
    },
  ];

  return (
    <div className="transaction-row-details-wrapper">
      <div className="transaction-row-details">
        <div className="details-header">
          <h4>Transaction Details</h4>
        </div>
        <div className="details-grid">
          {detailFields.map((field) => (
            <div key={field.label} className="detail-field">
              <div className="detail-label">{field.label}</div>
              <div className="detail-value">{field.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

------- TEMPLATE 4: TransactionRow Component -------

// src/components/Transaction/TransactionRow.tsx

import React from 'react';
import type { Transaction } from '@/types/transaction';
import type { ColumnConfig } from '@/hooks/useColumnPreferences';
import { ExpandIcon } from './UI/ExpandIcon';
import { TransactionRowDetails } from './TransactionRowDetails';
import './TransactionRow.css';

interface TransactionRowProps {
  transaction: Transaction;
  visibleColumns: ColumnConfig[];
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onEdit?: (txn: Transaction) => void;
  onDuplicate?: (txn: Transaction) => void;
  onDelete?: (id: string) => void;
}

export function TransactionRow({
  transaction,
  visibleColumns,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDuplicate,
  onDelete,
}: TransactionRowProps) {
  const handleRowClick = (e: React.MouseEvent) => {
    // Only expand on row click if not clicking action buttons
    const target = e.target as HTMLElement;
    if (!target.closest('.action-cell')) {
      onToggleExpand(transaction.id);
    }
  };

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(transaction.id);
  };

  return (
    <>
      <tr
        className={`transaction-row ${isExpanded ? 'expanded' : ''}`}
        onClick={handleRowClick}
      >
        {/* Expand Column (always first) */}
        <td className="expand-column">
          <ExpandIcon
            isExpanded={isExpanded}
            onClick={handleIconClick}
          />
        </td>

        {/* Dynamic Columns */}
        {visibleColumns.map((col) => (
          <td key={`${transaction.id}-${col.key}`}>
            {col.key === 'action' ? (
              <div className="action-cell">
                {/* Pen, Duplicate, Trash icons */}
                <button
                  className="action-btn edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(transaction);
                  }}
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  className="action-btn duplicate-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate?.(transaction);
                  }}
                  title="Duplicate"
                >
                  ⊡
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(transaction.id);
                  }}
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            ) : (
              renderCell(transaction, col.key)
            )}
          </td>
        ))}
      </tr>

      {/* Expanded Details Row */}
      {isExpanded && (
        <tr className="details-row">
          <td colSpan={visibleColumns.length + 1}>
            <TransactionRowDetails
              transaction={transaction}
              isExpanded={isExpanded}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function renderCell(txn: Transaction, key: string) {
  switch (key) {
    case 'date':
      return new Date(txn.date).toLocaleDateString();
    case 'amount':
      return `$${txn.amount.toFixed(2)}`;
    case 'category':
      return txn.category;
    case 'account':
      return txn.account;
    case 'note':
      return txn.note || '—';
    case 'tags':
      return txn.tags?.join(', ') || '—';
    default:
      return '—';
  }
}

------- TEMPLATE 5: Updated TransactionTable -------

// src/components/Transaction/TransactionTable.tsx (MODIFY)

import React, { useState } from 'react';
import { useColumnPreferences } from '@/hooks/useColumnPreferences';
import { useExpandableRows } from '@/hooks/useExpandableRows';
import { TransactionRow } from './TransactionRow';
import { CustomizeColumnsSlide } from './TransactionSlides/CustomizeColumnsSlide';
import './TransactionTable.css';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit?: (txn: Transaction) => void;
  onDuplicate?: (txn: Transaction) => void;
  onDelete?: (id: string) => void;
}

export function TransactionTable({
  transactions,
  onEdit,
  onDuplicate,
  onDelete,
}: TransactionTableProps) {
  const {
    columns,
    isLoaded,
    toggleColumn,
    reorderColumns,
    savePreferences,
    resetPreferences,
    getVisibleColumns,
  } = useColumnPreferences();

  const {
    isExpanded,
    toggleRow,
    clearAll,
  } = useExpandableRows();

  const [customizeOpen, setCustomizeOpen] = useState(false);

  if (!isLoaded) return <div>Loading...</div>;

  const visibleColumns = getVisibleColumns();

  const handleCustomizeOpen = () => {
    setCustomizeOpen(true);
  };

  const handleCustomizeClose = () => {
    setCustomizeOpen(false);
  };

  const handleCustomizeSave = () => {
    savePreferences();
    handleCustomizeClose();
  };

  return (
    <>
      <div className="transaction-table-container">
        <table className="transaction-table">
          <thead>
            <tr>
              {/* Expand Column Header */}
              <th className="expand-column-header">
                <span className="expand-header-text"></span>
              </th>

              {/* Dynamic Column Headers */}
              {visibleColumns.map((col) => (
                <th key={col.key}>
                  <div className="column-header-content">
                    {col.label}
                    {col.key === 'action' && (
                      <button
                        className="customize-icon-btn"
                        onClick={handleCustomizeOpen}
                        aria-label="Customize columns"
                        title="Customize columns"
                      >
                        ≡
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <TransactionRow
                key={txn.id}
                transaction={txn}
                visibleColumns={visibleColumns}
                isExpanded={isExpanded(txn.id)}
                onToggleExpand={toggleRow}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Customize Columns Slide */}
      <CustomizeColumnsSlide
        columns={columns}
        isOpen={customizeOpen}
        onToggle={toggleColumn}
        onReorder={reorderColumns}
        onSave={handleCustomizeSave}
        onCancel={handleCustomizeClose}
        onReset={resetPreferences}
      />
    </>
  );
}

================================================================================
CSS HINTS (Add to stylesheet)
================================================================================

/* Expand Column */
.expand-column {
  width: 40px;
  text-align: center;
  padding: 12px 8px !important;
}

.expand-column-header {
  width: 40px;
  text-align: center;
  padding: 12px 8px !important;
  background-color: var(--color-bg-surface);
}

/* Expand Icon Button */
.expand-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 12px;
  transition: all 200ms ease;
}

.expand-icon-btn:hover {
  color: var(--color-primary);
  transform: scale(1.1);
}

.expand-icon {
  display: inline-block;
  transition: transform 250ms ease;
}

.expand-icon-btn.expanded .expand-icon {
  transform: rotate(0deg);
}

.expand-icon-btn.collapsed .expand-icon {
  transform: rotate(-90deg);
}

/* Expanded Row */
.transaction-row.expanded {
  background-color: var(--color-bg-muted);
}

.details-row {
  background-color: var(--color-bg-muted);
  border-top: 1px solid var(--color-border);
}

.details-row td {
  padding: 0 !important;
}

/* Transaction Row Details */
.transaction-row-details-wrapper {
  overflow: hidden;
}

.transaction-row-details {
  padding: 20px 16px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  margin: 12px;
}

.details-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.details-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Details Grid - 2 Column Layout */
.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 24px;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 14px;
  color: var(--color-text-primary);
  word-break: break-word;
}

/* Responsive: Mobile */
@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
  }

  .transaction-table {
    font-size: 12px;
  }

  .expand-column {
    width: 32px;
  }

  .transaction-row-details {
    margin: 8px;
    padding: 16px 12px;
  }
}

/* Action Buttons */
.action-cell {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 14px;
  transition: all 200ms ease;
  padding: 0;
}

.action-btn:hover {
  color: var(--color-primary);
  transform: scale(1.15);
}

.action-btn:active {
  transform: scale(0.95);
}

.delete-btn:hover {
  color: var(--color-error);
}

================================================================================
TEST CASES
================================================================================

✓ Click expand icon opens details row
✓ Click row (not action buttons) opens details
✓ Icon rotates on expand/collapse
✓ Details row shows all fields
✓ 2-column layout renders correctly
✓ Multiple rows can expand simultaneously
✓ Clicking expand again collapses row
✓ Animation smooth and not janky
✓ Details height animates smoothly
✓ Action buttons still clickable in expanded row
✓ Customize columns works with expand column
✓ Expand column always visible (cannot hide)
✓ Column reordering doesn't affect expand column
✓ Mobile responsive: details grid to 1 column
✓ No console errors or warnings
✓ TypeScript compilation clean

================================================================================
IMPLEMENTATION CHECKLIST
================================================================================

Step 1: Create Hook
- [ ] Create useExpandableRows.ts
- [ ] Implement Set-based state
- [ ] Export: toggleRow, isExpanded, clearAll
- [ ] No localStorage persistence

Step 2: Create Components
- [ ] Create ExpandIcon.tsx
- [ ] Create TransactionRowDetails.tsx
- [ ] Create TransactionRow.tsx
- [ ] Verify imports and types

Step 3: Update TransactionTable
- [ ] Import new components and hook
- [ ] Add expand column to table header
- [ ] Render TransactionRow for each transaction
- [ ] Add CustomizeColumnsSlide integration

Step 4: Styling
- [ ] Add expand column styles
- [ ] Add expand icon animation
- [ ] Add details row background
- [ ] Add details grid layout
- [ ] Test responsive design

Step 5: Integration
- [ ] Test customize columns + expand together
- [ ] Verify expand column always visible
- [ ] Test action buttons clickability
- [ ] Test row click vs icon click

Step 6: Testing & Polish
- [ ] Manual QA all test cases
- [ ] Fix bugs and edge cases
- [ ] Check TypeScript errors
- [ ] Performance test with many rows

================================================================================
DATA FLOW
================================================================================

User clicks expand icon or row
    ↓
TransactionRow.onToggleExpand(id)
    ↓
useExpandableRows.toggleRow(id)
    ↓
expandedRows Set updated (add/remove id)
    ↓
Component re-renders
    ↓
isExpanded(id) returns true
    ↓
TransactionRow renders details row
    ↓
TransactionRowDetails displayed with fields
    ↓
CSS animation: max-height from 0 to auto
    ↓
Details visible below transaction
    ↓
User clicks again
    ↓
toggleRow removes id from Set
    ↓
isExpanded(id) returns false
    ↓
Details row removed
    ↓
CSS animation: max-height from auto to 0

================================================================================
TIMELINE
================================================================================

Hour 1: Setup & Components
- [ ] Create useExpandableRows hook
- [ ] Create ExpandIcon, TransactionRowDetails, TransactionRow

Hour 2: Integration
- [ ] Update TransactionTable
- [ ] Wire expand toggle
- [ ] Add expand column to header

Hour 3: Styling & Testing
- [ ] Add CSS animations
- [ ] Test all functionality
- [ ] Fix responsive design
- [ ] Polish and bug fixes

================================================================================
IMPORTANT NOTES
================================================================================

1. DO NOT overwrite or delete Phase 1B code
   - Phase 1B (Customize Columns) continues to work
   - Build on top of existing TransactionTable

2. Expand column is ALWAYS visible (cannot hide via customize)
   - Separate from visible columns list
   - Always rendered first in table

3. Session state ONLY (NOT localStorage)
   - Expanded rows reset on page refresh
   - Can add localStorage option later if needed

4. Row click vs Icon click distinction
   - Row click: Expand/collapse details
   - Action button click: Edit/Duplicate/Delete (must prevent row expansion)

5. Multiple rows can expand simultaneously
   - Use Set to track multiple expanded IDs
   - No limit on how many can be open

6. Mobile responsive
   - Details grid: 2 columns on desktop, 1 on mobile
   - Expand column: Narrower on mobile
   - Font sizes: Smaller on mobile

7. Animation performance
   - Use CSS transitions for smooth performance
   - Avoid JS animations that cause jank
   - Test on low-end devices

================================================================================
QUICK REFERENCE
================================================================================

Hook: useExpandableRows()
  • State: Set<string> expandedRows
  • Methods: toggleRow(id), isExpanded(id), clearAll()

Components:
  • ExpandIcon: Rotate animation on expand/collapse
  • TransactionRowDetails: 2-column layout for details
  • TransactionRow: Combines row + details rendering

Styling:
  • Expand column: 40px width, center-aligned
  • Details row: Full-width below transaction
  • Grid: 2 columns (desktop), 1 column (mobile)
  • Animation: 250ms ease on icon rotation

CSS Classes:
  • .expand-column: First column for expand icon
  • .expand-icon-btn: Icon button styling
  • .details-row: Container for expanded details
  • .transaction-row-details: Details wrapper
  • .details-grid: 2-column layout grid

================================================================================
End of Phase 2 Implementation Prompt
Created: 2026-01-19
Status: Ready for Implementation
Dependency: Phase 1B Complete
================================================================================
