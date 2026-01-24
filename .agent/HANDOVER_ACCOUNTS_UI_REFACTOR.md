# Handover: Accounts & Account Details UI Refactor

## Branch
`refactor/accounts-routing-unify`

## Summary
Redesigned account directory and detail pages with simplified header, unified routing, and optimized loading states.

---

## Key Changes

### 1. **Account Directory (`/accounts`)**
**File:** `src/app/accounts/page.tsx` → `src/components/accounts/v2/AccountDirectoryV2.tsx`

- **New behavior:** Account name links open in **new tab** (not same window)
- **Row click:** Does nothing (only action menus trigger handlers)
- **Files changed:**
  - `src/components/accounts/v2/AccountRowV2.tsx`: Added `target="_blank"` to account links (parent & child)

### 2. **Account Detail Header (`/accounts/[id]`)**
**File:** `src/components/moneyflow/account-detail-header.tsx`

#### Simplified Header Layout (Single Row)
- **Removed badges:** "Active", "Credit Card" type badges
- **Balance display:**
  - Shows **Balance** (not "Outstanding"/"Available")
  - **Limit** badge (for credit cards)
  - **Outstanding** badge (amber, shows debt amount)
- **Progress bar:** Moved inline with quick actions (no longer separate section below)
- **Button order:** Back → Avatar → Name → Balance → Limit → Outstanding → Quick Actions → Progress Bar → Settings → Expand

#### Compact Expand Section
- **Reduced padding:** Cards from `p-6` to `p-4`, gaps from `gap-4` to `gap-3`
- **Smaller text:** Titles from `text-base` to `text-sm`, labels from `text-sm` to `text-xs`
- **Tighter metrics:** Amount displays from `text-xl` to `text-lg`

#### Removed
- "Open in new tab" button from header (pointless when already on details page)
- ArrowUpRight icon import

### 3. **Tab Loading UX**
**Files:**
- `src/context/account-tab-context.tsx` (new)
- `src/components/moneyflow/account-content-wrapper.tsx` (new)
- `src/components/moneyflow/account-tabs.tsx` (updated)
- `src/app/accounts/[id]/page.tsx` (updated)

#### Loading Behavior
- **Before:** Full-page white overlay during tab switch
- **After:** Content dims with 50% opacity + blur overlay + centered spinner
- **Context pattern:** `AccountTabContext` shares `isPending` state between tabs and content
- **Structure:** `AccountTabs` wraps `AccountContentWrapper` as children to provide context

#### Implementation
```tsx
<AccountTabs accountId={id} activeTab={activeTab}>
  <AccountContentWrapper>
    {/* Tab content with Suspense */}
  </AccountContentWrapper>
</AccountTabs>
```

---

## Technical Details

### Components Hierarchy
```
/accounts/[id]
├── AccountDetailHeader (server component, data passed as props)
├── AccountTabs (client component, provides loading context)
│   └── AccountContentWrapper (client component, consumes context)
│       └── Suspense
│           ├── FilterableTransactions (if activeTab === 'transactions')
│           └── CashbackAnalysisView (if activeTab === 'cashback')
```

### Context Pattern
```typescript
// account-tab-context.tsx
export const AccountTabContext = createContext<{ isPending: boolean }>()

// account-tabs.tsx
<AccountTabContext.Provider value={{ isPending }}>
  {/* tabs + children */}
</AccountTabContext.Provider>

// account-content-wrapper.tsx
const { isPending } = useAccountTabLoading()
// Apply dim overlay when isPending
```

### Server vs Client Components
- **Server:** `page.tsx`, `AccountDetailHeader`, `FilterableTransactions`, `CashbackAnalysisView`
- **Client:** `AccountTabs`, `AccountContentWrapper`, `AccountSlideV2`, `TransactionSlideV2`

---

## Styling Changes

### Header
- **Layout:** `flex-wrap items-center gap-2 md:gap-3 lg:gap-4`
- **Balance badges:** `text-[11px]`, `px-2 py-1`
- **Progress bar:** `flex-1 min-w-[260px]`, inline with buttons
- **Settings/Expand:** `ml-auto` to push to far right

### Expand Cards
- **Container:** `p-4`, `mb-3`, `gap-3`
- **Cards:** `px-3 py-3`, `gap-2.5`, `rounded-lg`
- **Labels:** `text-xs font-semibold`
- **Amounts:** `text-lg font-bold` (was `text-xl`)

### Loading Overlay
- **Dim:** `opacity-50 pointer-events-none transition-opacity duration-200`
- **Overlay:** `absolute inset-0 bg-white/20 backdrop-blur-sm z-20`
- **Spinner:** `h-6 w-6 text-indigo-600`

---

## Build & Lint Status
- ✅ **Build:** Successful (`pnpm build`)
- ⚠️ **Lint:** Pre-existing errors in other files (not related to these changes)

---

## Testing Checklist
1. Navigate to `/accounts` → Click account name → Opens in new tab
2. Account details header shows all info in one row (no wrap on desktop)
3. Progress bar visible inline (between quick actions and settings)
4. Click expand → Cards are smaller/tighter than before
5. Switch between Transactions/Cashback tabs → Content dims during load
6. No full-page white overlay during tab switch
7. Mobile: Header wraps gracefully, no horizontal scroll

---

## Files Modified (Total: 7)
```
src/app/accounts/[id]/page.tsx
src/components/accounts/v2/AccountRowV2.tsx
src/components/moneyflow/account-detail-header.tsx
src/components/moneyflow/account-tabs.tsx
src/components/moneyflow/account-content-wrapper.tsx (new)
src/context/account-tab-context.tsx (new)
```

---

## Related PRs/Branches
- **Current branch:** `refactor/accounts-routing-unify`
- **Previous work:** `refactor/people-details-ui`, `feature/accounts-routing-unify`
- **GitHub:** https://github.com/rei6868/money-flow-3/pull/new/refactor/accounts-routing-unify

---

## Future Improvements (Not Implemented)
- Server-side data fetching for CashbackAnalysisView (currently client-side mount)
- Skeleton loaders instead of spinner overlay
- Progressive enhancement for tab content pre-loading

---

## Q&A for Agent 2

**Q: Why remove "Active" and "Credit Card" badges?**
A: User requested simplified UI, all info on one row. Type can be inferred from icon/context.

**Q: Why not remove Outstanding badge?**
A: Still needed to show debt amount separately from available balance for credit cards.

**Q: Why AccountTabs wraps children instead of sibling?**
A: Context provider must wrap both the tabs (provider) and content (consumer). Sibling pattern caused "must be used within provider" error.

**Q: Why dim overlay instead of Suspense boundary?**
A: Better UX - keeps header/tabs visible, shows existing content grayed out, prevents jarring white flash.

**Q: Account links open new tab - what about navigation history?**
A: User explicitly requested this. From directory, users typically want to compare multiple accounts in separate tabs.
