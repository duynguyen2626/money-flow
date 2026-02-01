# Design Decisions: Phase 11

## 1. Selected Approach: Option A (Targeted CSS Fix)
We chose to repair the existing CSS in `edit-account-dialog.tsx` rather than rewriting the component.

**Rationale:**
-   **Risk Minimization:** The cashback logic is complex. A full rewrite of the dialog risks unearthing state management bugs or breaking the existing waiver/tooltip fixes.
-   **Velocity:** A CSS fix is significantly faster and easier to verify for the specific visual bug reported.
-   **Scope:** The reported issue is purely visual layout on mobile.

## 2. CSS Strategy
-   **Flexbox over Block:** We will use `flex flex-col` for the rule item container to enforce vertical stacking context, ensuring children (Categories, Grid) behave as block blocks.
-   **Grid Robustness:** We will explicit widths (`w-full`) to the grid container to prevent it from collapsing or moving if siblings expand.
-   **Container Constraints:** We will ensure the `CategoryMultiSelect` wrapper has `w-full` and `max-w-full` to force the inner dropdown to truncate text rather than expanding the parent width.

## 3. Files Modified
-   `src/components/moneyflow/edit-account-dialog.tsx`: This file contains the `LevelItem` component with the broken layout.

## 4. Tradeoffs
-   **Technical Debt:** We are adding more CSS utility classes to an already large file (`edit-account-dialog.tsx` is >1000 lines). Ideally, `LevelItem` should be its own file.
-   **Future Maintenance:** Future developers still have to navigate a large file.

## 5. Future Proofing
-   We are adding comments to the layout structure to explain the `grid-cols-1 sm:grid-cols-2` logic so future edits respect the mobile-first design.
