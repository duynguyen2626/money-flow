# Implementation Plan: Transaction Table V4

**Status:** Awaiting Design Phase Completion  
**Date Created:** Jan 25, 2026  
**Target Start:** After design approval  
**Estimated Duration:** 2-3 days  
**Owner:** Implementation Agent (Code)

---

## Overview

This document outlines how to implement the new transaction table design once design phase is complete. **DO NOT START CODING UNTIL DESIGN IS APPROVED.**

---

## Pre-Implementation Checklist

Before starting any code, verify:

- [ ] Design mockups reviewed and understood
- [ ] Component specifications documented
- [ ] Responsive breakpoints defined
- [ ] Visual design system specified (colors, spacing, typography)
- [ ] All design questions answered
- [ ] No blockers identified
- [ ] Implementation time estimated accurately

**If any checkbox is unchecked, ask design agent for clarification.**

---

## Branch & Repository Setup

### Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b feat/table-ui-redesign-v4
```

### File Structure
```
src/
├── components/
│   ├── moneyflow/
│   │   ├── transaction-table-v4.tsx          # NEW: Main table component
│   │   ├── transaction-table-v4-header.tsx   # NEW: Table header
│   │   ├── transaction-table-v4-row.tsx      # NEW: Table row component
│   │   ├── transaction-table-v4-cells.tsx    # NEW: Specialized cell renderers
│   │   ├── transaction-table-v4-actions.tsx  # NEW: Action buttons/menu
│   │   └── __tests__/
│   │       └── transaction-table-v4.test.ts  # NEW: Tests
│   │
│   ├── transactions/
│   │   └── TransactionsPageV4.tsx            # NEW: Route wrapper
│   │
│   └── [existing files unchanged]
│
└── app/
    └── transactions/
        └── v4/                                # NEW: Optional - for side-by-side testing
            └── page.tsx                       # NEW: Test route
```

---

## Implementation Strategy

### Phase 1: Component Structure (3-4 hours)

**Goal:** Build component skeleton with mockup data

**Steps:**

1. **Create Table Wrapper Component** (`transaction-table-v4.tsx`)
   ```typescript
   // Props interface
   interface TransactionTableV4Props {
     transactions: TransactionWithDetails[]
     onEdit?: (txn: Transaction) => void
     onDelete?: (txnId: string) => void
     loading?: boolean
     error?: string | null
   }

   // Component structure
   - Render header (from spec)
   - Render body rows (loop transactions)
   - Render footer (pagination/summary)
   - Handle loading state
   - Handle empty state
   - Handle error state
   ```

2. **Create Table Header Component** (`transaction-table-v4-header.tsx`)
   - Render all column headers per design spec
   - Show column names, alignment, widths
   - Handle sorting indicators (if sort enabled)
   - Responsive: Hide/show columns per breakpoint

3. **Create Table Row Component** (`transaction-table-v4-row.tsx`)
   - Render single transaction row
   - Apply correct styling per design
   - Handle row states (hover, selected, disabled)
   - Show status indicator (left border color)
   - Responsive: Adapt for mobile if needed

4. **Create Cell Components** (`transaction-table-v4-cells.tsx`)
   - DateCell: Render date and time
   - TypeCell: Render type badge with color
   - AccountCell: Render account with icon (if available)
   - PersonCell: Render person name or empty
   - MerchantCell: Render shop image + name
   - NoteCell: Render note text (with truncation)
   - AmountCell: Render BASE amount with color
   - NetValueCell: Render net amount + cashback %
   - ActionCell: Render action buttons/menu

5. **Create Actions Component** (`transaction-table-v4-actions.tsx`)
   - Edit button
   - Copy ID button
   - Delete button
   - More menu (if needed)
   - Handle click events (pass to parent)

**Testing:** Verify with mockup data, no database calls yet

**Mockup Data to Use:**
```typescript
const mockTransactions = [
  {
    id: 'txn-001',
    occurred_at: '2026-01-20T11:30:00Z',
    type: 'expense',
    shop_name: 'Msb mDigi',
    shop_image_url: 'https://via.placeholder.com/32',
    account_id: 'acc-1',
    account: { name: 'Tpbank', image_url: null },
    destination_account_id: null,
    person_id: 'p-1',
    person: { name: 'Ba Út', avatar_url: null },
    amount: 67000,
    final_price: 53600,
    cashback_share_percent: 0.2,
    note: 'cà phê sữa',
    category_id: 'cat-1',
    category: { name: 'FOOD&DRINK' },
    status: 'active',
    // ... other fields
  },
  // 10-15 more sample transactions with variety
]
```

---

### Phase 2: Styling & Responsiveness (4-5 hours)

**Goal:** Match design specifications exactly

**Steps:**

1. **Typography**
   - Apply font sizes per spec (header, body, badges, etc.)
   - Apply font weights (bold, semibold, normal, etc.)
   - Apply colors (text colors per field type)
   - Test readability at different sizes

2. **Spacing & Layout**
   - Apply padding (cells, rows)
   - Apply gaps (between columns)
   - Verify row height matches spec
   - Check alignment (left, center, right per column)
   - Verify whitespace effectiveness

3. **Colors & Styling**
   - Type badges: Apply colors for EXPENSE, PAID, TF, LEND, IN
   - Status indicators: Left border colors (green, gray, amber)
   - Hover states: Row background color
   - Selected state: Checkbox + row highlight
   - Voided/disabled: Opacity + strikethrough or muted colors

4. **Responsive Design**
   ```
   Desktop (1200px+):
   - All columns visible
   - Full width table
   - Normal spacing

   Tablet (768px-1200px):
   - Hide optional columns [per spec - which ones?]
   - Reduce padding slightly
   - Smaller fonts (10-20% reduction)

   Mobile (<768px):
   - Simplified layout [per spec design]
   - Stack data vertically (card layout) or simplified columns
   - Larger touch targets (44px minimum)
   - Horizontal scroll or different layout
   ```

5. **Interactive States**
   - Hover: Highlight row background (subtle)
   - Focus: Focus ring on interactive elements
   - Selected: Checkbox checked + row highlighted
   - Loading: Skeleton or opacity
   - Empty: Large, clear messaging

**Tailwind Classes Reference:**
- Spacing: `p-3`, `gap-3`, `px-4 py-3`
- Colors: `text-slate-900`, `bg-emerald-50`, `border-slate-200`
- Responsiveness: `md:hidden`, `lg:table-cell`, `sm:text-xs lg:text-sm`

**Testing:**
- [ ] Visual comparison with design mockups at 1200px
- [ ] Responsive behavior at 768px (tablet)
- [ ] Responsive behavior at 375px (mobile)
- [ ] Print layout (if needed)
- [ ] All interactive states work visually

---

### Phase 3: Business Logic Integration (1 day)

**Goal:** Connect to real data and implement all interactions

**Steps:**

1. **Data Loading**
   ```typescript
   // Import service
   import { getUnifiedTransactions } from '@/services/transaction.service'
   import { getAccounts } from '@/services/account.service'
   import { getPeople } from '@/services/people.service'

   // Load in server component or use useEffect in client
   const [transactions, setTransactions] = useState([])
   useEffect(() => {
     getUnifiedTransactions({ limit: 1000 })
       .then(data => setTransactions(data))
   }, [])
   ```

2. **Sorting**
   ```typescript
   // Add sort state
   const [sortBy, setSortBy] = useState('date')
   const [sortOrder, setSortOrder] = useState('desc')

   // Implement sorting logic
   const sortedData = useMemo(() => {
     return [...transactions].sort((a, b) => {
       // Sort logic per column
     })
   }, [transactions, sortBy, sortOrder])
   ```

3. **Filtering**
   ```typescript
   // Add filter states
   const [typeFilter, setTypeFilter] = useState('all')
   const [dateRange, setDateRange] = useState(null)
   const [searchText, setSearchText] = useState('')

   // Implement filter logic
   const filteredData = useMemo(() => {
     return sortedData.filter(txn => {
       if (typeFilter !== 'all' && txn.type !== typeFilter) return false
       if (searchText && !txn.note?.includes(searchText)) return false
       // ... more filters
       return true
     })
   }, [sortedData, typeFilter, dateRange, searchText])
   ```

4. **Selection & Bulk Actions**
   ```typescript
   // Selection state
   const [selected, setSelected] = useState<Set<string>>(new Set())

   // Handle checkbox changes
   const toggleSelection = (txnId: string) => {
     const newSelected = new Set(selected)
     if (newSelected.has(txnId)) {
       newSelected.delete(txnId)
     } else {
       newSelected.add(txnId)
     }
     setSelected(newSelected)
   }

   // Bulk actions
   const handleVoidSelected = async () => {
     for (const id of selected) {
       await voidTransaction(id)
     }
     setSelected(new Set())
     // Refresh data
   }
   ```

5. **Single Row Actions**
   ```typescript
   // Edit action
   const handleEdit = (txn: Transaction) => {
     // Open edit form/modal
     setEditingTxn(txn)
     setShowEditModal(true)
   }

   // Delete action
   const handleDelete = async (txnId: string) => {
     if (confirm('Delete transaction?')) {
       await deleteTransaction(txnId)
       // Refresh data
     }
   }

   // Copy ID action
   const handleCopyId = (txnId: string) => {
     navigator.clipboard.writeText(txnId)
     // Show toast
   }
   ```

6. **Pagination** (if needed)
   ```typescript
   const [page, setPage] = useState(1)
   const pageSize = 50

   const paginatedData = useMemo(() => {
     const start = (page - 1) * pageSize
     const end = start + pageSize
     return filteredData.slice(start, end)
   }, [filteredData, page, pageSize])

   const totalPages = Math.ceil(filteredData.length / pageSize)
   ```

7. **Server Actions Integration**
   ```typescript
   // Use existing server actions
   import { voidTransactionAction } from '@/actions/transaction-actions'
   import { deleteTransaction } from '@/actions/transaction-actions'

   // Call with error handling
   const handleVoid = async (txnId: string) => {
     try {
       const result = await voidTransactionAction(txnId)
       if (result.success) {
         toast.success('Transaction voided')
         // Refresh
       } else {
         toast.error(result.error)
       }
     } catch (err) {
       toast.error('Error voiding transaction')
     }
   }
   ```

**Testing:**
- [ ] Data loads correctly
- [ ] Sorting works for each column
- [ ] Filters work and refresh data
- [ ] Selection state preserved
- [ ] Actions execute without errors
- [ ] Data refreshes after mutations
- [ ] Error handling works
- [ ] Large dataset (1000+) loads with acceptable performance

---

### Phase 4: Polish & Optimization (4-6 hours)

**Goal:** Refinement, performance, accessibility

**Steps:**

1. **Visual Polish**
   - [ ] Fine-tune spacing between elements
   - [ ] Smooth transitions on hover/interaction
   - [ ] Loading skeleton for better UX
   - [ ] Empty state messaging
   - [ ] Error state messaging and recovery
   - [ ] Toast/notification styling
   - [ ] Modal/dialog styling (if used)

2. **Performance Optimization**
   - [ ] Memoize components (React.memo) to prevent unnecessary re-renders
   - [ ] Use useMemo for expensive calculations
   - [ ] Use useCallback for event handlers
   - [ ] Lazy load images (if applicable)
   - [ ] Virtual scrolling for 1000+ items (React Window or similar)
   - [ ] Minimize bundle size (check imports)

   ```typescript
   // Example optimizations
   const TransactionRow = React.memo(({ txn, onEdit, ... }) => {
     // Component only re-renders if props change
   })

   const sortedData = useMemo(() => {
     // Recalculate only when dependencies change
     return transactions.sort(...)
   }, [transactions, sortBy])

   const handleClick = useCallback(() => {
     // Maintain referential equality
     doSomething()
   }, [])
   ```

3. **Accessibility (WCAG 2.1 AA)**
   - [ ] Color contrast ratios (4.5:1 for normal text, 3:1 for large)
   - [ ] Keyboard navigation (Tab through all interactive elements)
   - [ ] Focus indicators visible
   - [ ] ARIA labels for buttons and icons
   - [ ] Screen reader friendly (semantic HTML)
   - [ ] Form labels if searchable

   ```typescript
   // Examples
   <button
     aria-label="Edit transaction"
     title="Edit (keyboard: E)"
     onClick={handleEdit}
   >
     <Edit className="w-4 h-4" />
   </button>

   <table role="table" aria-label="Transactions">
     <thead aria-label="Table headers">
       {/* headers */}
     </thead>
     <tbody>
       {/* rows */}
     </tbody>
   </table>
   ```

4. **Edge Cases Handled**
   - [ ] Empty transaction list (show message)
   - [ ] Single transaction
   - [ ] Very long text (truncate with tooltip)
   - [ ] Missing optional fields (show placeholder)
   - [ ] Special characters in names/notes
   - [ ] Concurrent edits (last-write-wins or optimistic update)
   - [ ] Network errors (retry logic)

5. **Testing**
   - [ ] Visual regression (compare to mockups)
   - [ ] Responsive behavior (375px, 768px, 1200px)
   - [ ] Keyboard navigation (Tab, Enter, Escape, Arrow keys)
   - [ ] Screen reader testing (nvda or voiceover)
   - [ ] Performance with 1000+ items
   - [ ] Cross-browser (Chrome, Safari, Firefox, Edge)
   - [ ] Mobile touch interactions

---

## Testing Strategy

### Unit Tests
```typescript
// Example test structure
describe('TransactionTableV4', () => {
  it('renders all columns', () => {
    // Verify headers rendered
  })

  it('renders transaction data correctly', () => {
    // Verify data displayed correctly
  })

  it('handles sorting', () => {
    // Click header, verify sort order changes
  })

  it('handles selection', () => {
    // Click checkbox, verify selected state
  })

  it('calls action handlers', () => {
    // Click edit button, verify handler called
  })
})
```

### Integration Tests
```typescript
// Test with real data
it('loads transactions from database', async () => {
  // Mock service, render component
  // Verify data loads and displays
})

it('saves changes to database', async () => {
  // Edit transaction, verify saved
})
```

### Visual Tests
```typescript
// Responsive design testing
it('adapts layout for tablet', () => {
  // Render at 768px, verify layout changes
})

it('adapts layout for mobile', () => {
  // Render at 375px, verify layout changes
})
```

### Manual Testing Checklist
- [ ] Desktop view (1200px+): All columns visible, correct spacing
- [ ] Tablet view (768px): Columns hidden per spec, readable
- [ ] Mobile view (375px): Simplified layout, touchable buttons
- [ ] Dark mode (if applicable): Check contrast
- [ ] Print view: Formats correctly
- [ ] All transaction types: Different colors/badges
- [ ] All statuses: Different border colors
- [ ] Large amounts: Number formatting correct
- [ ] Long notes: Truncation and tooltip work
- [ ] Actions: Edit, delete, copy all work
- [ ] Filters: Each filter works individually and combined
- [ ] Sorting: Each column sorts correctly
- [ ] Selection: Multi-select, select all, deselect work
- [ ] Empty state: No transactions shows message
- [ ] Loading state: Shows loading indicator
- [ ] Error state: Shows error message

---

## Key Files & Dependencies

### Existing V1 Code to Reference
- `src/components/moneyflow/unified-transaction-table.tsx` - Reference for logic
- `src/services/transaction.service.ts` - Data loading functions
- `src/actions/transaction-actions.ts` - Server actions
- `src/types/moneyflow.types.ts` - TypeScript interfaces
- `src/lib/transaction-mapper.ts` - Data transformation utilities

### Utilities & Helpers
- `src/lib/utils.ts` - Utility functions (cn, classname merging, etc.)
- `src/lib/formatters.ts` - Number formatting (numberFormatter)
- `src/components/ui/*` - Shadcn UI components

### UI Components to Use
- Table (Header, Body, Row, Cell from shadcn)
- Button (primary, secondary, ghost variants)
- Checkbox
- Select/Dropdown
- Tooltip
- Icons (Lucide React)

---

## Common Pitfalls to Avoid

❌ **Don't:**
- Skip responsive testing until end
- Hide important data fields
- Over-engineer before validating design
- Ignore accessibility from the start
- Use inline styles (use Tailwind classes)
- Create giant components (break into smaller pieces)
- Forget error handling for async operations
- Use console.log in production code

✅ **Do:**
- Test responsiveness early and often
- Keep all 11 data fields accessible
- Start simple, optimize later
- Build accessibility in from start
- Use Tailwind utility classes consistently
- Break into small, reusable components
- Add try-catch for async operations
- Remove debug code before commit

---

## Performance Targets

- **Initial load**: < 2 seconds for 1000 transactions
- **Filter/sort**: < 500ms for 1000 items
- **Re-render**: < 200ms after data change
- **Bundle size**: < 50KB added (gzip)
- **Lighthouse**: 90+ score on performance

---

## Deployment Checklist

Before merging to main:
- [ ] All tests passing
- [ ] No console errors/warnings
- [ ] Build passes (`pnpm build`)
- [ ] Visual comparison complete (matches design mockups)
- [ ] Responsive design verified
- [ ] Accessibility audit passed
- [ ] Performance meets targets
- [ ] Code reviewed (self or team)
- [ ] Documentation updated
- [ ] Staging deployment tested
- [ ] Ready for merge to main

---

## Rollback Plan

If critical issues found after deployment:
1. Revert to previous version: `git revert <commit-hash>`
2. Keep data/database changes (no rollback needed)
3. Notify team and users
4. Fix issues in new branch
5. Deploy fixed version

---

## Communication & Questions

### For Design Agent
If design is unclear during implementation:
1. Check design specs document first
2. Review mockups carefully
3. Ask specific questions in writing (create issue)
4. Wait for written response (minimize context switching)

### For Team/Manager
- Daily standup: 5 min status update
- Blockers: Report immediately
- Completion: Notify when ready for testing
- Issues: Document and communicate impact

---

## Success Criteria

✅ **Implementation Phase Complete When:**
- All 11 data fields display correctly
- Responsive design works at all breakpoints
- All interactions functional (sort, filter, select, actions)
- No console errors or warnings
- Tests passing
- Accessibility compliant
- Performance acceptable
- Visually matches design mockups

✅ **Ready for Merge When:**
- Code reviewed
- All tests passing
- Build succeeds
- Staging deployment works
- QA sign-off received (if available)

---

## Support & Resources

### Documentation
- `.agent/TRANSACTION_TABLE_UI_REDESIGN.md` - Design brief
- `.agent/TRANSACTION_TABLE_DESIGN_DECISION.md` - Design choices (created by design agent)
- `.agent/TRANSACTION_TABLE_COMPONENTS_SPEC.md` - Component specifications (created by design agent)
- `.cursorrules` - Project coding standards
- `README.md` - Project overview
- `src/PHASE_6_WALKTHROUGH.md` - Architecture

### Tools & Libraries
- React 18+ (hooks, context, etc.)
- TypeScript (strict mode)
- Tailwind CSS v4
- Shadcn UI (Table, Button, etc.)
- Lucide React (icons)
- Next.js 16 (server/client components)

### Team Resources
- Figma designs (link in design decision doc)
- Design component library (Shadcn)
- Existing utility functions (see Key Files)
- Test examples (vitest + testing-library)

---

**Created:** Jan 25, 2026  
**Status:** Ready for Implementation (After Design Phase)  
**Owner:** Code Implementation Agent
