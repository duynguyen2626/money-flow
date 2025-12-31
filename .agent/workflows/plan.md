Implementation Plan - Manage Sheet Settings + Sheet Sync
Status: Completed

What shipped
- Cycle list now reads live sheet settings from `getPeople()` for Manage Sheet popover.
- Apps Script respects bank-row toggle and QR image placement in merged summary area.
- Sheet push helper accepts `sheet:push:<n>` via npm lifecycle for fast deploys.

Verification
- Toggle bank account on/off: L6:N6 merges only when enabled, clears when disabled.
- Toggle QR image on/off: image appears in summary area (M6:N31 or L7:N31).
- Sorting and row shifts do not move the summary image.

Next Action
- Push script (`pnpm run sheet:push:3`) and re-sync a cycle sheet.
