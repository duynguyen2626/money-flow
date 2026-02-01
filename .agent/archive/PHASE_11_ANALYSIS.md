# Phase 11 Analysis: Cashback Rules Overlap

## 1. Architecture Summary
The Account Management UI primarily uses two components:
- `AccountSlideV2`: The main slide-over for creating and editing accounts. It manages the comprehensive state of an account, including basic details and cashback configuration.
- `edit-account-dialog.tsx`: Contains the `LevelItem` component which renders the actual UI for cashback levels and rules. This component appears to be shared or embedded within the account editing flow (or duplicates logic).
- `CategorySlideV2`: A helper component to create categories on the fly.

The data flow involves loading the account details server-side, passing them to the client component, which parses the JSON `cashback_config` into a local state (`levels` array). Changes are synchronized back to a JSON payload on save.

## 2. Problem Diagnosis
**Observed Behavior:**
- **Desktop:** The "Category Rules" section displays "Categories", "Rate", and "Max Reward" fields. They are ostensibly stacked (Categories above, Rate/Reward below in a grid), but visually they appear cramped or misaligned.
- **Mobile (Critical):** On 375px width, the layout completely breaks. The fields do **not** wrap vertically effectively. Instead, there appears to be a forced horizontal overflow or failure of the grid system, causing:
    - The "Categories" dropdown overlaps the "Rate" input.
    - The "Max Reward" field is pushed off-screen or cut off.
    - The container seems to scroll horizontally (`overflow-x-auto`) rather than reflowing content vertically.

## 3. Root Cause Hypothesis
Based on the code inspection of `edit-account-dialog.tsx`:
1.  **Flexbox vs Grid Conflict:** The Rule container (line 200) uses `space-y-4` (vertical stack). However, the visual evidence of "cramped horizontally" and "overlap" suggests something is forcing a **row-based layout** or a fixed width that exceeds the viewport.
2.  **CategoryMultiSelect Width:** The `CategoryMultiSelect` component likely does not have a constrained width (`max-w-full`), causing it to blow out the parent container width on mobile. If the parent container expands to fit the dropdown content, the grid below (which might be percentage-based) might try to fit into a space that doesn't exist or misalign.
3.  **Specific CSS Issue:** The subagent noted `overflow-x-auto`. If a parent container has `flex` and `overflow-x-auto`, children might default to `flex-shrink-0` and stay in a row.
4.  **`sm:` Breakpoint misuse:** `grid-cols-1 sm:grid-cols-2` is correct for switching columns, but if the parent container is not effectively constrained to the viewport width (e.g., fixed width in pixels vs 100%), the grid might behave unexpectedly.

## 4. Evidence
- **Mobile Screenshot:** Shows overlapping elements and horizontal cut-off.
- **DOM Inspection:** Indicates `overflow-x-auto` presence and inputs/labels sharing Y-coordinates in a way that suggests unsuccessful stacking.

## 5. Files to Modify
- `src/components/moneyflow/edit-account-dialog.tsx`: This is the primary file containing the `LevelItem` and `CategoryMultiSelect` components where the layout needs fixing.
- `src/components/ui/custom-dropdown.tsx` (possibly): To ensure it respects `w-full`.

## 6. Proposed Solution
1.  **Refactor `CategoryMultiSelect`:** Ensure the dropdown trigger and container strictly respect `max-w-full` and handle text truncation or wrapping for selected items.
2.  **Fix `LevelItem` Layout:**
    -   Verify the container `div` (line 200) is `flex-col` or `block`.
    -   Ensure the `Categories` section is strictly `block` or `w-full`.
    -   Ensure the `Rate/Reward` grid is `w-full`.
3.  **Remove `overflow-x-auto` if unnecessary:** If the parent scroll is vertical, we shouldn't have horizontal scroll unless absolutely needed for a data table (which this is not).
4.  **Enforce Vertical Stacking:** Use explicit `flex flex-col gap-4` instead of just `space-y-4` if specificity issues exist.
