# 📋 Phase 2 Refactor Roadmap: People Implement + Branch Strategy

**Created**: 2026-01-19  
**Status**: Planning  
**Option Selected**: OPTION 1 - TABLE WITH EXPAND/COLLAPSE ⭐

---

## 🎯 Phase 2 Overview

After completing Phase 1B (Customize Columns), we move to **Phase 2: Expand/Collapse Table + Refactor People**.

This document outlines:
1. **Phase 2A**: Implement Table Expand/Collapse (1-2 days)
2. **Phase 2B**: Refactor People impl (start fresh architecture)
3. **Branch Strategy**: New branches per phase, no overwriting

---

## 🌳 Branch Strategy (IMPORTANT)

### Branch Naming Convention

**NEVER reuse old branch names. Create new branches for each phase.**

#### Phase 1 Branches (Completed)
```
• main (production)
• feature/phase-1a-add-slides
• feature/phase-1b-customize-columns
```

#### Phase 2 Branches (New)
```
• feature/phase-2a-expand-collapse-details
• feature/phase-2b-refactor-people-impl
```

#### Phase 3+ Branches (Future)
```
• feature/phase-3-[description]
• feature/phase-4-[description]
...
```

### Why New Branches?

✅ **Clear separation**: Each phase is distinct, easier to review
✅ **Revert safety**: Can revert entire phase without affecting others
✅ **History**: Git log shows clear phase progression
✅ **No conflicts**: Parallel work possible on different phases
✅ **Clean PRs**: Each PR addresses one phase

---

## 📍 Phase 2A: Expand/Collapse Implementation

### Timeline
- **Duration**: 1-2 days
- **Depends on**: Phase 1B Complete
- **Branch**: `feature/phase-2a-expand-collapse-details`
- **Deliverable**: Fully expandable transaction rows with details

### Key Features

```
Table with Expand/Collapse Rows:
├─ Expand icon (▼/►) in first column
├─ Click row or icon expands details
├─ 2-column layout for fields
├─ Animated smooth expand/collapse
├─ Multiple rows can expand simultaneously
├─ Session state (NOT localStorage)
└─ Consistent with existing design
```

### Deliverables Checklist

- [ ] `useExpandableRows.ts` hook (Session state management)
- [ ] `ExpandIcon.tsx` component (Rotating expand/collapse icon)
- [ ] `TransactionRowDetails.tsx` component (2-column details layout)
- [ ] `TransactionRow.tsx` component (Encapsulates row + details)
- [ ] Updated `TransactionTable.tsx` (Dynamic column + expand integration)
- [ ] CSS animations (Smooth expand/collapse height transition)
- [ ] Integration with Phase 1B (Customize columns works with expand)
- [ ] Full test coverage (All test cases passing)

### File Structure After Phase 2A

```
src/
├─ components/
│  ├─ Transaction/
│  │  ├─ TransactionTable.tsx (MODIFY: add expand column)
│  │  ├─ TransactionRow.tsx (NEW)
│  │  ├─ TransactionRowDetails.tsx (NEW)
│  │  ├─ TransactionSlides/
│  │  │  ├─ AddTransactionSlide.tsx (Phase 1A)
│  │  │  ├─ EditTransactionSlide.tsx (Phase 1A)
│  │  │  ├─ CustomizeColumnsSlide.tsx (Phase 1B)
│  │  │  └─ ... other slides
│  │  └─ UI/
│  │     ├─ DragDropList.tsx (Phase 1B)
│  │     └─ ExpandIcon.tsx (Phase 2A NEW)
│  └─ ...
├─ hooks/
│  ├─ useColumnPreferences.ts (Phase 1B)
│  ├─ useExpandableRows.ts (Phase 2A NEW)
│  └─ ...
└─ ...
```

### Implementation Notes

- **Do NOT overwrite Phase 1B code**: Build on top, extend functionality
- **Expand column**: Always visible, cannot be hidden via customize columns
- **Multiple expand**: Sessions state allows multiple rows expanded
- **Action buttons**: Still clickable when row is expanded
- **Animation**: CSS transitions for smooth 250ms expand/collapse
- **Mobile**: Details grid collapses to 1 column on mobile devices

---

## 📍 Phase 2B: Refactor People Implement (Start Fresh)

### Timeline
- **Duration**: 2-3 days
- **Depends on**: Phase 2A Complete
- **Branch**: `feature/phase-2b-refactor-people-impl`
- **Approach**: Complete rewrite, new architecture

### Why Refactor?

Current People implementation may have:
- Legacy patterns that don't align with Transaction patterns
- Inconsistent styling or component structure
- Outdated hooks or state management
- Unclear separation of concerns

**Goal**: Align People impl with Transaction patterns and latest best practices.

### Refactor Objectives

1. **Consistent Architecture**
   - Use same hook patterns as Transaction (useColumnPreferences, useExpandableRows)
   - Use same component structure (PeopleTable, PeopleRow, PeopleRowDetails)
   - Use same slide pattern for forms (PeopleSlidesContainer)

2. **Improved Component Structure**
   - Extract components into separate files
   - Clear separation: Table, Row, Details, Slides
   - Reusable UI components (icons, buttons, etc.)

3. **Better Type Safety**
   - Define Person type clearly
   - Define all component props with interfaces
   - Full TypeScript coverage

4. **Enhanced Features**
   - Column customization (like Transaction)
   - Row expansion (like Transaction)
   - Consistent styling and animations
   - Better error handling

5. **Modern Best Practices**
   - React hooks (no class components)
   - Functional components with composition
   - Proper memoization where needed
   - Clean state management

### Phase 2B Deliverables

- [ ] Analyze current People implementation (inventory)
- [ ] Define People data model and types
- [ ] Create `usePeopleColumnPreferences.ts` hook
- [ ] Create `usePeopleExpandableRows.ts` hook
- [ ] Create `PeopleTable.tsx` component
- [ ] Create `PeopleRow.tsx` component
- [ ] Create `PeopleRowDetails.tsx` component
- [ ] Create People slides (Add, Edit, etc.)
- [ ] Update styling to match Transaction design
- [ ] Full test coverage
- [ ] Documentation

### File Structure After Phase 2B

```
src/
├─ components/
│  ├─ Transaction/
│  │  ├─ TransactionTable.tsx
│  │  ├─ TransactionRow.tsx
│  │  ├─ TransactionRowDetails.tsx
│  │  ├─ TransactionSlides/
│  │  └─ UI/
│  │
│  ├─ People/
│  │  ├─ PeopleTable.tsx (NEW)
│  │  ├─ PeopleRow.tsx (NEW)
│  │  ├─ PeopleRowDetails.tsx (NEW)
│  │  ├─ PeopleSlides/ (NEW)
│  │  │  ├─ PeopleSlidesContainer.tsx
│  │  │  ├─ AddPersonSlide.tsx
│  │  │  ├─ EditPersonSlide.tsx
│  │  │  ├─ CustomizePeopleColumnsSlide.tsx
│  │  │  └─ ... other slides
│  │  └─ UI/ (NEW)
│  │     ├─ PeopleExpandIcon.tsx
│  │     └─ ... shared UI
│  │
│  └─ ...
│
├─ hooks/
│  ├─ useColumnPreferences.ts (Transaction)
│  ├─ useExpandableRows.ts (Transaction)
│  ├─ usePeopleColumnPreferences.ts (People NEW)
│  ├─ usePeopleExpandableRows.ts (People NEW)
│  └─ ...
│
└─ ...
```

### People Impl Data Model

```typescript
interface Person {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  department?: string;
  joinDate?: Date;
  status?: 'active' | 'inactive' | 'archived';
  notes?: string;
  tags?: string[];
  // ... other fields
}

interface PeopleColumn {
  key: string;
  label: string;
  visible: boolean;
  order: number;
  locked?: boolean;
}
```

### Implementation Strategy

**Phase 2B Progress**:
1. **Day 1**: Inventory current impl, define types, create hooks
2. **Day 2**: Create components (Table, Row, Details)
3. **Day 3**: Create slides, styling, testing

---

## 🔄 Phase Progression Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1A: Add Transaction Slides (COMPLETE)                     │
│ Branch: feature/phase-1a-add-slides                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1B: Customize Columns (COMPLETE)                          │
│ Branch: feature/phase-1b-customize-columns                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2A: Expand/Collapse Rows (IN PROGRESS)                    │
│ Branch: feature/phase-2a-expand-collapse-details                │
│ Status: Ready for Implementation                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2B: Refactor People Impl (PLANNING)                       │
│ Branch: feature/phase-2b-refactor-people-impl                   │
│ Status: Dependency - awaits Phase 2A                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 3: Additional Features (TBD)                              │
│ Possible: Analytics, Reporting, Filters, Search, etc.          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Comparison: Transaction vs People Architectures

After Phase 2B refactor, both should share similar patterns:

| Aspect | Transaction (Phase 1-2) | People (Phase 2B) |
|--------|-------------------------|-------------------|
| **Table Component** | TransactionTable.tsx | PeopleTable.tsx |
| **Row Component** | TransactionRow.tsx | PeopleRow.tsx |
| **Details Component** | TransactionRowDetails.tsx | PeopleRowDetails.tsx |
| **Column Hook** | useColumnPreferences | usePeopleColumnPreferences |
| **Expand Hook** | useExpandableRows | usePeopleExpandableRows |
| **Slides Container** | TransactionSlides/ | PeopleSlides/ |
| **Features** | Add, Edit, Delete, Duplicate | Add, Edit, Delete, Archive |
| **Column Customize** | Yes | Yes |
| **Expand Details** | Yes | Yes |
| **Styling** | Design system tokens | Design system tokens |
| **TypeScript** | Full coverage | Full coverage |

---

## 🎯 Design & Styling Consistency

### Design Tokens Used (Both)

```css
/* Colors */
--color-bg-primary: Background
--color-bg-surface: Card/Surface
--color-bg-muted: Subtle background
--color-text-primary: Main text
--color-text-secondary: Secondary text
--color-border: Borders
--color-primary: Primary action
--color-error: Error/Delete actions

/* Spacing */
--space-8: 8px (standard gap)
--space-12: 12px (medium gap)
--space-16: 16px (large gap)
--space-24: 24px (extra large)

/* Animation */
--duration-fast: 150ms
--duration-normal: 250ms
--ease-standard: cubic-bezier(0.16, 1, 0.3, 1)
```

### Common Components (Both use)

- `ExpandIcon` (rotate animation)
- `CustomizeIcon` (column customize)
- `ActionButton` (edit, delete, etc.)
- `SlideOverlay` (LEFT side slide)
- `ToggleSwitch` (column visibility)

---

## 🚀 Starting Phase 2A

### Step 1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/phase-2a-expand-collapse-details
```

### Step 2: Follow Implementation Prompt

Use `Phase-2-Table-Expand-Implementation.txt` as your guide:
- Templates provided for all components
- Test cases defined
- CSS hints included
- Timeline: 1-2 days

### Step 3: Test Thoroughly

- [ ] All manual test cases passing
- [ ] TypeScript clean compilation
- [ ] No console errors/warnings
- [ ] Responsive on mobile/tablet
- [ ] Integration with Phase 1B works

### Step 4: Prepare PR

```
Title: Phase 2A: Table Expand/Collapse Implementation

Description:
- Implement expandable transaction rows
- Add ExpandIcon, TransactionRowDetails components
- Create useExpandableRows hook
- Integrate with Phase 1B (Customize Columns)
- All test cases passing

Checklist:
- [x] Phase 1B code not modified (only extended)
- [x] New features fully implemented (no TODOs)
- [x] TypeScript: No errors
- [x] Test cases: All passing
- [x] Responsive: Mobile/tablet tested
- [x] CSS animations: Smooth (250ms)
```

### Step 5: Merge to Main

```bash
git push origin feature/phase-2a-expand-collapse-details
# Create PR on GitHub
# Review & merge
git checkout main
git pull origin main
```

---

## 📝 Starting Phase 2B

**Wait until Phase 2A is merged to main, then:**

```bash
git checkout main
git pull origin main
git checkout -b feature/phase-2b-refactor-people-impl
```

**Phase 2B approach**:
1. Analyze current People impl
2. Identify patterns from Transaction impl
3. Refactor People to match Transaction architecture
4. Ensure consistency: Components, Hooks, Styling
5. Full test coverage

---

## 🤝 Collaboration Notes

### For Each Phase

- **Clear branch name**: Immediately obvious what phase/feature
- **Single concern**: Each branch focuses on one phase
- **No large rebases**: Merge main into feature if needed, but no force-pushes
- **PR template**: Use consistent PR descriptions
- **Code review**: One reviewer minimum before merge

### Between Phases

- **Wait for merge**: Don't start Phase 2B until Phase 2A merged
- **Pull latest**: Always `git pull origin main` before starting new branch
- **Clean history**: Rebase if needed, but try to keep linear history
- **Document blockers**: If issues arise, document in commit messages

---

## 📚 Documentation

### Phase 2A Prompt
See: `Phase-2-Table-Expand-Implementation.txt`
- Complete implementation guide
- Code templates for all components
- Test cases
- CSS hints
- Timeline

### Phase 2B Roadmap
This document outlines strategy and architecture

### Code Comments
- Add comments in components for complex logic
- Document props in interfaces
- Explain animation/performance decisions

---

## ✅ Success Criteria

### Phase 2A Complete When
- ✅ All expand/collapse features implemented
- ✅ All test cases passing
- ✅ Responsive design working
- ✅ Integrated with Phase 1B (customize columns)
- ✅ No console errors
- ✅ TypeScript clean
- ✅ Merged to main

### Phase 2B Complete When
- ✅ People impl refactored
- ✅ Consistent with Transaction architecture
- ✅ Column customization working
- ✅ Row expansion working
- ✅ All slides functional
- ✅ Styling consistent
- ✅ Full test coverage
- ✅ Merged to main

---

## 🎓 Lessons Learned / Best Practices

### Architecture Patterns
1. **Separate concerns**: Table, Row, Details, Slides
2. **Reusable hooks**: Column prefs, Expandable rows
3. **Consistent styling**: Design tokens, CSS variables
4. **Type safety**: Full TypeScript coverage
5. **Session state**: Use Set for expanded rows (not localStorage)

### Component Design
1. **Single responsibility**: Each component does one thing
2. **Prop drilling minimized**: Use hooks for shared state
3. **Composition over inheritance**: Build from small, focused components
4. **Memoization**: Use React.memo for expensive renders
5. **Event handling**: Distinguish row click vs action button clicks

### Animation
1. **Use CSS transitions**: Smoother than JS animations
2. **Avoid layout thrashing**: Use transform instead of width/height
3. **Use max-height for expand**: Better performance than height
4. **Test on low-end devices**: Ensure smooth on older hardware
5. **Disable animations for prefers-reduced-motion**: Accessibility

---

## 🔗 Related Documentation

- Phase 1A Implementation: (Previous branch)
- Phase 1B Implementation: `feature/phase-1b-customize-columns`
- Phase 2A Implementation: `Phase-2-Table-Expand-Implementation.txt` ← START HERE
- Phase 2B Roadmap: This document
- Design System: (Link to design tokens/guidelines)
- Testing Guide: (Link to testing patterns)

---

## 📞 Quick Reference

### Phase 2A (Expand/Collapse)
- **Branch**: `feature/phase-2a-expand-collapse-details`
- **Timeline**: 1-2 days
- **Key files**: useExpandableRows.ts, TransactionRow.tsx, TransactionRowDetails.tsx
- **Prompt**: Phase-2-Table-Expand-Implementation.txt

### Phase 2B (People Refactor)
- **Branch**: `feature/phase-2b-refactor-people-impl`
- **Timeline**: 2-3 days
- **Goal**: Align with Transaction architecture
- **Key files**: PeopleTable.tsx, PeopleRow.tsx, PeopleRowDetails.tsx

### Branch Strategy
- ✅ New branch per phase (never reuse names)
- ✅ Wait for merge before starting next phase
- ✅ `git pull origin main` before starting
- ✅ Clear commit messages referencing phase

---

**Document Status**: Ready for Phase 2A Implementation  
**Last Updated**: 2026-01-19  
**Next Step**: Start Phase 2A following Phase-2-Table-Expand-Implementation.txt
