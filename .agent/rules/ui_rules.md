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
- **No direction badges**: never render FROM/TO badges in Flow column.
- **Alignment**:
  - Main /transactions: single-flow rows left-aligned.
  - Detail pages (account/people): single-flow rows centered.
- **Header borders**: use stronger border contrast (`border-slate-400` or darker) to match table grid.
