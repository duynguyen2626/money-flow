# PATCH 1 ƒ?" .agent/gemini.md
# Goal: enforce "read-first", build gate, and mobile-split pattern as a hard requirement.

### Non-negotiable gates (must follow)
- Before editing any code, you MUST read these files and restate (in 5 bullets max) how you will apply them:
  - ./.agent/gemini.md
  - ./.agent/gravityrules.md
  - ./.agent/domain_logic.md
  - ./README.md
- Every change must keep business logic intact unless the task explicitly says otherwise.
- Build gate is mandatory:
  - Run: `npm run build`
  - If it fails, fix it in the same PR. Do not leave build broken.

### UI refactor rule: mobile must be split, reusable
- When a page has complex desktop UI (badges, chips, sticky table, hover actions), DO NOT ƒ?omake it responsiveƒ?? by hiding columns inside the same component.
- Instead: create a dedicated, reusable mobile component and keep the desktop component clean.
- Prefer the Transactions refactor pattern:
  - A reusable mobile row/card component
  - A page-specific mapper file
  - A thin adapter component per domain (transactions/people/accounts)
- Naming convention:
  - `XxxDesktop.tsx`
  - `XxxMobile.tsx`
  - `xxxToMobileRow.ts` (mapper)
  - `MobileRecordRow.tsx` (reusable base)

### Definition of Done (DoD)
- UI matches the provided mock screenshots (spacing + structure), not ƒ?oclose enoughƒ??.
- Mobile:
  - No overlap
  - No horizontal scrolling
  - No missing columns / wrong data mapping
- Desktop:
  - Works on large (27") and laptop (13") screens without excessive empty margins
- Build passes: `npm run build`
- Provide:
  - files changed list
  - manual verification checklist
  - quick notes on tradeoffs

# Task Spec ƒ?" SheetScript Fix (source: task.md)

You are working in repo: `rei6868/money-flow-3` (PR #147 already merged; `sheetScript` folder is unified; sync is via `pnpm run sheet:push` using `SHEET_ID` in `.env`).

## Goal

Fix Google Sheet sync issues:

* formatting (width/alignment/number formats)
* safe row removal (do not break Summary)
* stable Summary range
* proper insert ordering by Date

## Must read first

* `sheetScript/**` (all files)
* `.env.example` (or env docs mentioning `SHEET_ID` / script id)
* repo docs about sheets sync (search: `sheet:push`, `sheetScript`, `sync`, `resync`)
* transaction ƒ+" sheet mapping code path (search: `Final Price`, `% Back`, `Sum Back`, `shop`, `Notes`, `void`, `delete`, `upsert`, `resync`)

## Issues to fix

### A) Formatting must apply on BOTH create-new and re-sync

1. Column widths (A:J only)

* Shop: center, 44px
* Notes: 250px

2. Alignment

* Shop: center H+V
* Date: left or center (consistent)
* Numbers: right

3. Number formats

* Amount, Final Price: thousands separators; prefer #,##0 (VND), allow #,##0.00 where needed
* % Back: consistent
* Sum Back: #,##0.00

4. Resync must re-apply header style, widths, formats, borders
5. Borders: every populated row A:J has borders; blank rows below last data row no borders

### B) Safe void/delete row must NOT break Summary area

* Do not call `sheet.deleteRow(rowIndex)`
* Only delete/shift within A:J using `deleteCells(ROWS)` or equivalent
* Summary (L:N) remains untouched

### C) Insertion ordering

* Inserting earlier date must land in correct sorted position
* Sort only A:J range (exclude header), never touch Summary

### D) Resync deterministic

* Rebuild only A:J
* Keep Summary intact
* Ensure table range stable (header row 1, data row 2)

## Deliverables

1. Implement fixes in `sheetScript`.
2. Add short dev note about safe delete + range-limited sorting.
3. Provide short user verification checklist (6ƒ?"8 steps).

## Constraints

* Minimal changes, no new deps.
* Cover create + resync.
* Prefer small pure helper functions.
* Consolidate multiple implementations to one source of truth.

## Output

* Summary of changes + where.
* Verification checklist.
