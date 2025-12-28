---
description: Agent Prompt
---

# Agent Prompt (ENG) — Fix Google Sheet Sync (Formatting + Safe Delete + Sorting)

## Objective

Fix Google Sheet sync behavior in **Money Flow 3** so that `pnpm run sheet:push` produces a deterministic, well-formatted table and safe row removal that never breaks the Summary block.

This is a **minimal, well-scoped** change set inside `sheetScript/**` (and only the smallest supporting docs if needed).

## Mandatory reading (do this first)

1. Read **all** files under `sheetScript/**`.
2. Read `.env.example` and any env docs mentioning `SHEET_ID` / script id.
3. Search repo docs for: `sheet:push`, `sheetScript`, `sync`, `resync`.
4. Locate transaction→sheet mapping and operations paths by searching for keywords:

   * `Final Price`, `% Back`, `Sum Back`, `shop`, `Notes`, `void`, `delete`, `upsert`, `resync`.
5. Read `.agent/rules/gravityrules.md` and `.agent/workflows/*.md` (commit workflow, constraints).

## Constraints

* **Do NOT change business logic** (domain math, cashback/debt rules, etc.).
* **No new dependencies**.
* Keep changes **minimal** and **reviewable**.
* All fixes must apply in BOTH:

  * create-new sheet/tab
  * resync existing sheet/tab
* Never break existing formulas (especially in computed columns and Summary area).

## Issues to fix (must)

### A) Formatting applies on BOTH create + resync

For **table A:J only** (header row 1, data starts row 2):

1. Column widths:

   * Shop column: **centered**, width **44px**
   * Notes column: width **250px**
   * Others: reasonable (avoid giant Notes)
2. Alignment:

   * Shop cells: horizontal + vertical center
   * Date: left or center (consistent)
   * Numbers: right-aligned
3. Number formats:

   * Amount + Final Price: thousands separators; prefer `#,##0` for VND; allow decimals where needed
   * % Back: consistent percent/number convention
   * Sum Back: numeric format that supports decimals when any (`#,##0.00`)
4. Resync re-applies:

   * header style
   * widths
   * number formats
   * borders for populated rows
5. Borders:

   * every populated data row in A:J has borders
   * blank rows below last data row: **no borders**

### B) Safe void/delete must NOT break Summary (L:N)

Current bug: deleting a sheet row shifts Summary (L1:N6) and nukes formulas (#REF).

Fix:

* **Never call `sheet.deleteRow(rowIndex)`** when removing a transaction.
* Delete/shift **ONLY within A:J** using `Range.deleteCells(SpreadsheetApp.Dimension.ROWS)` (or equivalent) so only A:J shifts up.
* Summary columns L:N must remain untouched.

### C) Insertion ordering by date

If inserting a txn with earlier date (e.g., 16/12/2025), it must appear in the correct position (sorted ascending by Date), not appended to the bottom.

Safest approach:

* After any upsert, **sort only A:J (excluding header)** by Date column (and Time if present).
* Sorting must be range-limited so it does not touch Summary L:N.

### D) Resync deterministic & Summary stable

* Rebuild only data region (A:J)
* Keep Summary region intact
* If Summary formulas depend on table range, ensure table range remains stable:

  * header fixed at row 1
  * data begins at row 2

## Implementation guidance (preferred small helpers)

Create / consolidate to ONE source of truth:

* `applyTableFormatting(sheet)`

  * header formatting
  * column widths
  * alignment rules
  * number formats
* `applyTableBorders(sheet, lastDataRow)`

  * apply borders to A1:J
  * clear borders below lastDataRow (only if script currently touches those rows)
* `sortTableByDate(sheet, lastDataRow)`

  * sort only range A2:J
* `deleteTableRowCells(sheet, rowIndex)`

  * delete cells in A:J for that row and shift up
  * MUST NOT delete entire sheet row

If there are multiple old implementations, consolidate to one.

## Acceptance criteria

* Create new sheet/tab → formatting correct.
* Resync existing sheet/tab → formatting corrected and re-applied.
* Void/delete in middle of table → Summary L:N never shifts; no #REF.
* Insert earlier-date txn → appears in correct sorted position.
* Borders appear for all populated rows only.

## Deliverables

1. Code changes in `sheetScript/**` implementing A–D.
2. A short dev note in repo explaining:

   * why we don’t delete whole rows
   * why sorting must be range-limited
3. A short user verification checklist (6–8 steps).

## Output format (for your final response)

* List files changed
* Bullet summary of behavior changes
* Verification checklist
