# Workflow: Refactor Accounts Page UI

## Objective
Redesign the `/accounts` page with a modern, clean card-based layout inspired by the batch MBB/VIB cards to improve visual hierarchy, reduce clutter, and enhance user focus.

## Context
The current accounts page has cluttered cards with excessive whitespace. The user wants a cleaner, more modern design similar to the batch cards we recently created, with better filtering and improved visual hierarchy.

## Implementation Steps

### 1. Update Filter Tabs
- **File**: `src/components/moneyflow/account-list.tsx`
- **Changes**:
  - Reorder filters: Credit (default) → Account → Savings → Debt Accounts → All
  - Change default `activeFilter` from `'all'` to `'credit'`
  - Rename "Bank" filter to "Account"
  - Rename "Others" to "Debt Accounts" (for Receivable accounts)
  - When `activeFilter === 'all'`, automatically switch to table layout
  - **Sort Order**: Primary by due date (urgent first), secondary by spend need (yellow/amber cards)
  - Cards with near due dates should have **bold colored borders** (red for urgent, amber for warning)
  - Cards needing more spend should also have **bold amber borders**
  - Move urgent/spend indicators to card header (no separate section)

### 2. Redesign Account Cards
- **File**: `src/components/moneyflow/account-card.tsx`
- **Reference**: Batch MBB/VIB cards (but more compact)
- **New Structure**:
  ```
  ┌─────────────────────────────────────┐
  │ HEADER (Colored Gradient)           │
  │ • Card Name (bold, white)            │
  │ • Due Date Badge (if urgent)         │
  │ • Spend Need Badge (if needed)       │
  │ • Balance (large, bold)              │
  │ • Security Badge (Secured/Unsecured) │
  │ • Parent/Child Indicator             │
  │ • Pending Batch Badge                │
  │ • Progress Bar (Balance/Limit)       │
  ├─────────────────────────────────────┤
  │ BODY (White Background)              │
  │ ┌──────┐  Cashback Details           │
  │ │ IMG  │  • Current Spend             │
  │ │      │  • Cashback Earned           │
  │ │      │  • Progress Indicators       │
  │ └──────┘  • Expand Arrow → (CLICK)   │
  ├─────────────────────────────────────┤
  │ FOOTER (Quick Actions)               │
  │ [Income] [Expense] [Transfer] [Lend] │
  └─────────────────────────────────────┘
  ```

**IMPORTANT**: 
- **Click arrow (→) to open details**, NOT the card body
- Card body click should be disabled or do nothing
- Only the expand arrow should navigate to `/accounts/{id}`

### 3. Fix Image Rendering
**CRITICAL CHANGE**: Do NOT rotate or transform images anymore!

- **All Account Images**:
  - Keep original orientation from Cloudinary/URL
  - NO rotation (`-rotate-90` removed)
  - NO transform or scale
  - `object-fit: contain`
  - No border, no background
  - Preserve original aspect ratio exactly as provided
  - Max width: 80px for credit cards, 64px for others
  - Height: auto (preserve aspect ratio)

**Example**:
```tsx
// OLD (WRONG):
className="object-contain -rotate-90 scale-[1.4]"

// NEW (CORRECT):
className="object-contain"
```

### 4. Add Gradient Backgrounds
```css
/* Credit Card - Healthy */
bg-gradient-to-br from-blue-500 to-indigo-600

/* Credit Card - Warning (Near Due) */
bg-gradient-to-br from-amber-400 to-orange-500

/* Credit Card - Urgent (Overdue) */
bg-gradient-to-br from-red-500 to-rose-600

/* Bank Account */
bg-gradient-to-br from-emerald-500 to-green-600

/* Savings */
bg-gradient-to-br from-purple-500 to-violet-600

/* Debt */
bg-gradient-to-br from-orange-500 to-amber-600
```

### 5. Implement Table View for "All" Filter
- Check if `AccountTable` component supports transaction history view
- If not, create new table component
- Show columns: Account, Type, Balance, Last Transaction, Actions

## Design Specifications

### Typography
- Card Name: `text-lg font-bold text-white`
- Balance: `text-2xl font-black text-white`
- Labels: `text-xs font-medium text-white/80`
- Cashback details: `text-sm text-slate-700`

### Spacing
- Card padding: `p-4`
- Section gaps: `gap-3`
- Compact layout with minimal whitespace

## Verification Checklist
- [ ] Default filter is "Credit"
- [ ] Filter order matches: Credit → Account → Savings → Others → All
- [ ] "All" filter shows table view
- [ ] Cards have colored gradient headers
- [ ] Images preserve aspect ratio (no crop, no border)
- [ ] Cashback section is clean and scannable
- [ ] Quick action buttons are accessible but not cluttered
- [ ] Responsive on mobile devices
- [ ] Cards are more compact than current design

## Reference Files
- Current implementation: `src/components/moneyflow/account-card.tsx`
- Filter logic: `src/components/moneyflow/account-list.tsx`
- Batch card reference: `src/components/batch/batch-list-simple.tsx`
- Implementation plan: `.gemini/antigravity/brain/.../implementation_plan.md`
