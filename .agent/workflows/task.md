---
description: PHASE 5 — Mobile UI Fix (Transactions) + Standardize MobileRecordRow for Reuse
---

PHASE 5B — Mobile Transactions: Simple Raw Renderer (Fix Missing/Wrong Columns)

PROBLEM
Mobile Transactions UI is still broken: columns missing/blank, swapped content, empty table sections.
This is caused by desktop-style complex UI (badges/icons/sticky/overflow table) leaking into mobile.

GOAL
Create a dedicated mobile-only renderer for /transactions that displays simple RAW data only.
No fancy badges, no complex breakdown tooltips, no desktop column system on mobile.

STRICT RULES
- Keep all existing data fetching, filtering, search, pagination, and selection logic.
- Do not change desktop UI at all.
- Do not touch DB/API.
- Mobile must show these columns/sections clearly:
  Date | Note | Flow & Entity | Value | Category
- Mobile must NOT use horizontal scroll to reveal essential columns.
- Keep actions (Edit/Delete/More) available, but minimal.

MOBILE DISPLAY SPEC (RAW)
1) Date:
- Show only "dd-mm" (VN order). No badges, no time, no calendar tile.

2) Note:
- Show shop image (if available) + note text.
- No ID displayed.
- Keep search working as-is.
- Keep copy icon (copy transaction ID) available.

3) Flow & Entity:
- Show source image + arrow + target image.
- No cycle/debt badges, no extra tags.

4) Value:
- Show raw amount only (one line).
- No final price, no formula tooltip, no cashback computation.
- Keep number formatting consistent with existing formatter.

5) Category:
- Show category name only (plain text).
- No chips, no icons.

LAYOUT REQUIREMENT
- Implement as a simple vertical list of rows/cards.
- Each row is a compact grid:
  Left: checkbox
  Middle: Date + Note + Flow
  Right: Value and Category stacked or aligned
- Must be readable at 360–430px width without horizontal scroll.

IMPLEMENTATION APPROACH
- In unified-transaction-table.tsx:
  - For mobile breakpoint, bypass desktop table rendering entirely.
  - Render <MobileTransactionsSimpleList .../> only.

- Create new file:
  - src/components/moneyflow/mobile/MobileTransactionsSimpleList.tsx
  - Optional: src/components/moneyflow/mobile/MobileTransactionsSimpleRow.tsx

- Do NOT use MobileRecordRow for this phase. Keep it simple.

SELECTION + ACTIONS
- Checkbox must work.
- Provide a small "..." actions menu or swipe actions if already available.
- Keep Edit/Delete/More behavior the same as desktop.

STOP CONDITIONS
- npm run build passes.
- On mobile, all 5 sections are visible and correct.
- No horizontal scroll needed for core info.

STOP
Stop after mobile simple renderer is working.
