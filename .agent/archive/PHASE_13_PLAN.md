# Phase 13 Implementation Plan - Future Enhancements

## Goal
Implement UI/UX enhancements and new features to improve user experience and workflow efficiency after critical bugs in Phase 12 are resolved.

## Prerequisites
- [ ] Phase 12 S1 (Category Badges) completed
- [ ] Phase 12 S2 (Auto-Transactions) completed
- [ ] User provides detailed requirements for each enhancement

---

## Proposed Enhancements

### E1: Refactor `/people` Page UI

#### Objective
Improve the People Details page layout, navigation, and visual consistency to match the refined Account Details page.

#### Current State (To Be Assessed)
**Files to Review**:
- `src/app/people/page.tsx` (People Directory)
- `src/app/people/details/page.tsx` (People Details)
- `src/components/people/v2/**/*` (People V2 components)

**Questions to Answer**:
1. What specific UI issues exist on the People page?
2. Are there inconsistencies with the Account Details page?
3. What features are missing or need improvement?

#### Potential Improvements
- **Layout Consistency**: Align with Account Details page design
- **Navigation**: Improve filtering, sorting, and search
- **Transaction Display**: Apply "Single Flow" logic (if applicable)
- **Performance**: Optimize data fetching and rendering
- **Mobile Responsiveness**: Ensure good UX on mobile devices

#### User Input Required
> [!IMPORTANT]
> **User to provide**:
> - Specific pain points with current People page
> - Screenshots or examples of desired layout
> - Priority features to implement

#### Files to Modify (TBD)
- [MODIFY] People page components (to be determined after review)

---

### E2: Enhance `/batch` Page

#### Objective
Improve the Batch Processing page based on a detailed plan to be provided by the user.

#### Current State (To Be Assessed)
**Files to Review**:
- `src/app/batch/page.tsx` (Batch Directory)
- `src/components/batch/**/*` (Batch components)
- `src/services/batch.service.ts` (Batch business logic)
- `src/actions/batch-actions.ts` (Batch server actions)

**Questions to Answer**:
1. What is the current batch processing workflow?
2. What file formats are supported (Excel, CSV)?
3. What bank mappings exist?
4. What are the pain points in the current flow?

#### Potential Improvements
- **Import Flow**: Streamline file upload and mapping
- **Validation**: Improve error handling and validation feedback
- **Preview**: Better preview of imported transactions before confirmation
- **Bank Mappings**: Easier management of bank-specific mappings
- **Bulk Actions**: Add bulk edit/delete capabilities

#### User Input Required
> [!IMPORTANT]
> **User to provide**:
> - Detailed enhancement plan after reviewing current code
> - Specific features to add or improve
> - Priority order for enhancements

#### Files to Modify (TBD)
- [MODIFY] Batch page components (to be determined after user provides plan)

---

### E3: Implement "Recent" Section on Left Nav

#### Objective
Add a "Recent" section at the top of the left navigation bar to show recently accessed accounts, people, or transactions for quick access.

#### Proposed Features

##### Recent Items Tracking
- Track user navigation to:
  - Account Details pages
  - People Details pages
  - Potentially: Transactions, Services, Batches
- Store in:
  - **Option A**: Browser localStorage (client-side, per device)
  - **Option B**: Database (server-side, synced across devices)
  - **Recommendation**: Start with localStorage for simplicity

##### UI Design
```
┌─────────────────────────┐
│ 🕒 Recent               │
│ ├─ 💳 Msb Online        │
│ ├─ 👤 Lâm               │
│ └─ 💳 Exim Violet       │
├─────────────────────────┤
│ 🏠 Dashboard            │
│ 💳 Accounts             │
│ 👥 People               │
│ ...                     │
└─────────────────────────┘
```

##### Behavior
- Show last 3-5 accessed items
- Clickable links to jump directly to detail pages
- Auto-update based on user navigation
- Clear/reset option (optional)
- Persist across sessions (if using localStorage)

#### Implementation Steps

##### Step 1: Create Recent Items Hook
**File**: `src/hooks/useRecentItems.ts`
```typescript
export function useRecentItems() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  
  const addRecentItem = (item: RecentItem) => {
    // Add to list, remove duplicates, limit to 5
    // Save to localStorage
  }
  
  return { recentItems, addRecentItem }
}
```

##### Step 2: Track Navigation
**Files to Modify**:
- `src/app/accounts/[id]/page.tsx` (Account Details)
- `src/app/people/details/page.tsx` (People Details)

**Logic**:
```typescript
useEffect(() => {
  addRecentItem({
    type: 'account',
    id: accountId,
    name: account.name,
    icon: account.image_url,
    url: `/accounts/${accountId}`
  })
}, [accountId])
```

##### Step 3: Update Left Nav Component
**File**: `src/components/layout/sidebar.tsx` (or similar)

**Add Recent Section**:
```tsx
<div className="mb-4">
  <h3 className="text-xs font-semibold text-gray-500 uppercase">Recent</h3>
  <ul>
    {recentItems.map(item => (
      <li key={item.id}>
        <Link href={item.url}>
          <img src={item.icon} /> {item.name}
        </Link>
      </li>
    ))}
  </ul>
</div>
```

#### User Input Required
> [!IMPORTANT]
> **User to confirm**:
> - Which pages to track (Accounts, People, Transactions, Services, Batches)?
> - How many recent items to show (3, 5, 10)?
> - Should recent items sync across devices (localStorage vs. database)?
> - Should there be a "Clear Recent" option?

#### Files to Create/Modify
- [NEW] `src/hooks/useRecentItems.ts`
- [MODIFY] `src/app/accounts/[id]/page.tsx`
- [MODIFY] `src/app/people/details/page.tsx`
- [MODIFY] `src/components/layout/sidebar.tsx` (or equivalent nav component)

---

## Implementation Order

### Recommended Sequence
1. **E3: Recent Section** (Independent, quick win)
2. **E1: People Page Refactor** (After user provides requirements)
3. **E2: Batch Page Enhancements** (After user provides plan and reviews code)

### Rationale
- E3 can be implemented immediately without user input
- E1 and E2 require detailed user requirements and code review

---

## Verification Plan

### E1: People Page Refactor
**Manual Verification**:
- Navigate to People page
- Verify all requested improvements are implemented
- Test on desktop and mobile
- Compare with Account Details page for consistency

### E2: Batch Page Enhancements
**Manual Verification**:
- Test batch import flow with sample files
- Verify all requested features work correctly
- Test error handling and validation
- Verify bank mappings are correct

### E3: Recent Section
**Manual Verification**:
1. Navigate to an Account Details page
2. Verify the account appears in "Recent" section
3. Navigate to a People Details page
4. Verify the person appears in "Recent" section
5. Click a recent item link
6. Verify it navigates to the correct page
7. Refresh the page
8. Verify recent items persist

**Edge Cases**:
- Test with no recent items (empty state)
- Test with max items (5+)
- Test duplicate navigation (same item multiple times)

---

## Success Criteria

### E1: People Page Refactor
- [ ] All user-requested improvements implemented
- [ ] UI is consistent with Account Details page
- [ ] Page is responsive on mobile
- [ ] Performance is acceptable (no lag)

### E2: Batch Page Enhancements
- [ ] All user-requested features implemented
- [ ] Import flow is streamlined
- [ ] Error handling is robust
- [ ] Bank mappings work correctly

### E3: Recent Section
- [ ] Recent section displays on left nav
- [ ] Recent items are tracked correctly
- [ ] Links navigate to correct pages
- [ ] Recent items persist across sessions
- [ ] UI is clean and doesn't clutter nav

---

## Notes

- **Flexibility**: This plan is subject to change based on user requirements
- **Incremental Delivery**: Each enhancement can be delivered independently
- **User Feedback**: Gather feedback after each enhancement before moving to the next
- **Documentation**: Update `walkthrough.md` after each enhancement is completed

---

## Dependencies

- Phase 12 completion (critical bugs fixed)
- User requirements for E1 and E2
- Design mockups (optional but helpful)

---

## Timeline Estimate (Rough)

- **E3: Recent Section**: 2-3 hours
- **E1: People Page Refactor**: 4-8 hours (depends on scope)
- **E2: Batch Page Enhancements**: 4-8 hours (depends on scope)

**Total**: 10-19 hours (assuming no major blockers)
