# 🚀 Phase 3: Accounts Table Implementation

**Created**: 2026-01-19  
**Status**: Implementation Plan  
**Branch**: `feature/phase-3-accounts-table` (from `main` after Phase 2B merge)  
**Priority**: High (Core module completion)

---

## 📋 Overview

Implement Accounts Table module - a comprehensive account management system with grouping, financial tracking, and transaction history. This phase mirrors People Table v1 architecture with Account-specific features.

**Total Implementation**: 3 phased approaches  
**Estimated Time**: 3-4 days (1.5 days per phase)  
**Scope**: Accounts Table, Row Details, Header, Actions, Grouping, Grid View

---

## 🎯 Accounts Table Architecture

### Data Model

```typescript
// src/types/Account.ts

export interface Account {
  id: string;
  name: string;
  code?: string; // Account code (e.g., "ACC-001")
  description?: string;
  createdDate: Date;
  status: 'active' | 'closed' | 'archived';
  
  // Financial Stats
  totalDue: number; // Total outstanding debt (Due + Spend)
  totalUnsecured: number; // Unsecured loans
  totalSecured: number; // Secured loans (collateral-backed)
  
  // Member Info
  memberCount: number;
  primaryContact?: string;
  
  // Recent Activity
  lastUpdated: Date;
  lastTransaction?: Transaction;
  
  // Metadata
  notes?: string;
  tags?: string[];
  sheetLink?: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'lend' | 'repay' | 'transfer' | 'payment';
  amount: number;
  date: Date;
  description?: string;
  relatedPerson?: {
    id: string;
    name: string;
  };
}

export interface AccountGroup {
  section: 'due-spend' | 'unsecured' | 'secured';
  label: string;
  accounts: Account[];
  totalAmount: number;
}
```

### Table Columns (12 total - Final)

| # | Column | Type | Width | Sortable | Filterable |
|---|--------|------|-------|----------|-----------|
| 1 | **Expand** | Icon | Auto | No | No |
| 2 | **Account** | Text + Badge | 200px | Yes | Yes |
| 3 | **Code** | Text | 100px | Yes | Yes |
| 4 | **Status** | Badge | 100px | Yes | Yes |
| 5 | **Members** | Number | 80px | Yes | Yes |
| 6 | **Due+Spend** | Currency | 120px | Yes | Yes |
| 7 | **Unsecured** | Currency | 120px | Yes | Yes |
| 8 | **Secured** | Currency | 120px | Yes | Yes |
| 9 | **Total** | Currency (Bold) | 120px | Yes | Yes |
| 10 | **Last Updated** | Date | 130px | Yes | Yes |
| 11 | **Sheet** | Link Badge | 80px | No | No |
| 12 | **Actions** | Buttons | 150px | No | No |

### Quick Actions (In Action Column)

```
[Lend] [Repay] [Pay] [Transfer] [Edit] [Delete]
                                ↓
Each opens corresponding slide/modal
```

---

## 🔄 3-Phase Implementation Approach

### Phase 3A: Core Components & Infrastructure (1.5 days)
**Focus**: Foundation - data types, hooks, basic table structure, column config

**Deliverables**:
- Type definitions (`Account.ts`, `Transaction.ts`)
- Column preferences hook
- AccountRow component (without expand details)
- AccountTable skeleton
- Basic styling
- Branch setup

**Go-Live**: No - foundational only

---

### Phase 3B: Table Features & Interactions (1.5 days)
**Focus**: Full table functionality - grouping, expand details, filtering, header

**Deliverables**:
- Grouping logic (Due+Spend / Unsecured / Secured)
- Row grouping headers + footers
- Expand Details UI
- Search + filter
- Header with toggle (Active/Closed)
- Grid view toggle (Table ↔ Grid)
- Basic CRUD slides

**Go-Live**: Yes - feature complete

---

### Phase 3C: Polish & Quick Actions (1.5 days)
**Focus**: Advanced features - quick action slides, transaction history, performance

**Deliverables**:
- Lend slide
- Repay slide
- Pay slide
- Transfer slide
- Recent transactions display
- Transaction history page
- Performance optimizations
- Accessibility improvements

**Go-Live**: Yes - all features ready

---

## 📊 Phase 3A: Core Components & Infrastructure

### A1: Type Definitions

**File**: `src/types/Account.ts`

```typescript
export interface Account {
  id: string;
  name: string;
  code?: string;
  description?: string;
  createdDate: Date;
  status: 'active' | 'closed' | 'archived';
  
  // Financial
  totalDue: number;
  totalUnsecured: number;
  totalSecured: number;
  
  // Members
  memberCount: number;
  primaryContact?: string;
  
  // Activity
  lastUpdated: Date;
  lastTransaction?: Transaction;
  
  // Metadata
  notes?: string;
  tags?: string[];
  sheetLink?: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'lend' | 'repay' | 'transfer' | 'payment';
  amount: number;
  date: Date;
  description?: string;
  relatedPerson?: {
    id: string;
    name: string;
  };
}

export interface AccountGroup {
  section: 'due-spend' | 'unsecured' | 'secured';
  label: string;
  accounts: Account[];
  totalAmount: number;
}

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  order: number;
  locked?: boolean; // For expand/action columns
  width?: string;
  sortable?: boolean;
}
```

**File**: `src/types/Transaction.ts` (Or include in Account.ts)

```typescript
// Transaction type already in Account.ts
// Can be expanded if needed for dedicated transaction features
```

### A2: Column Preferences Hook

**File**: `src/hooks/useAccountColumnPreferences.ts`

```typescript
import { useState, useEffect } from 'react';
import type { ColumnConfig } from '@/types/Account';

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'expand', label: '', visible: true, order: -1, locked: true },
  { key: 'name', label: 'Account', visible: true, order: 0 },
  { key: 'code', label: 'Code', visible: true, order: 1 },
  { key: 'status', label: 'Status', visible: true, order: 2 },
  { key: 'memberCount', label: 'Members', visible: true, order: 3 },
  { key: 'totalDue', label: 'Due+Spend', visible: true, order: 4 },
  { key: 'totalUnsecured', label: 'Unsecured', visible: true, order: 5 },
  { key: 'totalSecured', label: 'Secured', visible: true, order: 6 },
  { key: 'total', label: 'Total', visible: true, order: 7 },
  { key: 'lastUpdated', label: 'Last Updated', visible: true, order: 8 },
  { key: 'sheet', label: '', visible: true, order: 9 },
  { key: 'action', label: 'Actions', visible: true, order: 10, locked: true },
];

export function useAccountColumnPreferences() {
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('accountTableColumns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem('accountTableColumns', JSON.stringify(columns));
  }, [columns]);

  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const reorderColumns = (columns: ColumnConfig[]) => {
    setColumns(columns);
  };

  const visibleColumns = columns.filter((col) => col.visible);

  return {
    columns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
  };
}
```

### A3: AccountRow Component (Basic)

**File**: `src/components/Accounts/AccountRow.tsx`

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Account } from '@/types/Account';

interface AccountRowProps {
  account: Account;
  visibleColumns: any[];
  onEdit?: (account: Account) => void;
  onDelete?: (id: string) => void;
  isExpanded?: boolean;
  onExpandToggle?: () => void;
}

export function AccountRow({
  account,
  visibleColumns,
  onEdit,
  onDelete,
  isExpanded = false,
  onExpandToggle,
}: AccountRowProps) {
  const navigate = useNavigate();

  const handleNameClick = () => {
    navigate(`/accounts/${account.id}/details`);
  };

  const renderCell = (key: string) => {
    switch (key) {
      case 'expand':
        return (
          <button
            className="expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              onExpandToggle?.();
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '►'}
          </button>
        );

      case 'name':
        return (
          <div className="account-name-cell">
            <button
              className="account-name-link"
              onClick={(e) => {
                e.stopPropagation();
                handleNameClick();
              }}
            >
              {account.name}
            </button>
            {account.sheetLink && (
              <a
                href={account.sheetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="sheet-badge"
                title="Open sheet"
              >
                📊
              </a>
            )}
          </div>
        );

      case 'code':
        return account.code || '—';

      case 'status':
        return (
          <span className={`status-badge status-${account.status}`}>
            {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
          </span>
        );

      case 'memberCount':
        return account.memberCount || 0;

      case 'totalDue':
        return `$${(account.totalDue || 0).toFixed(2)}`;

      case 'totalUnsecured':
        return `$${(account.totalUnsecured || 0).toFixed(2)}`;

      case 'totalSecured':
        return `$${(account.totalSecured || 0).toFixed(2)}`;

      case 'total':
        const total =
          (account.totalDue || 0) +
          (account.totalUnsecured || 0) +
          (account.totalSecured || 0);
        return (
          <strong className="total-amount">${total.toFixed(2)}</strong>
        );

      case 'lastUpdated':
        return account.lastUpdated
          ? new Date(account.lastUpdated).toLocaleDateString()
          : '—';

      case 'sheet':
        return null; // Handled in name cell

      case 'action':
        return (
          <div className="action-buttons">
            <button
              className="action-btn edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(account);
              }}
              title="Edit"
              aria-label="Edit"
            >
              ✎
            </button>
            <button
              className="action-btn delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(account.id);
              }}
              title="Delete"
              aria-label="Delete"
            >
              🗑
            </button>
          </div>
        );

      default:
        return '—';
    }
  };

  return (
    <>
      <tr className="account-row">
        {visibleColumns.map((col) => (
          <td key={`${account.id}-${col.key}`} className={`cell-${col.key}`}>
            {renderCell(col.key)}
          </td>
        ))}
      </tr>

      {isExpanded && (
        <tr className="expand-details-row">
          <td colSpan={visibleColumns.length}>
            {/* Placeholder - will be filled in Phase 3B */}
            <div className="expand-placeholder">Expand details coming...</div>
          </td>
        </tr>
      )}
    </>
  );
}
```

### A4: AccountTable Component (Skeleton)

**File**: `src/components/Accounts/AccountTable.tsx`

```typescript
import { useState, useMemo } from 'react';
import { useAccountColumnPreferences } from '@/hooks/useAccountColumnPreferences';
import { AccountRow } from './AccountRow';
import type { Account } from '@/types/Account';

interface AccountTableProps {
  accounts: Account[];
  loading?: boolean;
  onEdit?: (account: Account) => void;
  onDelete?: (id: string) => void;
}

export function AccountTable({
  accounts,
  loading = false,
  onEdit,
  onDelete,
}: AccountTableProps) {
  const { visibleColumns } = useAccountColumnPreferences();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');

  const filteredAccounts = useMemo(() => {
    let result = accounts;

    if (filter === 'active') {
      result = result.filter((a) => a.status === 'active');
    } else if (filter === 'closed') {
      result = result.filter((a) => a.status === 'closed');
    }

    if (search) {
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.code?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return result;
  }, [accounts, filter, search]);

  if (loading) {
    return <div className="table-loading">Loading...</div>;
  }

  return (
    <div className="account-table-container">
      {/* Header will be added in Phase 3B */}
      <div className="table-header-placeholder">
        Header coming in Phase 3B...
      </div>

      <table className="account-table">
        <thead>
          <tr>
            {visibleColumns.map((col) => (
              <th key={col.key} className={`header-${col.key}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredAccounts.length === 0 ? (
            <tr>
              <td colSpan={visibleColumns.length} className="empty-state">
                No accounts found
              </td>
            </tr>
          ) : (
            filteredAccounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                visibleColumns={visibleColumns}
                onEdit={onEdit}
                onDelete={onDelete}
                isExpanded={expandedId === account.id}
                onExpandToggle={() =>
                  setExpandedId((prev) =>
                    prev === account.id ? null : account.id
                  )
                }
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

### A5: Basic Styling

**File**: `src/styles/Accounts.css`

```css
/* ===== Accounts Table Container ===== */
.account-table-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
}

/* ===== Table Structure ===== */
.account-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.account-table thead {
  background-color: var(--color-bg-muted);
  border-bottom: 2px solid var(--color-border);
}

.account-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.account-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 14px;
}

.account-table tbody tr {
  transition: background-color 200ms ease;
}

.account-table tbody tr:hover {
  background-color: var(--color-bg-muted);
}

/* ===== Expand Button ===== */
.expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  transition: all 200ms ease;
  border-radius: var(--radius-md);
}

.expand-btn:hover {
  background-color: var(--color-bg-primary);
}

/* ===== Account Name Cell ===== */
.account-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.account-name-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  transition: color 200ms ease;
}

.account-name-link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.sheet-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 14px;
  opacity: 0.7;
  transition: all 200ms ease;
}

.sheet-badge:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* ===== Status Badge ===== */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: var(--radius-md);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-active {
  background-color: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.status-closed {
  background-color: rgba(156, 163, 175, 0.15);
  color: #6b7280;
}

.status-archived {
  background-color: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

/* ===== Currency Cell ===== */
.total-amount {
  font-weight: 600;
  color: var(--color-primary);
}

/* ===== Action Buttons ===== */
.action-buttons {
  display: flex;
  gap: 6px;
  align-items: center;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 200ms ease;
  border-radius: var(--radius-md);
}

.action-btn:hover {
  background-color: var(--color-bg-muted);
  transform: scale(1.1);
}

.action-btn.delete-btn:hover {
  color: #ef4444;
}

/* ===== Expand Details Row ===== */
.expand-details-row {
  background-color: var(--color-bg-muted);
}

.expand-details-row td {
  padding: 0;
  border: none;
}

.expand-placeholder {
  padding: 20px;
  color: var(--color-text-muted);
  text-align: center;
}

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 40px 16px !important;
}

.table-loading {
  text-align: center;
  padding: 40px;
  color: var(--color-text-muted);
}
```

### A6: Router Setup

**File**: `src/router.tsx` (Add routes)

```typescript
import { AccountsTable } from '@/pages/Accounts/AccountsTable';
import { AccountDetails } from '@/pages/Accounts/AccountDetails';

// Add to routes
{
  path: '/accounts',
  children: [
    { path: '', element: <AccountsTable /> },
    { path: ':id/details', element: <AccountDetails /> },
  ],
}
```

### A7: Main Page Component

**File**: `src/pages/Accounts/AccountsTable.tsx`

```typescript
import { useState, useEffect } from 'react';
import { AccountTable } from '@/components/Accounts/AccountTable';
import type { Account } from '@/types/Account';

export function AccountsTablePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch accounts from API
    fetchAccounts()
      .then(setAccounts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="accounts-page">
      <div className="page-header">
        <h1>Accounts</h1>
      </div>

      <AccountTable
        accounts={accounts}
        loading={loading}
        onEdit={(account) => {
          // Phase 3B: Open edit slide
        }}
        onDelete={(id) => {
          // Phase 3B: Open delete confirmation
        }}
      />
    </div>
  );
}

// Mock fetch - replace with real API call
async function fetchAccounts(): Promise<Account[]> {
  return [
    {
      id: '1',
      name: 'Account 001',
      code: 'ACC-001',
      status: 'active',
      totalDue: 5000,
      totalUnsecured: 3000,
      totalSecured: 2000,
      memberCount: 5,
      lastUpdated: new Date(),
      createdDate: new Date('2025-01-01'),
    },
    // ... more accounts
  ];
}
```

### A8: Branch Setup

```bash
# Ensure Phase 2B is merged to main first
git checkout main
git pull origin main

# Create Phase 3 feature branch
git checkout -b feature/phase-3-accounts-table

# Commit Phase 3A work
git add .
git commit -m "Phase 3A: Core components & infrastructure for Accounts Table"
```

---

## 📊 Phase 3B: Table Features & Interactions

**⚠️ Implementation starts here in PHASE 3B prompt - Do NOT implement Phase 3B yet**

Deliverables in Phase 3B:
- ✅ Grouping (Due+Spend / Unsecured / Secured sections)
- ✅ Row grouping headers + footers
- ✅ Expand Details UI (Financial stats + Recent transactions)
- ✅ Search + Filter dropdown
- ✅ Header with toggle (Active/Closed)
- ✅ Grid view toggle (Table ↔ Grid)
- ✅ Add/Edit account slides
- ✅ Delete confirmation modal

---

## 📊 Phase 3C: Polish & Quick Actions

**⚠️ Implementation starts here in PHASE 3C prompt - Do NOT implement Phase 3C yet**

Deliverables in Phase 3C:
- ✅ Lend slide
- ✅ Repay slide
- ✅ Pay slide
- ✅ Transfer slide
- ✅ Recent transactions display in expand details
- ✅ Transaction history page
- ✅ Performance optimizations
- ✅ Accessibility improvements
- ✅ Error boundaries + error handling

---

## 🎯 Key Principles for Agent

### ⚠️ DO NOT Include Images in Canvas
- **Never embed or reference image URLs** in generated HTML/code
- Images cause token waste and history bloat
- All visual references are in requirements text

### Implementation Guidelines

1. **TypeScript Strict Mode**: All code must be type-safe
2. **Component Reusability**: Mirror People Table v1 patterns
3. **Accessibility**: Keyboard navigation, ARIA labels, semantic HTML
4. **Performance**: useMemo for grouping, lazy load details
5. **Responsive Design**: Mobile-first, works on all breakpoints
6. **Error Handling**: Graceful fallbacks, user feedback

### Code Architecture from People v1

```
src/
├── types/
│   └── Account.ts (Type definitions)
├── hooks/
│   └── useAccountColumnPreferences.ts (Column state)
├── components/
│   └── Accounts/
│       ├── AccountTable.tsx (Main table)
│       ├── AccountRow.tsx (Individual row)
│       ├── AccountGroupHeader.tsx (Phase 3B)
│       ├── AccountRowDetails.tsx (Phase 3B)
│       ├── AccountTableHeader.tsx (Phase 3B)
│       ├── Slides/
│       │   ├── AddAccountSlide.tsx (Phase 3B)
│       │   ├── EditAccountSlide.tsx (Phase 3B)
│       │   ├── LendSlide.tsx (Phase 3C)
│       │   ├── RepaySlide.tsx (Phase 3C)
│       │   ├── PaySlide.tsx (Phase 3C)
│       │   └── TransferSlide.tsx (Phase 3C)
│       └── Views/
│           └── AccountGridView.tsx (Phase 3B)
├── pages/
│   └── Accounts/
│       ├── AccountsTable.tsx (Main page)
│       ├── AccountDetails.tsx (Phase 3B)
│       └── AccountTransactions.tsx (Phase 3C)
└── styles/
    └── Accounts.css (Styling)
```

### Column Order & Importance
Always render in this order: **Expand → Name → Code → Status → Members → Due+Spend → Unsecured → Secured → Total → LastUpdated → Sheet → Actions**

### Data Grouping Logic (Phase 3B)
```typescript
// Group accounts by financial type:
sections: [
  { id: 'due-spend', label: 'Due + Spend', accounts: [...] },
  { id: 'unsecured', label: 'Unsecured Loans', accounts: [...] },
  { id: 'secured', label: 'Secured Loans', accounts: [...] },
]
```

### Testing Checklist

- [ ] No TypeScript errors
- [ ] Components render without warnings
- [ ] Table displays all 12 columns
- [ ] Expand/collapse works
- [ ] Sorting works (Phase 3B)
- [ ] Filtering works (Phase 3B)
- [ ] Responsive on mobile/tablet
- [ ] Keyboard navigation works
- [ ] Sheet links open correctly
- [ ] Action buttons don't interfere with row
- [ ] Performance is smooth (no jank)

---

## 🚀 Getting Started

### Step 1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/phase-3-accounts-table
```

### Step 2: Implement Phase 3A

Follow the components listed above in order:
1. Create type definitions
2. Create hooks
3. Create components
4. Create styles
5. Create router entry
6. Create main page

### Step 3: Commit Phase 3A

```bash
git add .
git commit -m "Phase 3A: Accounts Table core infrastructure & components"
git push origin feature/phase-3-accounts-table
```

### Step 4: Wait for Phase 3B Prompt

Phase 3B will include:
- Table grouping implementation
- Header & filtering
- Grid view toggle
- Expand details
- CRUD slides

---

## 📋 File Checklist (Phase 3A)

- [ ] `src/types/Account.ts` - Created
- [ ] `src/hooks/useAccountColumnPreferences.ts` - Created
- [ ] `src/components/Accounts/AccountRow.tsx` - Created
- [ ] `src/components/Accounts/AccountTable.tsx` - Created
- [ ] `src/styles/Accounts.css` - Created
- [ ] `src/router.tsx` - Updated with /accounts routes
- [ ] `src/pages/Accounts/AccountsTable.tsx` - Created
- [ ] Branch created: `feature/phase-3-accounts-table` - Yes
- [ ] No console errors - Verified
- [ ] TypeScript clean - Verified
- [ ] Components render - Verified

---

## 🎓 Reference Architecture

**Based on**: People Table v1 Phase 2B  
**Pattern**: Same component structure, adapted for Account data model  
**Styling**: Uses same design system (border-radius, colors, spacing)  
**State Management**: React hooks + localStorage for column preferences  
**Data Flow**: Props drilling (Phase 3A), Context (optional Phase 3B+)

---

**Document Status**: Phase 3A Ready for Implementation  
**Last Updated**: 2026-01-19  
**Next Phase**: Phase 3B prompt will follow after Phase 3A completion  
**Branch**: `feature/phase-3-accounts-table`
