# 🚀 Phase 2B Enhance Plan: People Implementation UI/UX Refinements

**Created**: 2026-01-19  
**Status**: Enhancement Requirements  
**Branch**: `feature/phase-2b-refactor-people-impl`  
**Priority**: High (UX consistency, feature completion)

---

## 📋 Overview

Phase 2B implementation completed with core features but requires UX/UI enhancements to match design expectations and add missing features.

**Total Enhancements**: 10 major improvements  
**Estimated Time**: 1-2 days  
**Scope**: People Table, Expand Details, Header, Data Display

---

## 🎯 Enhancement Issues & Solutions

---

### **ISSUE #1: Avatar Border-Radius (UI Polish)**

**Current State**  
- Avatar elements have border-radius (rounded) but expectation is sharp/square with slight radius

**Problem**  
- Visual inconsistency with mockup (Img 2, Img 3)
- Avatar should be less rounded or square

**Solution**  

Find in `PeopleRow.tsx` or styling:
```css
/* Current (WRONG) */
.person-avatar {
  border-radius: 50%; /* Full circle */
}

/* Expected (CORRECT) */
.person-avatar {
  border-radius: 6px; /* Slight rounded square, not circle */
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: white;
}
```

**Files to Update**
- [ ] `src/components/People/PeopleRow.tsx` (Avatar rendering)
- [ ] `src/styles/People.css` or component-scoped styles

**Test**  
- Avatar displays as rounded square (not circle)
- Consistent across all people rows

---

### **ISSUE #2: Subscribe Details Column (Data Display)**

**Current State**  
- Subscribe column shows only count ("1 active")
- Missing subscription details/types

**Expected State**  
```
Subscribe: YouTube x2, iCloud x2
(Shows breakdown of subscriptions by type and count)
```

**Problem**  
- Incomplete data display
- User can't see subscription types at a glance

**Solution**

Create new component or update cell rendering:

```typescript
// src/components/People/SubscriptionBadges.tsx

interface SubscriptionBadgesProps {
  subscriptions: Array<{
    type: string;
    count: number;
  }>;
  maxDisplay?: number; // Default: 2
}

export function SubscriptionBadges({
  subscriptions,
  maxDisplay = 2,
}: SubscriptionBadgesProps) {
  const displayed = subscriptions.slice(0, maxDisplay);
  const remaining = subscriptions.length - maxDisplay;

  return (
    <div className="subscription-badges">
      {displayed.map((sub) => (
        <span key={sub.type} className="subscription-badge">
          {sub.type} <span className="count">x{sub.count}</span>
        </span>
      ))}
      {remaining > 0 && (
        <span className="subscription-more">+{remaining} more</span>
      )}
    </div>
  );
}
```

**CSS**
```css
.subscription-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.subscription-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: var(--color-bg-muted);
  color: var(--color-text-secondary);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.subscription-badge .count {
  color: var(--color-text-muted);
  font-weight: 600;
}

.subscription-more {
  font-size: 12px;
  color: var(--color-text-muted);
}
```

**Data Model Update**
```typescript
interface Person {
  id: string;
  name: string;
  // ... other fields
  subscriptions?: Array<{
    type: string; // 'YouTube', 'iCloud', 'Netflix', etc.
    count: number; // How many of this type
    status: 'active' | 'expired';
  }>;
}
```

**Files to Update**
- [ ] `src/components/People/SubscriptionBadges.tsx` (NEW)
- [ ] `src/components/People/PeopleRow.tsx` (Import & use)
- [ ] `src/components/People/PeopleRowDetails.tsx` (Show details)
- [ ] `src/types/Person.ts` (Add subscription interface)

**Test**  
- Subscriptions show as badges with type + count
- Multiple subscriptions displayed
- Truncated with "+N more" if needed

---

### **ISSUE #3: Debt Calculation in Expand Details (Data Logic)**

**Current State**  
- Outstanding debt (nợ) calculated in expand details rows
- Should be calculated in main row instead

**Expected State**
- Outstanding debt shows in main row **REMAINS** column
- Expand details shows:
  - **Current Cycle Debt** (nợ hiện tại)
  - **Previous Debt** (nợ cũ)
  - **Total Outstanding** (tổng nợ)

**Problem**  
- Main row doesn't show debt overview
- User must expand to see debt

**Solution**

Update `PeopleRow.tsx` to calculate debt before expand:

```typescript
// src/components/People/PeopleRow.tsx

function calculateOutstandingDebt(person: Person): number {
  if (!person.currentCycleDebt && !person.previousDebt) {
    return 0;
  }
  return (person.currentCycleDebt || 0) + (person.previousDebt || 0);
}

export function PeopleRow({
  person,
  // ... other props
}: PeopleRowProps) {
  const outstandingDebt = calculateOutstandingDebt(person);

  return (
    <>
      <tr className="people-row">
        {/* Expand Column */}
        <td className="expand-column">
          <ExpandIcon isExpanded={isExpanded} onClick={handleIconClick} />
        </td>

        {/* Main Row - Columns */}
        {visibleColumns.map((col) => (
          <td key={`${person.id}-${col.key}`}>
            {col.key === 'remains' && (
              <span className={`debt-badge ${outstandingDebt > 0 ? 'outstanding' : 'settled'}`}>
                ${outstandingDebt.toFixed(2)}
              </span>
            )}
            {/* ... other columns */}
          </td>
        ))}
      </tr>

      {/* Expand Details Row */}
      {isExpanded && (
        <tr className="details-row">
          <td colSpan={visibleColumns.length + 1}>
            <PeopleRowDetails
              person={person}
              isExpanded={isExpanded}
            />
          </td>
        </tr>
      )}
    </>
  );
}
```

**Update `PeopleRowDetails.tsx`**:

```typescript
// src/components/People/PeopleRowDetails.tsx

export function PeopleRowDetails({
  person,
  isExpanded,
}: PeopleRowDetailsProps) {
  if (!isExpanded) return null;

  const currentCycleDebt = person.currentCycleDebt || 0;
  const previousDebt = person.previousDebt || 0;
  const totalDebt = currentCycleDebt + previousDebt;

  const detailFields = [
    // ... other fields
    {
      label: 'Current Cycle Debt',
      value: `${currentCycleDebt > 0 ? '—' : '—'}`,
      category: 'financial-stats',
    },
    {
      label: 'Previous Debt',
      value: `${previousDebt > 0 ? '—' : '—'}`,
      category: 'financial-stats',
    },
    {
      label: 'Total Outstanding',
      value: `${totalDebt > 0 ? '$' + totalDebt.toFixed(2) : 'Settled'}`,
      category: 'financial-stats',
      highlight: true,
    },
  ];

  return (
    <div className="people-row-details-wrapper">
      <div className="people-row-details">
        {/* ... existing details */}
      </div>
    </div>
  );
}
```

**CSS**
```css
.debt-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
}

.debt-badge.outstanding {
  background-color: rgba(255, 84, 89, 0.15);
  color: #ff5459;
}

.debt-badge.settled {
  background-color: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.detail-field.highlight {
  background-color: var(--color-bg-muted);
  padding: 8px;
  border-radius: 4px;
  font-weight: 600;
}
```

**Files to Update**
- [ ] `src/components/People/PeopleRow.tsx`
- [ ] `src/components/People/PeopleRowDetails.tsx`
- [ ] `src/types/Person.ts` (Add debt fields if missing)

**Test**  
- Remains column shows total debt (current + previous)
- Expand details shows breakdown
- Styling reflects debt status (outstanding/settled)

---

### **ISSUE #4: Quick Action Buttons (Lend, Repay)**

**Current State**  
- Only "Edit" button visible in actions
- Missing "Lend" and "Repay" quick buttons

**Expected State**
```
[Lend] [Repay] [Edit] [Delete]
(Quick action buttons in main row)
```

**Problem**  
- Users must open edit slide to perform quick actions
- Workflow inefficient

**Solution**

Update action buttons in `PeopleRow.tsx`:

```typescript
// src/components/People/PeopleRow.tsx

interface PeopleRowProps {
  person: Person;
  // ... other props
  onLend?: (person: Person) => void;
  onRepay?: (person: Person) => void;
  onEdit?: (person: Person) => void;
  onDelete?: (id: string) => void;
}

export function PeopleRow({
  person,
  onLend,
  onRepay,
  onEdit,
  onDelete,
  // ... other props
}: PeopleRowProps) {
  return (
    <tr className="people-row">
      {/* ... columns */}

      {/* Actions Column */}
      <td className="action-column">
        <div className="action-buttons">
          {/* Lend Button */}
          <button
            className="action-btn lend-btn"
            onClick={(e) => {
              e.stopPropagation();
              onLend?.(person);
            }}
            title="Lend money"
            aria-label="Lend"
          >
            💰
          </button>

          {/* Repay Button */}
          <button
            className="action-btn repay-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRepay?.(person);
            }}
            title="Repay debt"
            aria-label="Repay"
          >
            ✓
          </button>

          {/* Edit Button */}
          <button
            className="action-btn edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(person);
            }}
            title="Edit"
            aria-label="Edit"
          >
            ✎
          </button>

          {/* Delete Button */}
          <button
            className="action-btn delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(person.id);
            }}
            title="Delete"
            aria-label="Delete"
          >
            🗑
          </button>
        </div>
      </td>
    </tr>
  );
}
```

**Create Lend/Repay Slides**

```typescript
// src/components/People/PeopleSlides/LendSlide.tsx

interface LendSlideProps {
  person: Person;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, note?: string) => void;
}

export function LendSlide({
  person,
  isOpen,
  onClose,
  onSubmit,
}: LendSlideProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  return (
    <div className="slide-overlay">
      <div className="slide slide-from-right">
        <div className="slide-header">
          <h2>Lend to {person.name}</h2>
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
            <label className="form-label">Amount</label>
            <input
              type="number"
              className="form-control"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <textarea
              className="form-control"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note"
              rows={4}
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
              onSubmit(parseFloat(amount), note);
              onClose();
            }}
            disabled={!amount}
          >
            Confirm Lend
          </button>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// src/components/People/PeopleSlides/RepaySlide.tsx

interface RepaySlideProps {
  person: Person;
  outstandingDebt: number;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, note?: string) => void;
}

export function RepaySlide({
  person,
  outstandingDebt,
  isOpen,
  onClose,
  onSubmit,
}: RepaySlideProps) {
  const [amount, setAmount] = useState(outstandingDebt.toString());
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  return (
    <div className="slide-overlay">
      <div className="slide slide-from-right">
        <div className="slide-header">
          <h2>Repay {person.name}</h2>
          <button
            className="slide-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="slide-body">
          <div className="alert alert-info">
            Outstanding Debt: <strong>${outstandingDebt.toFixed(2)}</strong>
          </div>

          <div className="form-group">
            <label className="form-label">Repay Amount</label>
            <input
              type="number"
              className="form-control"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="0"
              step="0.01"
              max={outstandingDebt}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <textarea
              className="form-control"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note"
              rows={4}
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
              onSubmit(parseFloat(amount), note);
              onClose();
            }}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            Confirm Repay
          </button>
        </div>
      </div>
    </div>
  );
}
```

**CSS**
```css
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
  border-radius: 4px;
}

.action-btn:hover {
  background-color: var(--color-bg-muted);
  transform: scale(1.1);
}

.action-btn.lend-btn:hover {
  color: #10b981;
}

.action-btn.repay-btn:hover {
  color: #3b82f6;
}

.action-btn.delete-btn:hover {
  color: #ef4444;
}
```

**Files to Update**
- [ ] `src/components/People/PeopleRow.tsx`
- [ ] `src/components/People/PeopleSlides/LendSlide.tsx` (NEW)
- [ ] `src/components/People/PeopleSlides/RepaySlide.tsx` (NEW)
- [ ] `src/components/People/PeopleTable.tsx` (Handle callbacks)
- [ ] `src/types/Person.ts` (Add transaction types)

**Test**  
- Lend button opens LendSlide
- Repay button opens RepaySlide (with pre-filled amount)
- Slides submit and update person data
- Buttons don't interfere with row expand

---

### **ISSUE #5: Remove Email Column (Data Model)**

**Current State**  
- Email column displayed in table
- Email stored in database

**Expected State**  
- Email removed from table view
- Email removed from database model
- Email removed from all People components

**Problem**  
- Unnecessary column clutter
- Contact via other means (phone, links)

**Solution**

1. **Update Type Definition**

```typescript
// src/types/Person.ts

export interface Person {
  id: string;
  name: string;
  phone?: string;
  // ❌ REMOVE: email?: string;
  role?: string;
  department?: string;
  joinDate?: Date;
  status?: 'active' | 'inactive' | 'archived';
  currentCycleDebt?: number;
  previousDebt?: number;
  notes?: string;
  tags?: string[];
  subscriptions?: Subscription[];
  sheetLink?: string;
}
```

2. **Update Column Preferences**

```typescript
// src/hooks/usePeopleColumnPreferences.ts

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Name', visible: true, order: 0 },
  { key: 'phone', label: 'Phone', visible: true, order: 1 },
  // ❌ REMOVE: { key: 'email', label: 'Email', visible: true, order: 2 },
  { key: 'role', label: 'Role', visible: true, order: 2 },
  { key: 'status', label: 'Status', visible: true, order: 3 },
  { key: 'remains', label: 'Remains', visible: true, order: 4 },
  { key: 'action', label: 'Action', visible: true, order: 5, locked: true },
];
```

3. **Update PeopleRow**

```typescript
// src/components/People/PeopleRow.tsx - renderCell function

function renderCell(person: Person, key: string) {
  switch (key) {
    case 'name':
      return person.name;
    case 'phone':
      return person.phone || '—';
    // ❌ REMOVE: case 'email': return person.email || '—';
    case 'role':
      return person.role || '—';
    case 'status':
      return <StatusBadge status={person.status} />;
    case 'remains':
      return `$${calculateOutstandingDebt(person).toFixed(2)}`;
    default:
      return '—';
  }
}
```

4. **Update Forms (Add/Edit Slides)**

Remove email input fields from:
- `AddPersonSlide.tsx`
- `EditPersonSlide.tsx`

**Files to Update**
- [ ] `src/types/Person.ts` (Remove email)
- [ ] `src/hooks/usePeopleColumnPreferences.ts` (Remove column)
- [ ] `src/components/People/PeopleRow.tsx` (Remove case)
- [ ] `src/components/People/PeopleRowDetails.tsx` (Remove field)
- [ ] `src/components/People/PeopleSlides/AddPersonSlide.tsx` (Remove input)
- [ ] `src/components/People/PeopleSlides/EditPersonSlide.tsx` (Remove input)
- [ ] Database/API (Remove email field)

**Test**  
- Email column not visible
- Email input not in forms
- No console errors
- Data persistence without email

---

### **ISSUE #6: Details Page Navigation**

**Current State**  
- No way to open details page
- All details shown inline in expand row

**Expected State**
```
Click on person name or link icon → /people/{id}/details
Dedicated details page showing:
- Full person profile
- Financial stats
- Transaction history
- Contact information
```

**Problem**  
- User can't view full person profile
- Details page doesn't exist

**Solution**

1. **Create Details Page**

```typescript
// src/pages/People/PeopleDetails.tsx

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { Person } from '@/types/Person';

export function PeopleDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch person data from API
    fetchPerson(id!).then(setPerson).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!person) return <div>Person not found</div>;

  return (
    <div className="people-details-page">
      {/* Header */}
      <div className="details-header">
        <button className="btn-back" onClick={() => navigate('/people')}>
          ← Back
        </button>
        <div className="person-hero">
          <div className="person-avatar">{person.name.charAt(0)}</div>
          <h1>{person.name}</h1>
          <p className="person-subtitle">{person.role || 'Member'}</p>
        </div>
      </div>

      {/* Content */}
      <div className="details-content">
        {/* Contact Section */}
        <section className="section">
          <h2>Contact Information</h2>
          <div className="section-content">
            <div className="field">
              <label>Phone</label>
              <p>{person.phone || '—'}</p>
            </div>
            <div className="field">
              <label>Role</label>
              <p>{person.role || '—'}</p>
            </div>
            <div className="field">
              <label>Status</label>
              <p>
                <StatusBadge status={person.status} />
              </p>
            </div>
          </div>
        </section>

        {/* Financial Section */}
        <section className="section">
          <h2>Financial Stats</h2>
          <div className="section-content">
            <div className="stat-card">
              <label>Current Cycle Debt</label>
              <p className="stat-value">
                ${person.currentCycleDebt?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="stat-card">
              <label>Previous Debt</label>
              <p className="stat-value">
                ${person.previousDebt?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="stat-card highlight">
              <label>Total Outstanding</label>
              <p className="stat-value">
                $
                {(
                  (person.currentCycleDebt || 0) +
                  (person.previousDebt || 0)
                ).toFixed(2)}
              </p>
            </div>
          </div>
        </section>

        {/* Subscriptions Section */}
        <section className="section">
          <h2>Subscriptions</h2>
          <div className="section-content">
            {person.subscriptions?.length ? (
              <SubscriptionBadges subscriptions={person.subscriptions} />
            ) : (
              <p>No subscriptions</p>
            )}
          </div>
        </section>

        {/* Notes Section */}
        <section className="section">
          <h2>Notes</h2>
          <div className="section-content">
            <p>{person.notes || 'No notes'}</p>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="details-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/people')}>
            Close
          </button>
          <button className="btn btn-primary" onClick={() => navigate(`/people/${id}/edit`)}>
            Edit Person
          </button>
        </div>
      </div>
    </div>
  );
}
```

2. **Update Router**

```typescript
// src/router.tsx

import { PeopleDetails } from '@/pages/People/PeopleDetails';

const routes = [
  // ... other routes
  {
    path: '/people',
    children: [
      { path: '', element: <PeopleTable /> },
      { path: ':id/details', element: <PeopleDetails /> },
      { path: ':id/edit', element: <EditPersonPage /> },
    ],
  },
];
```

3. **Update PeopleRow to Link to Details**

```typescript
// src/components/People/PeopleRow.tsx

export function PeopleRow({
  person,
  // ... other props
}: PeopleRowProps) {
  const navigate = useNavigate();

  const handleNameClick = () => {
    navigate(`/people/${person.id}/details`);
  };

  return (
    <tr className="people-row" onClick={handleRowClick}>
      {/* ... expand column */}

      {/* Name Column - Clickable */}
      <td className="name-column">
        <button
          className="name-link"
          onClick={(e) => {
            e.stopPropagation();
            handleNameClick();
          }}
        >
          {person.name}
        </button>
      </td>

      {/* ... other columns */}
    </tr>
  );
}
```

**CSS**
```css
.name-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
  transition: color 200ms ease;
}

.name-link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.people-details-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.details-header {
  margin-bottom: 32px;
}

.btn-back {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 16px;
}

.person-hero {
  display: flex;
  align-items: center;
  gap: 20px;
}

.person-avatar {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  background-color: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 600;
}

.details-content {
  display: grid;
  gap: 32px;
}

.section {
  border-top: 1px solid var(--color-border);
  padding-top: 20px;
}

.section h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.section-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.field,
.stat-card {
  padding: 12px;
  background-color: var(--color-bg-surface);
  border-radius: 6px;
}

.field label,
.stat-card label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  display: block;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.stat-card.highlight {
  background-color: var(--color-bg-muted);
  border: 2px solid var(--color-primary);
}

.details-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
}
```

**Files to Create/Update**
- [ ] `src/pages/People/PeopleDetails.tsx` (NEW)
- [ ] `src/pages/People/PeopleEdit.tsx` (NEW)
- [ ] `src/router.tsx` (Add routes)
- [ ] `src/components/People/PeopleRow.tsx` (Add click handler)

**Test**  
- Click person name → Navigate to /people/{id}/details
- Details page loads person data
- Back button works
- All sections display correctly

---

### **ISSUE #7: Header Restructure (UI/UX)**

**Current State**
- Title: "PEOPLE DIRECTORY Members"
- Filter buttons scattered: Outstanding Debt, Settled, Archived, Groups
- Search bar separate
- Add button separate

**Expected State**
```
┌─────────────────────────────────────────────────────┐
│ [≡ Filter] [Search people...] [+ Add]              │
├─────────────────────────────────────────────────────┤
│ People Table                                        │
```

**Problem**  
- Header too verbose
- Filter buttons take up space
- Not modern/compact

**Solution**

1. **Create New Header Component**

```typescript
// src/components/People/PeopleTableHeader.tsx

interface PeopleTableHeaderProps {
  activeFilter?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: string) => void;
  onAdd: () => void;
}

export function PeopleTableHeader({
  activeFilter,
  searchQuery,
  onSearchChange,
  onFilterChange,
  onAdd,
}: PeopleTableHeaderProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const filters = [
    { id: 'all', label: 'All Members', count: 0 },
    { id: 'outstanding', label: 'Outstanding Debt', count: 15, badge: true },
    { id: 'settled', label: 'Settled', count: 9 },
    { id: 'archived', label: 'Archived', count: 2 },
  ];

  return (
    <div className="people-table-header">
      {/* Filter Dropdown */}
      <div className="filter-dropdown">
        <button
          className="filter-btn"
          onClick={() => setFilterOpen(!filterOpen)}
        >
          ≡ Filter
          {activeFilter && activeFilter !== 'all' && (
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
                  onFilterChange(filter.id);
                  setFilterOpen(false);
                }}
              >
                <span>{filter.label}</span>
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
        placeholder="Search people..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      {/* Add Button */}
      <button className="btn btn-primary btn-add" onClick={onAdd}>
        + Add
      </button>
    </div>
  );
}
```

2. **Update PeopleTable to Use New Header**

```typescript
// src/components/People/PeopleTable.tsx

export function PeopleTable() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const filteredPeople = useMemo(() => {
    let result = people;

    // Apply filter
    if (filter === 'outstanding') {
      result = result.filter(
        (p) => (p.currentCycleDebt || 0) + (p.previousDebt || 0) > 0
      );
    } else if (filter === 'settled') {
      result = result.filter(
        (p) => (p.currentCycleDebt || 0) + (p.previousDebt || 0) === 0
      );
    } else if (filter === 'archived') {
      result = result.filter((p) => p.status === 'archived');
    }

    // Apply search
    if (search) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return result;
  }, [filter, search]);

  return (
    <div className="people-table-container">
      {/* New Compact Header */}
      <PeopleTableHeader
        activeFilter={filter}
        searchQuery={search}
        onSearchChange={setSearch}
        onFilterChange={setFilter}
        onAdd={() => setAddOpen(true)}
      />

      {/* Table */}
      <table className="people-table">
        {/* ... table content */}
      </table>

      {/* Add Slide */}
      <AddPersonSlide isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
```

3. **CSS Styling**

```css
.people-table-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background-color: var(--color-bg-surface);
  border-radius: 8px;
}

.filter-dropdown {
  position: relative;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
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
  border-radius: 6px;
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
  font-size: 14px;
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
  gap: 6px;
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
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.btn-add {
  white-space: nowrap;
}
```

**Update Tab Title**

```typescript
// In main App or layout component
useEffect(() => {
  document.title = 'People';
}, []);
```

**Files to Update**
- [ ] `src/components/People/PeopleTableHeader.tsx` (NEW)
- [ ] `src/components/People/PeopleTable.tsx` (Use header, add filter logic)
- [ ] `src/App.tsx` or main layout (Update tab title)

**Test**  
- Header displays compactly
- Filter dropdown works
- Search filters people
- Tab title shows "People"
- No old labels visible

---

### **ISSUE #8: Row Group Headers (Account Grouping)**

**Current State**  
- All people listed flat
- No grouping by account

**Expected State**  
```
Account 1234                          (Group Header Row)
├─ My                Settled    $...
├─ Tuấn              Settled    $...
└─ [Total: $...]                 (Group Footer)

Account 5678                          (Group Header Row)
├─ Lâm               Outstanding $...
├─ Thảo              Outstanding $...
└─ [Total: $...]                 (Group Footer)
```

**Problem**  
- No visual grouping
- Hard to see account relationships

**Solution**

1. **Create Group Row Component**

```typescript
// src/components/People/PeopleGroupHeader.tsx

interface PeopleGroupHeaderProps {
  accountId: string;
  accountName: string;
  memberCount: number;
  totalDebt: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function PeopleGroupHeader({
  accountId,
  accountName,
  memberCount,
  totalDebt,
  isExpanded,
  onToggle,
}: PeopleGroupHeaderProps) {
  return (
    <tr className="group-header-row">
      <td colSpan={6}>
        <button className="group-toggle" onClick={onToggle}>
          <span className="group-toggle-icon">
            {isExpanded ? '▼' : '►'}
          </span>
          <span className="group-name">{accountName}</span>
          <span className="group-info">
            {memberCount} members • Total: ${totalDebt.toFixed(2)}
          </span>
        </button>
      </td>
    </tr>
  );
}

interface PeopleGroupFooterProps {
  totalDebt: number;
  memberCount: number;
}

export function PeopleGroupFooter({
  totalDebt,
  memberCount,
}: PeopleGroupFooterProps) {
  return (
    <tr className="group-footer-row">
      <td colSpan={6}>
        <div className="group-footer-content">
          <span>{memberCount} people</span>
          <span className="group-total">Total: ${totalDebt.toFixed(2)}</span>
        </div>
      </td>
    </tr>
  );
}
```

2. **Update PeopleTable to Group**

```typescript
// src/components/People/PeopleTable.tsx

export function PeopleTable() {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['all'])
  );

  // Group people by account
  const groupedPeople = useMemo(() => {
    const groups: Record<
      string,
      {
        accountId: string;
        accountName: string;
        members: Person[];
      }
    > = {};

    filteredPeople.forEach((person) => {
      const accountId = person.accountId || 'default';
      const accountName = person.accountName || 'Default Account';

      if (!groups[accountId]) {
        groups[accountId] = {
          accountId,
          accountName,
          members: [],
        };
      }

      groups[accountId].members.push(person);
    });

    return Object.values(groups);
  }, [filteredPeople]);

  const toggleGroup = (accountId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  return (
    <table className="people-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Role</th>
          <th>Status</th>
          <th>Remains</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {groupedPeople.map((group) => (
          <React.Fragment key={group.accountId}>
            {/* Group Header */}
            <PeopleGroupHeader
              accountId={group.accountId}
              accountName={group.accountName}
              memberCount={group.members.length}
              totalDebt={group.members.reduce(
                (sum, p) =>
                  sum +
                  ((p.currentCycleDebt || 0) + (p.previousDebt || 0)),
                0
              )}
              isExpanded={expandedGroups.has(group.accountId)}
              onToggle={() => toggleGroup(group.accountId)}
            />

            {/* Group Members */}
            {expandedGroups.has(group.accountId) && (
              <>
                {group.members.map((person) => (
                  <PeopleRow
                    key={person.id}
                    person={person}
                    // ... other props
                  />
                ))}

                {/* Group Footer */}
                <PeopleGroupFooter
                  memberCount={group.members.length}
                  totalDebt={group.members.reduce(
                    (sum, p) =>
                      sum +
                      ((p.currentCycleDebt || 0) +
                        (p.previousDebt || 0)),
                    0
                  )}
                />
              </>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}
```

3. **CSS Styling**

```css
.group-header-row {
  background-color: var(--color-bg-muted);
  border-top: 2px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
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
  width: 24px;
  font-size: 12px;
  transition: transform 200ms ease;
}

.group-name {
  flex: 1;
  text-align: left;
}

.group-info {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 400;
}

.group-footer-row {
  background-color: rgba(var(--color-bg-muted-rgb), 0.5);
  border-bottom: 2px solid var(--color-border);
}

.group-footer-row td {
  padding: 12px 16px;
}

.group-footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.group-total {
  font-weight: 600;
  color: var(--color-text-primary);
}
```

**Files to Update**
- [ ] `src/components/People/PeopleGroupHeader.tsx` (NEW)
- [ ] `src/components/People/PeopleGroupFooter.tsx` (Can be same file)
- [ ] `src/components/People/PeopleTable.tsx` (Add grouping logic)
- [ ] `src/types/Person.ts` (Add accountId, accountName fields)

**Test**  
- Groups displayed with headers
- Groups collapse/expand
- Group footers show totals
- Responsive on mobile

---

### **ISSUE #9: Sheet Link Badges**

**Current State**  
- No sheet link visible
- Sheet data not shown

**Expected State**
```
Name: John [Sheet Link Badge]
(Name clickable → Details page, Badge links to sheet)
```

**Problem**  
- Sheet link not accessible
- No indication sheet exists

**Solution**

1. **Create Sheet Badge Component**

```typescript
// src/components/People/SheetLinkBadge.tsx

interface SheetLinkBadgeProps {
  sheetUrl: string;
  sheetName?: string;
}

export function SheetLinkBadge({
  sheetUrl,
  sheetName = 'View Sheet',
}: SheetLinkBadgeProps) {
  return (
    <a
      href={sheetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="sheet-link-badge"
      title="Open in Google Sheets"
    >
      <span className="sheet-icon">📊</span>
      <span className="sheet-label">{sheetName}</span>
    </a>
  );
}
```

2. **Update PeopleRow**

```typescript
// src/components/People/PeopleRow.tsx

export function PeopleRow({
  person,
  // ... other props
}: PeopleRowProps) {
  return (
    <tr className="people-row">
      {/* Expand Column */}
      <td className="expand-column">
        <ExpandIcon isExpanded={isExpanded} onClick={handleIconClick} />
      </td>

      {/* Name Column with Sheet Badge */}
      <td className="name-column">
        <div className="name-with-badge">
          <button
            className="name-link"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/people/${person.id}/details`);
            }}
          >
            {person.name}
          </button>
          {person.sheetLink && (
            <SheetLinkBadge
              sheetUrl={person.sheetLink}
              sheetName="Sheet"
            />
          )}
        </div>
      </td>

      {/* ... other columns */}
    </tr>
  );
}
```

3. **Update Row Details**

```typescript
// src/components/People/PeopleRowDetails.tsx

const detailFields = [
  // ... existing fields
  ...(person.sheetLink ? [{
    label: 'Sheet Link',
    value: (
      <a
        href={person.sheetLink}
        target="_blank"
        rel="noopener noreferrer"
        className="sheet-link"
      >
        Open Sheet →
      </a>
    ),
  }] : []),
];
```

4. **CSS Styling**

```css
.name-with-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sheet-link-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: rgba(52, 168, 224, 0.15);
  color: #34a8e0;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 200ms ease;
}

.sheet-link-badge:hover {
  background-color: rgba(52, 168, 224, 0.25);
  transform: translateY(-2px);
}

.sheet-icon {
  font-size: 12px;
}

.sheet-label {
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sheet-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
  transition: color 200ms ease;
}

.sheet-link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}
```

5. **Update Type**

```typescript
// src/types/Person.ts

export interface Person {
  id: string;
  name: string;
  // ... other fields
  sheetLink?: string; // URL to Google Sheet
  accountId?: string;
  accountName?: string;
}
```

**Files to Update**
- [ ] `src/components/People/SheetLinkBadge.tsx` (NEW)
- [ ] `src/components/People/PeopleRow.tsx` (Display badge)
- [ ] `src/components/People/PeopleRowDetails.tsx` (Show link)
- [ ] `src/types/Person.ts` (Add sheetLink field)

**Test**  
- Sheet badges visible next to names
- Badge opens sheet in new tab
- Badge styling matches design
- Details page shows sheet link
- Responsive on mobile

---

### **ISSUE #10: Avatar & UI Polish (Border Radius Verification)**

**Current State**  
- Various border-radius values across components
- Inconsistent styling

**Expected State**  
- Consistent border-radius throughout
- Avatar: 6px (rounded square)
- Cards: 8px
- Buttons: 6px
- Inputs: 6px

**Solution**

Update design tokens:

```css
:root {
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 6px; /* Avatar, buttons, inputs */
  --radius-lg: 8px; /* Cards, containers */
  --radius-full: 9999px; /* Pills, full circles if needed */

  /* Apply to components */
}

/* Avatar */
.person-avatar {
  border-radius: var(--radius-md);
}

/* Cards */
.group-header-row,
.detail-card {
  border-radius: var(--radius-lg);
}

/* Buttons */
.btn,
.filter-btn,
.action-btn {
  border-radius: var(--radius-md);
}

/* Inputs */
.form-control,
.search-input {
  border-radius: var(--radius-md);
}
```

**Files to Update**
- [ ] `src/styles/design-tokens.css` (Update radius variables)
- [ ] All component CSS files (Use variables)

---

## 🔄 Implementation Priority & Timeline

### Phase 1: Critical Issues (Day 1)
1. ✅ **ISSUE #1**: Avatar border-radius (30 min)
2. ✅ **ISSUE #5**: Remove email column (1 hour)
3. ✅ **ISSUE #3**: Debt calculation in main row (1 hour)

**Subtotal: 2.5 hours**

### Phase 2: Major Features (Day 2)
4. ✅ **ISSUE #4**: Quick action buttons (Lend/Repay) (2 hours)
5. ✅ **ISSUE #2**: Subscribe details (1 hour)
6. ✅ **ISSUE #9**: Sheet link badges (1 hour)

**Subtotal: 4 hours**

### Phase 3: UI Restructure & Navigation (Day 3)
7. ✅ **ISSUE #7**: Header restructure (2 hours)
8. ✅ **ISSUE #8**: Row group headers (2 hours)
9. ✅ **ISSUE #6**: Details page navigation (1.5 hours)
10. ✅ **ISSUE #10**: Border-radius polish (30 min)

**Subtotal: 6 hours**

**Total: ~12.5 hours (approximately 1-2 developer days)**

---

## 📋 Implementation Checklist

### All Issues
- [ ] #1: Avatar border-radius fixed
- [ ] #2: Subscribe details showing breakdown
- [ ] #3: Debt calculated in main row
- [ ] #4: Lend & Repay buttons functional
- [ ] #5: Email column removed from DB & UI
- [ ] #6: Details page accessible via name click
- [ ] #7: Header compact with filter dropdown
- [ ] #8: Row group headers with collapse/expand
- [ ] #9: Sheet link badges displayed
- [ ] #10: Border-radius consistency verified

### Quality Assurance
- [ ] No console errors/warnings
- [ ] TypeScript: Clean compilation
- [ ] All navigation working
- [ ] Responsive on mobile/tablet
- [ ] Accessibility: Keyboard nav working
- [ ] Performance: No jank on expand/collapse
- [ ] All slides functional
- [ ] Data persistence working

---

## 🚀 Starting Enhancements

### Step 1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/phase-2b-enhance-ui-ux
```

### Step 2: Follow This Roadmap

Implement issues in priority order (Phase 1 → Phase 2 → Phase 3)

### Step 3: Test After Each Issue

- Manual QA after each issue
- Console check
- Responsive check

### Step 4: Commit Frequently

```bash
git commit -m "Fix #1: Avatar border-radius to 6px rounded square"
git commit -m "Fix #5: Remove email column from People table"
git commit -m "Fix #3: Move debt calculation to main row"
# ... etc
```

### Step 5: Merge

```bash
git push origin feature/phase-2b-enhance-ui-ux
# Create PR
# Review & merge
```

---

## 📊 Files Summary

### New Files to Create
- `src/components/People/SubscriptionBadges.tsx`
- `src/components/People/SheetLinkBadge.tsx`
- `src/components/People/PeopleTableHeader.tsx`
- `src/components/People/PeopleGroupHeader.tsx`
- `src/components/People/PeopleSlides/LendSlide.tsx`
- `src/components/People/PeopleSlides/RepaySlide.tsx`
- `src/pages/People/PeopleDetails.tsx`
- `src/pages/People/PeopleEdit.tsx`

### Files to Modify
- `src/components/People/PeopleRow.tsx`
- `src/components/People/PeopleRowDetails.tsx`
- `src/components/People/PeopleTable.tsx`
- `src/hooks/usePeopleColumnPreferences.ts`
- `src/types/Person.ts`
- `src/router.tsx`
- `src/styles/People.css`
- `src/styles/design-tokens.css`

### Files to Remove/Update (Database/API)
- Remove email field from schema
- Add currentCycleDebt, previousDebt fields
- Add subscriptions array
- Add sheetLink field
- Add accountId, accountName fields

---

## 🎓 Key Takeaways

1. **Phased approach**: Break into 3 phases by complexity
2. **Real data**: Debt, subscriptions, sheet links
3. **Component reuse**: Badges, icons, buttons
4. **Grouping**: Account-based grouping improves UX
5. **Navigation**: Details page + links provide discoverability
6. **Polish**: Consistent spacing, radius, animations

---

**Document Status**: Ready for Enhancement Implementation  
**Last Updated**: 2026-01-19  
**Next Step**: Start Phase 1 (Critical Issues) following priority order
