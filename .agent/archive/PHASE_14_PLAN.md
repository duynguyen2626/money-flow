# Phase 14: People V2 Refactor & UX Enhancements

## Goals
1. **Refactor People Details Page**: Create a unified V2 view for people that matches the Account Details V2 design.
2. **Left Navigation Enhancement**: Implement a "Recent" section for quick access to accounts and people.
3. **UI Consistency & Standards**: Fix all avatar shape violations (Persons = `rounded-full`, Accounts/Shops = `rounded-sm`) and consolidate routing.

---

## 🏗️ Part 1: People Details V2 Refactor

### Objective
Replace the current multi-component assembly in `src/app/people/[id]/page.tsx` with a single, clean `PersonDetailViewV2` component, similar to `AccountDetailViewV2`.

### Tasks
- [ ] Create `src/components/people/v2/PersonDetailViewV2.tsx`.
- [ ] Implement a header that matches Account Detail V2 style (Stats, Quick Action buttons).
- [ ] Fix avatar shapes: Change `rounded-md` to `rounded-full` for all person images.
- [ ] Integrate `UnifiedTransactionTable` with "Single Flow" mode for person transactions.
- [ ] Update `src/app/people/[id]/page.tsx` to use the new view.

---

## 🕒 Part 2: Recent Items Section

### Objective
Add a "Recent" section to the left sidebar to improve navigation efficiency.

### Tasks
- [ ] Create `src/hooks/use-recent-items.ts` using `localStorage` for persistence.
- [ ] Implement tracking in `AccountDetailViewV2` and `PersonDetailViewV2`.
- [ ] Update sidebar styling to feature the "Recent" section at the top.
- [ ] Ensure icons follow shape rules (Square for accounts, Round for people).

---

## 🎨 Part 3: UI Standards Audit

### Objective
Ensure full compliance with `.cursorrules` Phase 74 standards.

### Tasks
- [ ] **Avatar Fixes**: Reach all instances of person avatars and ensure they are `rounded-full`.
- [ ] **Account Thumbnails**: Ensure all account/shop thumbnails are `rounded-sm`.
- [ ] **Typography**: Remove any remaining `font-mono` from UI text elements.
- [ ] **Routing**: Standardize on `/people/[id]` and deprecate query-string based routes like `/people/details?id=...`.

---

## 🚀 Future Roadmap (Phase 15+)
- Batch bulk edit actions.
- Service distribution scheduling.
- Advanced debt analytics.
