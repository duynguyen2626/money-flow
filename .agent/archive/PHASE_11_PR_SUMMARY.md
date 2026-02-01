# Phase 11 Pull Request Summary

## Problem Statement
The "Category Rules" configuration in the Edit Account dialog is broken on mobile viewports (375px).
-   Fields do not wrap vertically.
-   "Categories" dropdown overlaps "Rate" input.
-   "Max Reward" input is cut off/off-screen.
-   Horizontal scrolling occurs unintentionally.

## Solution Summary
This PR implements a targeted CSS fix in `edit-account-dialog.tsx`:
1.  Enforces `flex-col` layout for Rule Items to guarantee vertical stacking.
2.  Applies `w-full` constraints to the Category MultiSelect container to prevent width blowouts.
3.  Ensures the Rate/Reward grid defaults to `grid-cols-1` (stacking) on mobile and switches to `grid-cols-2` only on `sm:` breakpoints.

## Files Changed
-   `src/components/moneyflow/edit-account-dialog.tsx`: CSS class adjustments in `LevelItem`.

## Testing Evidence
-   [ ] **Mobile (375px):** Verified proper vertical stacking. No overlap. No horizontal scroll.
-   [ ] **Tablet/Desktop:** Verified side-by-side grid layout persists.
-   [ ] **Functionality:** Adding/Removing rules works as expected.

## Screenshots
*(Placeholders for Implementation Phase)*
-   **Before:** [Insert Mobile Screenshot of Overlap]
-   **After:** [Insert Mobile Screenshot of Fixed Layout]
