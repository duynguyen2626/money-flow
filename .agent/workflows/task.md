---
description: Prompt 2 (Phase 2) — Split Toolbar/Header incrementally (Reusable for other pages)
---

PHASE 3 — Table Shell Refactor (Reusable, No Redesign)

ROLE
You are continuing incremental refactor after Phase 2 toolbar extraction.
Phase 3 focuses on extracting a reusable “TableShell” (card container + scrolling + sticky header + footer/pagination slot)
and establishing stable column contracts so mobile/desktop don’t mismatch.

STRICT: This is a REFACTOR, not a redesign. Preserve current visuals.

READ FIRST (MANDATORY)
- .agent/workflows/gemini.md
- .agent/rules/gravityrules.md
- .agent/workflows/task.md
- Review Phase 2 walkthrough and new toolbar components (do not change them).

SCOPE (PHASE 3 ONLY)
Primary targets:
- src/components/moneyflow/unified-transaction-table.tsx
- src/components/ui/table.tsx (only if needed for a tiny prop/typing improvement)

Allowed to add NEW reusable UI pieces:
- src/components/app/table/
  - TableShell.tsx
  - TableShellHeader.tsx (optional)
  - TableShellFooter.tsx (optional)
  - StickyTable.tsx (optional helper, but keep minimal)
  - types.ts

Non-goals:
- Do NOT touch filterable-transactions.tsx except wiring a new wrapper component if required.
- Do NOT change business logic (selection, totals, actions, pagination logic).
- Do NOT change column meaning, ordering, or labels.
- Do NOT attempt to “fix” UI issues unless it’s strictly a bug caused by refactor.

MAIN PROBLEMS WE’RE SOLVING
- unified-transaction-table.tsx is large and mixes concerns:
  - layout container + overflow rules
  - sticky header/left column
  - desktop vs mobile rendering
  - footer/pagination
  - row selection + totals UI
We want to reduce file size and improve reuse for Accounts/People tables later.

REFRACTOR STRATEGY (INCREMENTAL — small commits)
Commit A — Introduce TableShell (render-neutral)
1) Create TableShell.tsx as a presentational wrapper:
   - Provides the “card edges” container: rounded + border + bg
   - Controls overflow: inner scroll areas
   - Accepts slots:
     - headerSlot (optional)
     - tableSlot (required)
     - footerSlot (optional)
   - IMPORTANT: Use EXACT Tailwind classes copied from current Transactions table container.
   - This component must NOT import Transactions types.

2) Replace the outer container markup in unified-transaction-table.tsx with <TableShell>.
   - No behavioral changes.
   - Visual output must remain identical.

Commit B — Extract Table Footer block (render-neutral)
1) If unified-transaction-table contains footer UI (selected totals / pagination / rows-per-page):
   - Extract to TableShellFooter.tsx or a local component in /app/table.
   - Keep props minimal: selectedCount, totals, pagination props, etc.
   - No logic changes, just move JSX.

Commit C — Column contracts (prevent mobile mismatch)
1) Add a small “column contract” file (Transactions-specific but structured):
   - src/components/moneyflow/table/transactionColumns.ts (or similar)
   - Export constants describing:
     - desktop columns order + keys
     - mobile essential columns order + keys
     - which columns are hidden on mobile
   - This is NOT a big refactor; it’s a small config to reduce accidental mismatches.

2) Update unified-transaction-table.tsx to refer to these constants
   - Instead of hardcoding “hidden” / “mobile colSpan” scattered in multiple places.

Commit D — Optional: Extract StickyTable helper (ONLY if it shrinks code meaningfully)
If sticky logic is repeated or messy:
- Create a small helper component that ONLY wraps:
  - <Table> with sticky header
  - sticky left column support
But do this ONLY if it reduces complexity without changing behavior.

ENFORCEMENT (NO REDESIGN)
- Do not change padding/margins/spacing colors.
- Do not change typography sizes.
- Do not reorder columns.
- Do not change mobile layout behavior.
- Any new wrapper must be CSS-neutral (copy exact existing classes).

VERIFICATION (REQUIRED)
- npm run build must pass.
- User visual checklist:
  - Desktop table looks identical.
  - Sticky header still works.
  - Selection checkboxes + totals footer still work.
  - Mobile table still matches current behavior (no new scroll changes).
STRICT UI ENFORCEMENT:
This is a refactor only. You may only move JSX into new components and pass props.
If the UI looks different after this PR (except for explicitly requested bug fixes), the refactor is wrong.
Do not add or change Tailwind classes except copying existing ones into the extracted components.

STOP RULE
Stop after Commit A + B + C (and optionally D only if clearly justified).
Do NOT start Phase 4.
