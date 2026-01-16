# Task: Accounts Page Refactor

- [ ] **Phase 4: Accounts Page Refactor**
    - [ ] **Filter Tab Redesign** <!-- id: 1 -->
        - [ ] Update `src/components/moneyflow/account-list.tsx`
        - [ ] Implement new filter order: Credit, Account, Savings, Debt Accounts, All
        - [ ] Rename "Others" to "Debt Accounts"
        - [ ] "All" filter switches to table view
    - [ ] **Account Card Redesign** <!-- id: 2 -->
        - [ ] Update `src/components/moneyflow/account-card.tsx`
        - [ ] Implement new card structure (Header, Body, Footer)
        - [ ] **Crucial:** Fix image rendering (no rotation, correct aspect ratio, object-fit: contain)
        - [ ] **Crucial:** Preserve linked account logic (Parent/Child, Secured)
        - [ ] Add visual indicators for urgent/spend needs (bold borders, colored headers)
        - [ ] Implement click behavior (Arrow for details, Card body for...? or just arrow)
    - [ ] **Sorting Logic** <!-- id: 3 -->
        - [ ] Primary sort: Due Date (Urgent first)
        - [ ] Secondary sort: Spend Need (Yellow/Amber)
    - [ ] **Testing & Polish** <!-- id: 4 -->
        - [ ] Verify existing behaviors are not broken
        - [ ] Test with various image sizes/ratios
        - [ ] Check responsive layout

- [x] **Phase 3: Batch UI Improvements** <!-- id: 5 -->
    - [x] Implement Clone Loading Indicator
    - [x] Clarify Workflow Order (Badges, Tooltips)
    - [x] Implement Smart Installment Payment Modal
    - [x] Fix TypeScript errors and deploy

- [x] **Fix CI Lint Errors** <!-- id: 6 -->
    - [x] Fix `BatchList` (component inside render) in `src/components/batch/batch-list.tsx`
    - [x] Fix `setState` in `useEffect` in `src/app/categories/page.tsx`
    - [x] Fix unescaped entities in `src/app/installments/page.tsx`
    - [x] Fix scripts `require` imports
    - [x] Address other ESLint errors
