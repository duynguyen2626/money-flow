---
description: PHASE 5 — Mobile UI Fix (Transactions) + Standardize MobileRecordRow for Reuse
---

PHASE 5 — Mobile UI Fix (Transactions) + Standardize MobileRecordRow for Reuse

ROLE
You are fixing broken mobile Transactions UI and standardizing a reusable mobile row component (MobileRecordRow)
so that later we can reuse the same pattern for /accounts and /people without rewriting UI.

ABSOLUTE RULES
- NO DB / API / query / calculation changes.
- NO desktop UI changes. Desktop is already correct (Phase 4).
- Mobile must be readable without horizontal scrolling.
- Do not add new toolbar sections. Keep existing UX controls.
- Refactor incrementally in small commits. Keep backwards compatibility.

SOURCE OF TRUTH
- User-provided mobile screenshot shows the current broken layout (wrong fields in wrong places).
- Desktop layout is correct; mobile must not affect desktop.

FILES IN SCOPE
Primary:
- src/components/moneyflow/unified-transaction-table.tsx
- src/components/moneyflow/mobile/mobile-transaction-row.tsx
- src/components/moneyflow/mappers/transactionToMobileRecordRow.ts
- src/components/moneyflow/mobile/MobileRecordRow.tsx
- src/components/moneyflow/mobile/types.ts (or existing types)

Allowed NEW files:
- src/components/moneyflow/mobile/MobileTransactionsList.tsx
- src/components/app/mobile/MobileRecordRow.tsx (optional relocation, only if it reduces future duplication)
- src/components/app/mobile/types.ts (shared types, optional)

Non-goals (DO NOT DO)
- Do not refactor Accounts/People pages in this phase.
- Do not implement date-format migrations or sheet sync (Phase 6).
- Do not redesign desktop or change column order desktop.

GOALS

A) FIX MOBILE TRANSACTIONS
Mobile /transactions must render as a vertical list (NOT multi-column table).
Each row must show the correct data in a stable order:

1) Selection checkbox (tap-friendly)
2) Title: Note
3) Subtitle: short transaction ID (truncated) + tooltip with full ID
4) Meta: Date + Time (readable)
5) Flow: source -> person (icons/images), consistent sizing, no accidental rounding
6) Value block: Amount (primary) + cashback badges (%/fixed) smaller; Final Price below; info tooltip for breakdown
7) Category badges (compact)

No horizontal scroll required.

B) STANDARDIZE MobileRecordRow API (Reusable Foundation)
MobileRecordRow must become a stable generic component to be reused later.

Define a single contract:
- leading: checkbox + optional left icon/avatar
- header: title + subtitle
- meta: small meta chips/lines (date/time/status)
- badges: array of small badges (status/category/debt/cycle)
- value: right-side block (top line + optional small badges + bottom line)
- actions: optional action button/menu

Constraints:
- Component must accept render props or typed slots, but keep it simple.
- Must NOT embed transaction-specific knowledge inside MobileRecordRow.
- All transaction-specific mapping must live in transactionToMobileRecordRow.ts.

Implementation detail:
- Create a type `MobileRowModel` (generic) in shared types file:
  - id: string
  - isSelected: boolean
  - onSelect(): void
  - title: string
  - subtitle?: { text: string; tooltip?: string }
  - meta?: Array<{ icon?: ReactNode; text: string }>
  - leadingVisual?: { kind: "img"|"icon"|"text"; src?: string; icon?: ReactNode; text?: string; className?: string }
  - flow?: { left?: LeadingVisual; arrow?: boolean; right?: LeadingVisual; labels?: string[] }
  - value?: { top: string; topBadges?: string[]; bottom?: string; infoTooltip?: ReactNode }
  - badges?: Array<{ text: string; variant?: "default"|"secondary"|"success"|"warning"|"danger" }>
  - actions?: { onMore?: () => void; onEdit?: () => void; onDelete?: () => void }

MobileRecordRow renders ONLY based on MobileRowModel.

C) PRESERVE SELECTION & ACTIONS
- checkbox must work (no pointer-events issues)
- actions menu must work on mobile (compact)
- do not break keyboard or accessibility basics (aria labels on checkbox & actions)

INCREMENTAL COMMITS (MANDATORY)

Commit A — Mobile rendering switch (no redesign)
- In unified-transaction-table.tsx:
  - For mobile breakpoint, do NOT render the desktop table.
  - Render <MobileTransactionsList .../> (new) using existing selection state & handlers.
  - Desktop table path remains unchanged.

Commit B — MobileTransactionsList (thin list renderer)
- Add MobileTransactionsList.tsx:
  - maps transactions => <MobileTransactionRow .../>
  - passes selection + actions handlers
  - no business logic changes, only wiring

Commit C — Fix mapper (root cause)
- Update transactionToMobileRecordRow.ts to generate correct MobileRowModel:
  - correct NOTE/CATEGORY/VALUE mapping (never swapped)
  - value block includes amount + cashback badges + final price + tooltip breakdown
  - flow block includes left source visual + arrow + right person visual, sized consistently
  - avoid rounded styles unless explicitly asked

Commit D — Standardize MobileRecordRow API (backward compatible)
- Update MobileRecordRow.tsx to fully render MobileRowModel.
- Ensure current transaction mobile row becomes a very thin adapter.
- If any existing usage breaks, provide a small adapter or default values.

Commit E — Remove mobile horizontal scroll sources
- Ensure mobile list container does not use overflow-x-auto.
- Long text truncates with ellipsis; full info via tooltip.

REQUIRED VERIFICATION
- npm run build passes.
- Mobile /transactions at 375px: no horizontal scroll, rows readable, fields correct.
- Checkbox selection works.
- Actions work.
- Desktop /transactions unchanged visually.

STOP
Stop after Phase 5 is complete.
Do not start Phase 6.
