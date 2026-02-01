# 🚀 Phase 3B: Accounts Table Features & Interactions

**Created**: 2026-01-19  
**Status**: Implementation Prompt (Phase 3B)  
**Branch**: `feature/phase-3a-account-table-v2` → upgrade to Phase 3B  
**Priority**: High (Feature completion - Go-Live ready)

---

## 📋 Overview

Implement core table features from Phase 3A skeleton:
- **Grouping**: 3 sections (Due+Spend / Unsecured / Secured)
- **Expand Details**: Financial stats + Recent transactions placeholder
- **Header**: Filter (Active/Closed), Search, View toggle (Table ↔ Grid)
- **Grid View**: Alternative grid layout for account cards
- **CRUD Slides**: Add, Edit, Delete for accounts

**Estimated Time**: 1.5 days  
**Deliverables**: 8 major features  
**Go-Live**: Yes - Feature complete table

---

## 🎯 Phase 3B Deliverables Checklist

- [ ] **B1**: AccountGroupHeader component (grouping headers)
- [ ] **B2**: AccountGroupFooter component (section footers)
- [ ] **B3**: Grouping logic in AccountTableV2 (3 sections)
- [ ] **B4**: AccountRowDetailsV2 enhancement (stats + transactions skeleton)
- [ ] **B5**: AccountHeaderV2 enhancement (filter dropdown + search)
- [ ] **B6**: AccountGridView component (grid/card layout)
- [ ] **B7**: View toggle in AccountDirectoryV2 (Table ↔ Grid)
- [ ] **B8**: CRUD Slides (Add/Edit/Delete)
- [ ] **B9**: CSS updates for grouping & grid
- [ ] **B10**: Routing for details page

---

## 📊 B1: AccountGroupHeader Component

**File**: `src/components/Accounts/AccountGroupHeader.tsx` (NEW)

```typescript
interface AccountGroupHeaderProps {
  section: 'due-spend' | 'unsecured' | 'secured';
  label: string;
  accountCount: number;
  totalAmount: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function AccountGroupHeader({
  section,
  label,
  accountCount,
  totalAmount,
  isExpanded,
  onToggle,
}: AccountGroupHeaderProps) {
  return (
    <tr className={`group-header-row group-header-${section}`}>
      <td colSpan={12}>
        <button className="group-toggle" onClick={onToggle}>
          <span className="group-toggle-icon">
            {isExpanded ? '▼' : '►'}
          </span>
          <span className="group-label">{label}</span>
          <span className="group-stats">
            {accountCount} account{accountCount !== 1 ? 's' : ''} •{' '}
            <strong className="group-total">
              ${totalAmount.toFixed(2)}
            </strong>
          </span>
        </button>
      </td>
    </tr>
  );
}
```

---

## 📊 B2: AccountGroupFooter Component

**File**: `src/components/Accounts/AccountGroupFooter.tsx` (NEW)

```typescript
interface AccountGroupFooterProps {
  section: 'due-spend' | 'unsecured' | 'secured';
  accountCount: number;
  totalAmount: number;
}

export function AccountGroupFooter({
  section,
  accountCount,
  totalAmount,
}: AccountGroupFooterProps) {
  return (
    <tr className={`group-footer-row group-footer-${section}`}>
      <td colSpan={12}>
        <div className="group-footer-content">
          <span className="footer-label">
            {accountCount} account{accountCount !== 1 ? 's' : ''}
          </span>
          <span className="footer-total">
            Section Total: <strong>${totalAmount.toFixed(2)}</strong>
          </span>
        </div>
      </td>
    </tr>
  );
}
```

---

## 📊 B3: Grouping Logic in AccountTableV2

**File**: `src/components/Accounts/AccountTableV2.tsx` (UPDATE)

Update the main table to support grouping:

### OLD_STR:
```typescript
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
```

### NEW_STR:
```typescript
// Group accounts by financial section
const groupedAccounts = useMemo(() => {
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

  // Group by financial section (Due+Spend, Unsecured, Secured)
  const groups = {
    'due-spend': {
      section: 'due-spend' as const,
      label: 'Due + Spend Accounts',
      accounts: result.filter((a) => (a.totalDue || 0) > 0),
    },
    unsecured: {
      section: 'unsecured' as const,
      label: 'Unsecured Loans',
      accounts: result.filter(
        (a) => (a.totalUnsecured || 0) > 0 && (a.totalDue || 0) === 0
      ),
    },
    secured: {
      section: 'secured' as const,
      label: 'Secured Loans',
      accounts: result.filter(
        (a) =>
          (a.totalSecured || 0) > 0 &&
          (a.totalDue || 0) === 0 &&
          (a.totalUnsecured || 0) === 0
      ),
    },
  };

  return Object.values(groups).filter((g) => g.accounts.length > 0);
}, [accounts, filter, search]);

// Track which groups are expanded
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
  new Set(['due-spend', 'unsecured', 'secured'])
);

const toggleGroup = (section: string) => {
  setExpandedGroups((prev) => {
    const newSet = new Set(prev);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    return newSet;
  });
};
```

### OLD_STR (Table Body):
```typescript
        <tbody>
          {filteredAccounts.length === 0 ? (
            <tr>
              <td colSpan={visibleColumns.length} className="empty-state">
                No accounts found
              </td>
            </tr>
          ) : (
            filteredAccounts.map((account) => (
              <AccountRowV2
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
```

### NEW_STR (Table Body with Grouping):
```typescript
        <tbody>
          {groupedAccounts.length === 0 ? (
            <tr>
              <td colSpan={visibleColumns.length} className="empty-state">
                No accounts found
              </td>
            </tr>
          ) : (
            groupedAccounts.map((group) => (
              <React.Fragment key={group.section}>
                {/* Group Header */}
                <AccountGroupHeader
                  section={group.section}
                  label={group.label}
                  accountCount={group.accounts.length}
                  totalAmount={group.accounts.reduce((sum, a) => {
                    if (group.section === 'due-spend') {
                      return sum + (a.totalDue || 0);
                    } else if (group.section === 'unsecured') {
                      return sum + (a.totalUnsecured || 0);
                    } else {
                      return sum + (a.totalSecured || 0);
                    }
                  }, 0)}
                  isExpanded={expandedGroups.has(group.section)}
                  onToggle={() => toggleGroup(group.section)}
                />

                {/* Group Accounts */}
                {expandedGroups.has(group.section) && (
                  <>
                    {group.accounts.map((account) => (
                      <AccountRowV2
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
                    ))}

                    {/* Group Footer */}
                    <AccountGroupFooter
                      section={group.section}
                      accountCount={group.accounts.length}
                      totalAmount={group.accounts.reduce((sum, a) => {
                        if (group.section === 'due-spend') {
                          return sum + (a.totalDue || 0);
                        } else if (group.section === 'unsecured') {
                          return sum + (a.totalUnsecured || 0);
                        } else {
                          return sum + (a.totalSecured || 0);
                        }
                      }, 0)}
                    />
                  </>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
```

---

## 📊 B4: AccountRowDetailsV2 Enhancement

**File**: `src/components/Accounts/AccountRowDetailsV2.tsx` (UPDATE)

Replace placeholder with actual financial stats and transaction history:

### OLD_STR:
```typescript
{isExpanded && (
  <tr className="expand-details-row">
    <td colSpan={visibleColumns.length}>
      {/* Placeholder - will be filled in Phase 3B */}
      <div className="expand-placeholder">Expand details coming...</div>
    </td>
  </tr>
)}
```

### NEW_STR:
```typescript
{isExpanded && (
  <tr className="expand-details-row">
    <td colSpan={visibleColumns.length}>
      <AccountRowDetailsV2 account={account} isExpanded={isExpanded} />
    </td>
  </tr>
)}
```

Create component file: `src/components/Accounts/AccountRowDetailsV2.tsx`

```typescript
import type { Account } from '@/types/Account';

interface AccountRowDetailsV2Props {
  account: Account;
  isExpanded: boolean;
}

export function AccountRowDetailsV2({
  account,
  isExpanded,
}: AccountRowDetailsV2Props) {
  if (!isExpanded) return null;

  const totalDebt =
    (account.totalDue || 0) +
    (account.totalUnsecured || 0) +
    (account.totalSecured || 0);

  return (
    <div className="account-row-details-wrapper">
      <div className="account-row-details">
        {/* Financial Stats Section */}
        <div className="details-section">
          <h3 className="section-title">Financial Stats</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <label className="stat-label">Due + Spend</label>
              <p className="stat-value">
                ${(account.totalDue || 0).toFixed(2)}
              </p>
            </div>
            <div className="stat-card">
              <label className="stat-label">Unsecured</label>
              <p className="stat-value">
                ${(account.totalUnsecured || 0).toFixed(2)}
              </p>
            </div>
            <div className="stat-card">
              <label className="stat-label">Secured</label>
              <p className="stat-value">
                ${(account.totalSecured || 0).toFixed(2)}
              </p>
            </div>
            <div className="stat-card total-card">
              <label className="stat-label">Total Outstanding</label>
              <p className="stat-value total">${totalDebt.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Account Details Section */}
        <div className="details-section">
          <h3 className="section-title">Account Details</h3>
          <div className="details-grid">
            <div className="detail-field">
              <label>Account Code</label>
              <p>{account.code || '—'}</p>
            </div>
            <div className="detail-field">
              <label>Status</label>
              <p>
                <span className={`status-badge status-${account.status}`}>
                  {account.status
                    .charAt(0)
                    .toUpperCase() + account.status.slice(1)}
                </span>
              </p>
            </div>
            <div className="detail-field">
              <label>Members</label>
              <p>{account.memberCount || 0}</p>
            </div>
            <div className="detail-field">
              <label>Last Updated</label>
              <p>
                {account.lastUpdated
                  ? new Date(account.lastUpdated).toLocaleDateString()
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Transactions Section (Placeholder for Phase 3C) */}
        <div className="details-section">
          <h3 className="section-title">Recent Transactions</h3>
          <div className="transactions-placeholder">
            <p>Transaction history coming in Phase 3C...</p>
          </div>
        </div>

        {/* Notes Section */}
        {account.notes && (
          <div className="details-section">
            <h3 className="section-title">Notes</h3>
            <p className="notes-text">{account.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 📊 B5: AccountHeaderV2 Enhancement

**File**: `src/components/Accounts/AccountHeaderV2.tsx` (UPDATE/NEW)

Create enhanced header with filter dropdown, search, and view toggle:

```typescript
import { useState } from 'react';

interface AccountHeaderV2Props {
  activeFilter: 'all' | 'active' | 'closed';
  viewMode: 'table' | 'grid';
  searchQuery: string;
  onFilterChange: (filter: 'all' | 'active' | 'closed') => void;
  onViewChange: (mode: 'table' | 'grid') => void;
  onSearchChange: (query: string) => void;
  onAdd: () => void;
  activeCount: number;
  closedCount: number;
}

export function AccountHeaderV2({
  activeFilter,
  viewMode,
  searchQuery,
  onFilterChange,
  onViewChange,
  onSearchChange,
  onAdd,
  activeCount,
  closedCount,
}: AccountHeaderV2Props) {
  const [filterOpen, setFilterOpen] = useState(false);

  const filters = [
    { id: 'all', label: 'All Accounts', count: activeCount + closedCount },
    {
      id: 'active',
      label: 'Active',
      count: activeCount,
      badge: true,
    } as const,
    {
      id: 'closed',
      label: 'Closed',
      count: closedCount,
    },
  ];

  return (
    <div className="account-header-v2">
      {/* Filter Dropdown */}
      <div className="filter-dropdown">
        <button
          className="filter-btn"
          onClick={() => setFilterOpen(!filterOpen)}
        >
          ⚙ Filter
          {activeFilter !== 'all' && (
            <span className="filter-indicator">●</span>
          )}
        </button>

        {filterOpen && (
          <div className="filter-menu">
            {filters.map((filter) => (
              <button
                key={filter.id}
                className={`filter-option ${
                  activeFilter === filter.id ? 'active' : ''
                }`}
                onClick={() => {
                  onFilterChange(filter.id as any);
                  setFilterOpen(false);
                }}
              >
                <span className="filter-label">{filter.label}</span>
                <span className="filter-count">
                  {filter.count}
                  {filter.badge && <span className="badge">●</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Input */}
      <input
        type="text"
        className="search-input"
        placeholder="Search accounts..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="Search accounts"
      />

      {/* View Toggle */}
      <div className="view-toggle">
        <button
          className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
          onClick={() => onViewChange('table')}
          title="Table view"
          aria-label="Switch to table view"
        >
          ≡ Table
        </button>
        <button
          className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => onViewChange('grid')}
          title="Grid view"
          aria-label="Switch to grid view"
        >
          ⊞ Grid
        </button>
      </div>

      {/* Add Button */}
      <button className="btn btn-primary btn-add" onClick={onAdd}>
        + Add Account
      </button>
    </div>
  );
}
```

Update `AccountDirectoryV2.tsx` to pass these props to header and manage state.

---

## 📊 B6: AccountGridView Component

**File**: `src/components/Accounts/AccountGridView.tsx` (NEW)

Create grid/card view for accounts:

```typescript
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Account } from '@/types/Account';

interface AccountGridViewProps {
  accounts: Account[];
  onEdit?: (account: Account) => void;
  onDelete?: (id: string) => void;
}

export function AccountGridView({
  accounts,
  onEdit,
  onDelete,
}: AccountGridViewProps) {
  const navigate = useNavigate();

  const handleNameClick = (id: string) => {
    navigate(`/accounts/${id}/details`);
  };

  return (
    <div className="account-grid-view">
      {accounts.map((account) => {
        const total =
          (account.totalDue || 0) +
          (account.totalUnsecured || 0) +
          (account.totalSecured || 0);

        return (
          <div key={account.id} className="account-card">
            {/* Card Header */}
            <div className="card-header">
              <button
                className="card-title-link"
                onClick={() => handleNameClick(account.id)}
              >
                {account.name}
              </button>
              <span className={`status-badge status-${account.status}`}>
                {account.status === 'active' ? '●' : '○'}
              </span>
            </div>

            {/* Card Body */}
            <div className="card-body">
              {/* Code & Members */}
              <div className="card-meta">
                <span className="meta-item">
                  <strong>{account.code || 'N/A'}</strong>
                </span>
                <span className="meta-item">
                  {account.memberCount} members
                </span>
              </div>

              {/* Financial Stats */}
              <div className="card-stats">
                <div className="stat-mini">
                  <span className="stat-label">Due+Spend</span>
                  <strong>${(account.totalDue || 0).toFixed(2)}</strong>
                </div>
                <div className="stat-mini">
                  <span className="stat-label">Unsecured</span>
                  <strong>${(account.totalUnsecured || 0).toFixed(2)}</strong>
                </div>
                <div className="stat-mini">
                  <span className="stat-label">Secured</span>
                  <strong>${(account.totalSecured || 0).toFixed(2)}</strong>
                </div>
              </div>

              {/* Total */}
              <div className="card-total">
                <span>Total:</span>
                <strong>${total.toFixed(2)}</strong>
              </div>
            </div>

            {/* Card Footer - Actions */}
            <div className="card-footer">
              <button
                className="card-action-btn edit-btn"
                onClick={() => onEdit?.(account)}
                title="Edit"
              >
                ✎
              </button>
              <button
                className="card-action-btn delete-btn"
                onClick={() => onDelete?.(account.id)}
                title="Delete"
              >
                🗑
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## 📊 B7: View Toggle in AccountDirectoryV2

**File**: `src/pages/Accounts/AccountDirectoryV2.tsx` (UPDATE)

### OLD_STR:
```typescript
export function AccountDirectoryV2() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [search, setSearch] = useState('');

  // ... component logic
}
```

### NEW_STR:
```typescript
export function AccountDirectoryV2() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // ... component logic
}
```

### OLD_STR (Return):
```typescript
  return (
    <div className="accounts-directory-v2">
      {/* Placeholder header */}
      <div className="page-header">
        <h1>Accounts</h1>
      </div>

      <AccountTableV2
        accounts={accounts}
        loading={loading}
        filter={filter}
        search={search}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
      />
    </div>
  );
```

### NEW_STR (Return with Header & View Toggle):
```typescript
  const activeCount = accounts.filter((a) => a.status === 'active').length;
  const closedCount = accounts.filter((a) => a.status === 'closed').length;

  return (
    <div className="accounts-directory-v2">
      <div className="page-header">
        <h1>Accounts</h1>
      </div>

      {/* Enhanced Header */}
      <AccountHeaderV2
        activeFilter={filter}
        viewMode={viewMode}
        searchQuery={search}
        onFilterChange={setFilter}
        onViewChange={setViewMode}
        onSearchChange={setSearch}
        onAdd={() => {
          // Phase 3B: Open AddAccountSlide
        }}
        activeCount={activeCount}
        closedCount={closedCount}
      />

      {/* Conditional View - Table or Grid */}
      {viewMode === 'table' ? (
        <AccountTableV2
          accounts={accounts}
          loading={loading}
          filter={filter}
          search={search}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
          onEdit={(account) => {
            // Phase 3B: Open EditAccountSlide
          }}
          onDelete={(id) => {
            // Phase 3B: Open DeleteConfirm
          }}
        />
      ) : (
        <AccountGridView
          accounts={accounts}
          onEdit={(account) => {
            // Phase 3B: Open EditAccountSlide
          }}
          onDelete={(id) => {
            // Phase 3B: Open DeleteConfirm
          }}
        />
      )}

      {/* Slides will be added in Phase 3B */}
    </div>
  );
```

---

## 📊 B8: CRUD Slides (Skeleton for Phase 3B)

Create slide component stubs - full implementation in Phase 3C:

### B8a: AddAccountSlide.tsx

**File**: `src/components/Accounts/Slides/AddAccountSlide.tsx` (NEW)

```typescript
interface AddAccountSlideProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Account>) => void;
}

export function AddAccountSlide({
  isOpen,
  onClose,
  onSubmit,
}: AddAccountSlideProps) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  if (!isOpen) return null;

  return (
    <div className="slide-overlay">
      <div className="slide slide-from-right">
        <div className="slide-header">
          <h2>Add New Account</h2>
          <button
            className="slide-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="slide-body">
          <div className="form-group">
            <label className="form-label">Account Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter account name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Code</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter account code"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="form-control"
              placeholder="Add description"
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
        </div>

        <div className="slide-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onSubmit(formData);
              onClose();
            }}
            disabled={!formData.name}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
```

### B8b: EditAccountSlide.tsx

**File**: `src/components/Accounts/Slides/EditAccountSlide.tsx` (NEW)

```typescript
interface EditAccountSlideProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Account>) => void;
}

export function EditAccountSlide({
  account,
  isOpen,
  onClose,
  onSubmit,
}: EditAccountSlideProps) {
  const [formData, setFormData] = useState({
    name: account?.name || '',
    code: account?.code || '',
    description: account?.description || '',
    status: account?.status || 'active',
  });

  if (!isOpen || !account) return null;

  return (
    <div className="slide-overlay">
      <div className="slide slide-from-right">
        <div className="slide-header">
          <h2>Edit Account</h2>
          <button
            className="slide-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="slide-body">
          <div className="form-group">
            <label className="form-label">Account Name</label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Code</label>
            <input
              type="text"
              className="form-control"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-control"
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as 'active' | 'closed' | 'archived',
                })
              }
            >
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
        </div>

        <div className="slide-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onSubmit(formData);
              onClose();
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
```

### B8c: DeleteConfirmModal.tsx

**File**: `src/components/Accounts/Modals/DeleteConfirmModal.tsx` (NEW)

```typescript
interface DeleteConfirmModalProps {
  account: Account | null;
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  account,
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!isOpen || !account) return null;

  return (
    <div className="modal-overlay">
      <div className="modal modal-danger">
        <div className="modal-header">
          <h2>Delete Account?</h2>
        </div>

        <div className="modal-body">
          <p>
            Are you sure you want to delete <strong>{account.name}</strong>?
          </p>
          <p className="warning-text">
            This action cannot be undone. All associated data will be removed.
          </p>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 📊 B9: CSS Updates for Grouping & Grid

**File**: `src/styles/Accounts.css` (UPDATE - ADD SECTIONS)

### Grouping Styles

```css
/* ===== Group Headers ===== */
.group-header-row {
  background-color: var(--color-bg-muted);
  border-top: 2px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
}

.group-header-row td {
  padding: 0 !important;
}

.group-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  transition: all 200ms ease;
}

.group-toggle:hover {
  background-color: var(--color-bg-primary);
}

.group-toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  font-size: 10px;
  transition: transform 200ms ease;
}

.group-label {
  flex: 1;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 12px;
}

.group-stats {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.group-total {
  color: var(--color-primary);
  margin-left: 4px;
}

/* ===== Group Footers ===== */
.group-footer-row {
  background-color: rgba(var(--color-bg-muted-rgb), 0.5);
  border-bottom: 2px solid var(--color-border);
  font-weight: 500;
}

.group-footer-row td {
  padding: 12px 16px !important;
}

.group-footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.footer-total {
  font-weight: 600;
  color: var(--color-text-primary);
}

/* ===== Grid View ===== */
.account-grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 0;
}

.account-card {
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 200ms ease;
}

.account-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-muted);
}

.card-title-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 600;
  font-size: 16px;
  text-decoration: none;
  transition: color 200ms ease;
  text-align: left;
}

.card-title-link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.card-body {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.meta-item {
  display: inline-block;
  padding: 4px 8px;
  background-color: var(--color-bg-muted);
  border-radius: var(--radius-md);
}

.card-stats {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.stat-mini {
  display: flex;
  flex-direction: column;
  padding: 8px;
  background-color: var(--color-bg-muted);
  border-radius: var(--radius-md);
  text-align: center;
}

.stat-mini .stat-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.stat-mini strong {
  font-size: 14px;
  color: var(--color-text-primary);
}

.card-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: rgba(var(--color-primary-rgb), 0.1);
  border-radius: var(--radius-md);
  font-weight: 600;
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
}

.card-total strong {
  color: var(--color-primary);
  font-size: 18px;
}

.card-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  background-color: var(--color-bg-muted);
}

.card-action-btn {
  flex: 1;
  padding: 8px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  transition: all 200ms ease;
}

.card-action-btn:hover {
  background-color: var(--color-bg-primary);
  border-color: var(--color-primary);
}

.card-action-btn.delete-btn:hover {
  color: #ef4444;
  border-color: #ef4444;
}

/* ===== Header Styles ===== */
.account-header-v2 {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
}

.filter-dropdown {
  position: relative;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 200ms ease;
}

.filter-btn:hover {
  background-color: var(--color-bg-primary);
  border-color: var(--color-primary);
}

.filter-indicator {
  color: var(--color-primary);
  font-size: 8px;
}

.filter-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 200px;
}

.filter-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  transition: all 200ms ease;
  border-bottom: 1px solid var(--color-border);
}

.filter-option:last-child {
  border-bottom: none;
}

.filter-option:hover {
  background-color: var(--color-bg-muted);
}

.filter-option.active {
  background-color: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  font-weight: 600;
}

.filter-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.filter-count .badge {
  color: var(--color-error);
  font-size: 8px;
}

.search-input {
  flex: 1;
  min-width: 250px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.view-toggle {
  display: flex;
  gap: 4px;
  background-color: var(--color-bg-muted);
  padding: 4px;
  border-radius: var(--radius-md);
}

.view-btn {
  padding: 6px 12px;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 200ms ease;
}

.view-btn.active {
  background-color: var(--color-bg-surface);
  color: var(--color-primary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.view-btn:hover:not(.active) {
  color: var(--color-text-primary);
}

.btn-add {
  white-space: nowrap;
}

/* ===== Expand Details ===== */
.account-row-details-wrapper {
  padding: 20px 16px;
}

.account-row-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.stat-card {
  padding: 12px;
  background-color: var(--color-bg-muted);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.stat-card.total-card {
  border: 2px solid var(--color-primary);
  background-color: rgba(var(--color-primary-rgb), 0.05);
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.stat-value.total {
  color: var(--color-primary);
  font-size: 20px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.detail-field {
  padding: 12px;
  background-color: var(--color-bg-muted);
  border-radius: var(--radius-md);
}

.detail-field label {
  font-size: 11px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 6px;
}

.detail-field p {
  font-size: 14px;
  color: var(--color-text-primary);
  margin: 0;
  font-weight: 500;
}

.transactions-placeholder {
  padding: 20px;
  text-align: center;
  background-color: var(--color-bg-muted);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  font-size: 13px;
}

.notes-text {
  padding: 12px;
  background-color: var(--color-bg-muted);
  border-radius: var(--radius-md);
  line-height: 1.5;
  color: var(--color-text-primary);
}

/* ===== Modal Styles ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  max-width: 500px;
  width: 90%;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-body {
  padding: 20px;
}

.modal-body p {
  margin: 0 0 12px 0;
  color: var(--color-text-primary);
  line-height: 1.5;
}

.modal-body p:last-child {
  margin-bottom: 0;
}

.warning-text {
  color: var(--color-error) !important;
  font-size: 12px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid var(--color-border);
}

.modal-footer .btn {
  min-width: 100px;
}

.btn-danger {
  background-color: var(--color-error);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #dc2626;
}
```

---

## 📊 B10: AccountDetails Page (Skeleton)

**File**: `src/pages/Accounts/AccountDetailsPage.tsx` (NEW)

Create details page that links from grid/table:

```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { Account } from '@/types/Account';

export function AccountDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch account details from API
    fetchAccountDetail(id!)
      .then(setAccount)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!account) return <div>Account not found</div>;

  return (
    <div className="account-details-page">
      <button
        className="btn-back"
        onClick={() => navigate('/accounts/v2')}
      >
        ← Back to Accounts
      </button>

      <div className="details-header">
        <h1>{account.name}</h1>
        <span className={`status-badge status-${account.status}`}>
          {account.status}
        </span>
      </div>

      {/* Full details coming in Phase 3C */}
      <p>Full account details page coming in Phase 3C...</p>
    </div>
  );
}
```

---

## ✅ Implementation Checklist (Phase 3B)

- [ ] **B1**: AccountGroupHeader component created
- [ ] **B2**: AccountGroupFooter component created
- [ ] **B3**: Grouping logic implemented in AccountTableV2
- [ ] **B4**: AccountRowDetailsV2 enhanced with stats
- [ ] **B5**: AccountHeaderV2 created with filter & search
- [ ] **B6**: AccountGridView component created
- [ ] **B7**: View toggle (Table ↔ Grid) working
- [ ] **B8**: Add/Edit/Delete slides created (skeletons)
- [ ] **B9**: CSS updated (grouping, grid, header, modal)
- [ ] **B10**: AccountDetailsPage created (skeleton)

### Testing Checklist

- [ ] No TypeScript errors
- [ ] Grouping displays 3 sections correctly
- [ ] Section headers/footers show correct counts & totals
- [ ] Expand details shows financial stats
- [ ] Filter dropdown works (Active/Closed)
- [ ] Search filters accounts
- [ ] View toggle switches Table ↔ Grid
- [ ] Grid cards display properly on mobile
- [ ] Add/Edit/Delete slides open
- [ ] Sheet links work correctly
- [ ] No console errors

---

## 🚀 Getting Started (Phase 3B)

### Step 1: Update Branch

```bash
git checkout feature/phase-3a-account-table-v2
git pull origin feature/phase-3a-account-table-v2
```

### Step 2: Create Components

Implement in this order:
1. B1: AccountGroupHeader.tsx
2. B2: AccountGroupFooter.tsx
3. B3: Update AccountTableV2 (grouping logic)
4. B4: Update AccountRowDetailsV2
5. B5: Create AccountHeaderV2
6. B6: Create AccountGridView
7. B7: Update AccountDirectoryV2 (toggle)
8. B8: Create CRUD slides
9. B9: Update Accounts.css
10. B10: Create AccountDetailsPage

### Step 3: Test Each Component

After each component:
```bash
# Check for errors
npm run type-check

# Test in browser at /accounts/v2
```

### Step 4: Commit Phase 3B

```bash
git add .
git commit -m "Phase 3B: Table features - grouping, header, grid view, CRUD slides"
git push origin feature/phase-3a-account-table-v2
```

---

## 📋 Files Created/Updated (Phase 3B)

### New Files
- `src/components/Accounts/AccountGroupHeader.tsx`
- `src/components/Accounts/AccountGroupFooter.tsx`
- `src/components/Accounts/AccountRowDetailsV2.tsx`
- `src/components/Accounts/AccountHeaderV2.tsx`
- `src/components/Accounts/AccountGridView.tsx`
- `src/components/Accounts/Slides/AddAccountSlide.tsx`
- `src/components/Accounts/Slides/EditAccountSlide.tsx`
- `src/components/Accounts/Modals/DeleteConfirmModal.tsx`
- `src/pages/Accounts/AccountDetailsPage.tsx`

### Updated Files
- `src/components/Accounts/AccountTableV2.tsx` (Add grouping)
- `src/pages/Accounts/AccountDirectoryV2.tsx` (Add header, toggle)
- `src/router.tsx` (Add /accounts/:id/details route)
- `src/styles/Accounts.css` (Add grouping, grid, header, modal)

---

## 🎯 Key Implementation Notes

### ⚠️ DO NOT Include Images in Canvas
- No image URLs or image references
- All visual requirements in text

### Grouping Logic Rules
- **Due+Spend**: Accounts where `totalDue > 0`
- **Unsecured**: Accounts where `totalUnsecured > 0` AND `totalDue === 0`
- **Secured**: Accounts where `totalSecured > 0` AND other fields are 0

### Grid Responsive
- Mobile: 1 column (300px min)
- Tablet: 2 columns
- Desktop: 3+ columns

### Accessibility
- All buttons have `aria-label`
- Filter has `aria-label`
- Keyboard navigation works (Tab through controls)
- ARIA attributes for status badges

### Performance
- Use `useMemo` for grouping logic
- Lazy load details on expand
- Minimize re-renders (use React.Fragment for groups)

---

## 🔄 Phase 3C Preview (Don't implement yet)

Phase 3C will include:
- ✅ Lend/Repay/Pay/Transfer slides (full)
- ✅ Recent transactions in expand details
- ✅ Transaction history page
- ✅ Performance optimizations
- ✅ Error boundaries + error handling

---

## 📊 Current Status

**Phase 3A**: ✅ Complete  
**Phase 3B**: 🚀 Ready for Implementation  
**Phase 3C**: ⏳ Waiting for Phase 3B completion

---

**Document Status**: Phase 3B Ready for Implementation  
**Last Updated**: 2026-01-19  
**Next Phase**: Phase 3C prompt after Phase 3B completion  
**Branch**: `feature/phase-3a-account-table-v2`
