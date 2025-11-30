# **TASK: PHASE 50.2 \- UI REFINEMENTS**

Status: PENDING
Phase: 50.2
Priority: CRITICAL (User Feedback)


## **3. Implementation Plan**

1.  **Modify `Combobox.tsx`:**
    *   Support `tabs` prop for filtering options internally? Or just implement a specialized `AccountSelect` component that wraps `Combobox` and handles filtering?
    *   *Decision:* Let's try to add a `filterTabs` prop to `Combobox` for generic usage, or handle it in `TransactionForm` by adding a filter UI *above* the dropdown. User asked for "In the dropdown". Putting tabs *inside* the `PopoverContent` of `Combobox` is the most accurate implementation.
2.  **Update `TransactionForm.tsx`:**
    *   **Thumbnails:** Remove `rounded-full` class from `img` tags in options.
    *   **Transfer:** Include `CategoryInput` in `Transfer` render block.
    *   **Income:** Adjust Grid spans.
    *   **Debt Tags:** Adjust CSS for the "Recent" tags container.
    *   **Cashback:** Reduce padding/gap in `CashbackInputs`.
3.  **Update `SmartAmountInput.tsx`:**
    *   Add `font-bold text-xl` classes.

## **4. Verification**
*   [ ] Income tab looks compact.
*   [ ] Transfer tab has Category.
*   [ ] Thumbnails are square/original.
*   [ ] Account dropdown has filters (All/Bank/Credit/Others).
*   [ ] Amount input is bold and large.
*   [ ] Cashback layout is tighter.
