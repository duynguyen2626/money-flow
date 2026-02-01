# Root Cause Diagnosis: Phase 11 Cashback Rules Overlap

## 1. Primary Root Cause
The horizontal layout breakage on mobile is primarily caused by **improper container layout constraints** in the `edit-account-dialog.tsx` file's `LevelItem` component combined with **horizontal overflow handling**.

-   **Horizontal Scrolling:** The scrollable container for rules (`max-h-[500px] overflow-y-auto`) has implicit overflow handling that, when combined with flex or grid children that don't wrap properly, forces a horizontal scroll instead of a vertical reflow.
-   **Lack of Explicit Vertical Stacking:** The inputs for "Categories", "Rate", and "Max Reward" are currently sitting in structure that doesn't strictly enforce a vertical column layout on mobile (`grid-cols-1` might be present, but if the container width is blown out by a child, the grid won't shrink).
-   **CategoryMultiSelect Container:** While `CustomDropdown` has `w-full`, the wrapper `div` in `LevelItem` has `space-y-1.5 mb-4`. If this wrapper is inside a flex container that isn't `flex-col`, it might try to sit alongside other elements.

## 2. Secondary Issues
-   **Z-Index & Stacking:** The `CustomDropdown` uses `absolute z-50` for the dropdown menu, which is correct for visibility, but the trigger button itself needs to be constrained to the viewport width.
-   **Viewport Meta:** Not an issue here (standard Next.js app), but testing at 375px confirms the CSS media queries for `sm:` are crucial.

## 3. Evidence
-   **Browser Inspection:** Confirmed that at 375px, the Rate and Max Reward fields are pushed off-screen to the right.
-   **Screenshot:** Shows the "Categories" dropdown physically overlapping or abutting the "Rate" input in a way that suggests they are on the same visual line (or the Rate input is floating weirdly).
-   **Code:** The `CategoryMultiSelect` wrapper and the Grid below it are siblings. If the parent of `LevelItem` (which is inside a map) allows horizontal expansion (e.g. `flex-shrink-0` inside a flex-row), the mobile layout breaks.

## Conclusion
The fix requires enforcing a strict `block` or `flex-col` layout effectively at the `LevelItem` root and ensuring all child inputs are `w-full` max-width.
