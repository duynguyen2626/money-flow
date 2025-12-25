---
description: Prompt P4 (Updated) — Transactions UI Rebuild to New Mock (ENG 100%)
---

PHASE 4 — Transactions UI Rebuild to NEW Mock (Locked)

ROLE
You are implementing a UI rebuild for the Transactions table layout based on the NEW mock screenshot provided by the user.
This is NOT a free redesign. The screenshot is the single source of truth.

INPUTS
- The user will provide:
  1) NEW mock screenshot (authoritative)
  2) Optional: current broken UI screenshot (for diff)

NON-NEGOTIABLE RULES
- Keep all existing data logic: filtering, pagination, selection, totals, actions, fetch calls.
- Only change presentation/layout and small UI rendering behaviors described below.
- Do not change DB schema, API routes, or business rules.
- Do not introduce new pages.
- Maintain responsiveness (27” desktop, 13” laptop, iPad, mobile).

TARGET STRUCTURE (match the mock)
A) Top area
- Move/ensure the main navigation is anchored at the very top so the layout does not “shift” when nav collapses.
- The table area must stay visually stable in viewport.

B) Table columns & rendering requirements

1) DATE column (calendar tile style)
- Render date like a mini calendar card (month label + day number).
- Place time next to it (not below).
- Include a quick action icon next to time (wrench icon), matching mock placement.

2) NOTE column
- Primary: note title text.
- Secondary: show the transaction ID below (short format like ABCD-123...).
- The ID should be truncated; on hover show tooltip with full ID.
- Refund flow icon must look like the legacy one (do not invent new refund icon style).

3) FLOW & ENTITY column
- Preserve the “source -> person” structure.
- Source image (cards) must have the same height as person avatar (square).
- Cards must always render in portrait orientation:
  - If original image is landscape/standing wrongly, rotate it so it appears portrait.
  - Do NOT round the card image (no rounded-full).
- Person avatar remains square/consistent as in mock.

4) AMOUNT / FINAL PRICE merged into one column (VALUE column)
- Show Amount on top (primary).
- Show cashback badges on the same row as Amount:
  - percent back and/or fixed back, smaller size badge.
- Show Final Price below Amount.
- Add an info icon next to Final Price.
  - Hover shows a tooltip “Price Breakdown” with formula details (amount, percent/fixed, final).
  - Tooltip content must be computed from existing fields; do not change calculations.

5) CATEGORY column
- Match mock: compact category cell (icon + type chips).

C) Interaction / regressions to fix
- Checkbox selection must work reliably.
- Row click/hover behavior must remain consistent (no broken pointer events).
- No unexpected rounding on images.
- No converting numeric values into pills unless mock shows it.

IMPLEMENTATION GUIDANCE
- Prefer making changes inside:
  - src/components/moneyflow/unified-transaction-table.tsx
  - src/components/moneyflow/desktop row renderer (wherever row JSX is)
  - src/components/moneyflow/mobile-transaction-row.tsx (only if mobile is also updated)
- If TableShell or MobileRecordRow blocks the mock, adjust them minimally but do not redesign them.

STRICT ENFORCEMENT
- Do not add “extra” UI sections.
- Do not move Financial Summary out of its current control unless mock shows it.
- Do not create horizontal scrolling for top toolbar.
- Any style change must move toward matching the mock exactly.

DELIVERABLES
- Updated Transactions table UI matching the mock.
- Build must pass: npm run build
- Provide before/after screenshots for desktop and mobile.

STOP
Stop after completing this UI rebuild. Do not start any DB/date-format migration or sheet sync work.
