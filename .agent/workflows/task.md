# Manage Sheet Settings + Sheet Sync (Completed)

## Summary
- Fixed stale settings in cycle list by including sheet settings in `getPeople()` mapping and the `Person` type.
- Apps Script now honors the bank account toggle: merges L6:N6 only when enabled, clears L6:N6 when disabled, and keeps summary borders intact.
- QR image sync uses a merged IMAGE() area and shifts based on whether the bank row is shown:
  - No account row: M6:N31
  - Account row enabled: L7:N31
- Summary/transaction sorting clears image merges first to avoid shifts, then reapplies image placement.

## Key Files Updated
- src/services/people.service.ts
- src/types/moneyflow.types.ts
- google-scripts/Code.js
- google-scripts/push-sheet.mjs
- package.json

## Notes / Next Steps
- Push Apps Script: `pnpm run sheet:push:3` (or another index).
- Sync cycle sheet to apply bank row + QR image changes.
