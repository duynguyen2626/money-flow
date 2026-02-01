# Implementation Plan: Phase 11 (Cashback Rules Overlap)

## 1. Solution Approach
**Option A: Targeted CSS Fix**
We will apply specific CSS layout corrections to `edit-account-dialog.tsx` to enforce vertical stacking on mobile devices. This avoids high-risk rewrites while solving the immediate UI breakage.

**Approach:**
-   Convert the rule item container to a strictly `block` or `flex-col` layout.
-   Ensure the "Categories" section is a block element with `w-full`.
-   Verify the "Rate/Reward" grid uses `grid-cols-1` on mobile and `sm:grid-cols-2`.
-   Add `min-w-0` or `max-w-full` to flex children to prevent blowout.

## 2. Files to Modify
-   `src/components/moneyflow/edit-account-dialog.tsx`:
    -   **Section:** `LevelItem` component (lines ~200+).
    -   **Changes:** Adjust wrapper classes for rule styling, padding, and grid definition.
    -   **Complexity:** Low/Medium.

## 3. Step-by-Step Implementation
1.  **Locate LevelItem**: Find the `LevelItem` function in `edit-account-dialog.tsx`.
2.  **Fix Rule Container**: Locate the `div` with `relative group rounded-xl border-2...`. Add `flex flex-col` to ensure vertical stacking of its children (`space-y-4` does this, but `flex-col` is more robust for layout flow).
3.  **Constraint Categories**: Wrap the "Categories" `div` (label + `CategoryMultiSelect`) in a container with `w-full block`.
4.  **Fix Input Grid**: Locate the `grid grid-cols-1 sm:grid-cols-2` div. Ensure it has `w-full`.
5.  **Adjust Custom Dropdown**: In `CategoryMultiSelect`, allow passing a `className` prop to `CustomDropdown` to enforce `w-full max-w-full`.
6.  **Verify Scroll Container**: Check the `max-h-[500px]` container in `LevelItem` parent. Ensure it creates a block formatting context (e.g., `width: 100%`).

## 4. Testing Strategy
-   **Verification:**
    -   Open `localhost:3000` (Account Vcb Signature).
    -   Open Edit Dialog and go to Cashback Levels.
-   **Viewports:**
    -   **375px (Mobile):** Categories on top, Rate below, Reward below Rate (or stack). NO horizontal scroll.
    -   **768px (Tablet):** Categories on top, Rate/Reward side-by-side.
    -   **1200px (Desktop):** Same as tablet.
-   **Interaction:**
    -   Add Rule -> Verify layout.
    -   Add Category -> Verify dropdown expands correctly without breaking layout.

## 5. Rollback Plan
-   Revert changes to `edit-account-dialog.tsx` using `git checkout src/components/moneyflow/edit-account-dialog.tsx`.
-   Preserve analysis using `git reset HEAD .agent/` to keep docs.

## 6. Success Criteria
-   [ ] Mobile: All 3 fields visible without horizontal scroll.
-   [ ] Categories dropdown does not overlap Rate input.
-   [ ] Max Reward input is fully visible.
-   [ ] `sm:` breakpoint correctly triggers 2-column layout for inputs.
