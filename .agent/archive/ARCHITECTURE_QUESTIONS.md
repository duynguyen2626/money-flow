# Architecture Questions & Answers

**Q1: Why is CategoryMultiSelect in edit-account-dialog.tsx instead of a separate component?**
A: It's likely defined inline or in the same file for convenience and tight coupling with the specific state shape (`categoryIds` list) used in the dialog. It should ideally be extracted to `src/components/moneyflow/category-multi-select.tsx` for reusability, but for Phase 11 we will keep it in place to avoid scope creep.

**Q2: What does CustomDropdown component do?**
A: It is a reusable UI component (`src/components/ui/custom-dropdown.tsx`) that renders a searchable select menu. It supports icons, images, and custom options (add new). It uses a `button` trigger and an absolute positioned list. It truncates text to fit width and relies on parent width constraints.

**Q3: How does activeCategoryCallback work? Why use a ref instead of state?**
A: `activeCategoryCallback` is a specialized callback function passed down to `CategorySlideV2` (or similar) to handle "what happens after a new category is created". Using a `useRef` allows the callback to be updated without triggering re-renders of the parent component, which is useful when passing it deep into event handlers or effects that shouldn't depend on the callback identity changing.

**Q4: Why is the scrollable container needed? Can't we just show all rules at once?**
A: The scrollable container (`max-h-[500px]`) prevents the edit dialog from becoming excessively tall if an account has many complex cashback rules. This keeps the "Save" and "Cancel" buttons accessible in the viewport without needing to scroll the entire window.

**Q5: What is the relationship between LevelItem and CashbackLevelsList?**
A: `CashbackLevelsList` renders a list of `LevelItem` components. `LevelItem` represents a single cashback tier (Level) and contains its own list of *Category Rules*. It manages local UI state for adding/removing rules within that level, bubbling up changes to the parent list.
