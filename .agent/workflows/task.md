---
description: Milestone 3 – Transactions Ui Refactor (agent Prompt)
---

# Milestone 3 — Transactions UI Refactor (Locked Design Contract)

## Status

The Agent implementation diverged from the intended UX.
This document **locks the design contract** so the Agent cannot improvise.
If the UI does not match the contract, revert / adjust until it does.

---

## Golden References (DO NOT IGNORE)

1. **Mockup (Desktop)**: Financial Summary is a **dropdown** (not a separate always-visible block).
2. **People / Debt Transactions page**: clean, compact, centered, no excessive whitespace.
3. **Mockup (Mobile)**: compact header, no redundant Financial Summary block on the page.

---

## Non‑Negotiable Layout Rules

### 1) Page width + gutters (CRITICAL)

Transactions page must visually match People/Debt pages:

* Centered content
* Tight, pleasant gutters
* No huge empty space on left/right

Use ONE of these (pick the best match to People page):

* `max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8`
* or `max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8`

Do NOT use 1600px if it causes the “two sides empty and ugly” look.

### 2) Header must be sticky and stable

* Top header area (title + primary actions) must remain visible when scrolling the table.
* Use `sticky top-0 z-30 bg-background/95 backdrop-blur` (or equivalent) with a subtle border.
* The TABLE region scrolls; the page header does not disappear.

### 3) Financial Summary MUST be in a dropdown (Desktop)

**Required behavior**:

* In the top toolbar row, show a control like: `Financial Summary ▾`
* Clicking opens a dropdown/popover that contains:

  * Income / Expenses / Lend / Repay totals
* Summary cards must NOT be always visible as a separate row.

**Mobile**:

* Do NOT render a big summary block by default.
* Summary must be accessible via the same dropdown/panel only.

### 4) Date range placement

* Desktop:- [x] Step 3: Implement fixes strictly following Milestone 3 contract <!-- id: 3 -->
    - [/] Fix scrollbar visibility and container <!-- id: 4 -->
    - [/] Fix mobile column overlap and visibility <!-- id: 5 -->
    - [/] Fix header horizontal scroll requirement <!-- id: 6 -->
    - [/] Fix modal mobile layout (1 column) <!-- id: 7 -->
    - [/] Fix modal unsaved warning (dirty-state) <!-- id: 8 -->

### 5) Toolbar compactness

Target: “People/Debt page compactness”.

* Avoid multiple rows of chips and redundant controls.
* If `Filter & Search` exists, remove extra chips that duplicate it.
* Keep: Tabs (All/Void/Pending) + Search + Filters + Excel + Add.

### 6) Table containment + edges (CRITICAL)

The table must look like a contained card (nice edges), not a raw spreadsheet stuck on the page.
Required:

* Wrap table in a card container with rounded corners and border.
* Example: `rounded-xl border bg-card overflow-hidden`
* Inside: `overflow-x-auto w-full` for horizontal scroll.

No horizontal scroll on `<body>`.

### 7) Sticky columns (Mobile)

* Sticky header row always.
* Sticky left column should be **Checkbox + Category/Date** (as in mobile mockup).
* If desktop has separate Date column, mobile must merge Date into the Category/Date cell.

### 8) Icon sizing consistency (IMPORTANT)

Problem: rectangular bank/card logos look shorter than square avatars.
Required:

* Normalize icon box: `h-12 w-12` for both logos and avatars.
* Logos: `object-contain` inside the box.
* Avatars: `object-cover` or current avatar rules.
* If needed, shift text right (padding) but do NOT shrink logos.

### 9) Add/Edit Transaction modal (Mobile) — SINGLE COLUMN

The Agent did not fix this.
Required:

* Mobile must render form as **one column only**:

  * `grid-cols-1` on base
  * `sm:grid-cols-2` only on >= sm
* Modal must be usable: header sticky, body scrollable, footer fixed (per rules).

### 10) Unsaved Changes dialog — only if truly dirty

The Agent did not fix this.
Required behavior:

* Opening the modal and closing immediately (X / outside click / Close) must NOT show Unsaved warning.
* Warning appears ONLY if the user actually changed any field.
  Implementation must rely on **true dirty state**.

---

## Extra bug to fix (BLOCKER)

### Account creation from Add‑Txn modal fails

* From Add Transaction → Create Account (inside account select), creating a new account fails.
* Also reproduce from `/accounts` page.

Required debugging steps:

1. Reproduce in `/accounts` create flow.
2. In browser DevTools → Network: verify the POST request fires.
3. If request fails, log:

   * status code
   * response body
   * any thrown error
4. Ensure the UI shows an explicit error toast/message if creation fails.
5. Confirm the created account appears in the list AND becomes selectable in Add‑Txn modal.

Note: a CORS error to `dc.services.visualstudio.com/v2/track` is telemetry noise; do not confuse it with app API failures.

---

## Acceptance Criteria (what you must screenshot)

Provide screenshots after changes:

* Desktop Transactions: toolbar matches mockup style (Financial Summary dropdown), compact, centered, table card edges nice.
* Desktop scroll: header stays; table scrolls.
* Mobile Transactions: compact, no big summary blocks, table sticky left Category/Date.
* Mobile Add/Edit modal: one column, usable.
* Unsaved dialog: NOT shown when untouched.
* Account creation: success on `/accounts` and from Add‑Txn modal.

---

## Allowed files to change

Keep scope tight. Prefer edits here:

* `src/components/moneyflow/filterable-transactions.tsx`
* `src/components/moneyflow/unified-transaction-table.tsx`
* `src/components/moneyflow/transaction-form.tsx`
* `src/components/moneyflow/add-transaction-dialog.tsx`
* (if needed) shared UI primitives: `dialog.tsx`, `sheet.tsx`, `table.tsx`

Do NOT change backend contracts or transaction computation logic.
