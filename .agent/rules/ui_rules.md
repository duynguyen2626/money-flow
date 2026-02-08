# UI Rules (STRICT enforcement)

## 1. Avatar & Image Styling in Dropdowns
- **FORCE SQUARE**: Images/Avatars inside Dropdowns, Selects, Comboboxes, and Filter lists must **NEVER** be rounded.
- **Implementation**: Always use `rounded-none` class on the `<img>` or `Avatar` component.
- **Scope**: This applies to "People" dropdowns, "Account" dropdowns, and any other list selection UI containing icons or images.
- **Reason**: User preference for "clean, square" aesthetics in lists.

## 2. Dropdown Interaction
- **Split Buttons**: When implementing split buttons (e.g. Filter Type + Add Button):
  - Hovering ANY part of the button group must trigger the "active/hover" border color for the whole group.
  - The "Add" (+) section should fill with color on hover.
  - Text labels should change color on hover.

## 3. General Aesthetics
- **Avatars**: In other contexts (like Profile page), rounding is permitted only if explicitly requested. Default to square-ish (`rounded-md` or `rounded-none`) unless specified `rounded-full`.

## 4. Flow Column (Unified Transaction Table)
- **Single source of truth**: always use `UnifiedTransactionTable` (no custom Flow UI in detail pages).
- **Type icon badge**: icon-only with tooltip appears **before** entities.
- **No direction badges**: never render FROM/TO badges in Flow column. (DEPRECATED: Now used in Single Flow context-aware views).
- **Flow Badges (Single Flow)**:
  - **FROM (Orange)**: Indicates money incoming from a source.
  - **TO (Sky)**: Indicates money outgoing to a target.
- **Alignment**:
  - Main /transactions: single-flow rows left-aligned.
  - Detail pages (account/people): single-flow rows centered.
- **Header borders**: use stronger border contrast (`border-slate-400` or darker) to match table grid.

## 5. Typography
- **NO Monospace Fonts**: Never use monospace fonts (`font-mono`, `Courier`, `Consolas`) for UI text, labels, or data display.
- **Exception**: Code blocks, terminal output, or technical documentation only.
- **Reason**: User preference for clean, modern sans-serif aesthetics.

## 6. Image Handling in Documentation
- **NO Cropping**: When generating or embedding images in documentation (walkthroughs, guides), always use full, uncropped images.
- **NO Rounding**: Do not apply `rounded-*` classes to documentation images. Use `rounded-none` or omit rounding entirely.
- **Reason**: Preserve full context and clarity in visual documentation.
+
+## 7. Link & Action Groups (e.g., Sync Buttons)
+- **Width Consistency**: Multi-button groups in tables (like Sync | Settings | Sheet) must use a fixed width (default: **170px**) to prevent row-jump/layout shift.
+- **Centered Icons**: Icon-only buttons within groups must have a fixed width (e.g., `w-9`) and `px-0` to center the icon exactly.
+- **Borders**: Buttons in groups should be separated by internal borders (`border-l border-slate-200`) and share a common outer border container.
+- **Fallback Elements**: Fallback badges or empty states in the same column MUST match the width and border-radius of the active button group for visual stability.
