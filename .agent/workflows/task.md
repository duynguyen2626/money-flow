---
description: Agent Prompt
---

# Agent Task Prompt (ENG)

## Title

Hard Refactor Accounts UI - MoneyFlow v3.8 (Family-Centric, Pixel-Exact)

## Absolute Rule (READ FIRST)

You are NOT allowed to reuse or lightly tweak existing Accounts UI layout.
This task requires a clean refactor that matches the provided mockups (Images 2-4).

Do NOT:

- Reuse old layout structure and "restyle" it
- Mix old sections with new ones
- Improvise your own design

You MUST:

- Treat Images 2 / 3 / 4 as the single source of truth
- Build UI strictly according to the specification below

Image 1 = WRONG (current, rejected)
Images 2-4 = CORRECT (target)

---

## Visual Comparison Requirement (MANDATORY)

Before coding, you must explicitly compare:

- Image 1 (current broken design)
- Image 2-4 (approved mockups)

And understand why Image 1 is wrong:

- Old code reused
- No clear Family (Parent-Child) ecosystem
- Card sections fragmented
- No visual bridge between Parent and Child
- Cashback rules feel bolted-on, not integrated

Your implementation will be reviewed side-by-side with the mockups.

---

## Core Design Concept

MoneyFlow v3.8 = Family Financial Ecosystem

Parent-Child accounts are NOT independent cards.
They form a financial cluster and must always be rendered together.

---

## 1. Family Logic (CRITICAL)

### 1.1 Family Search Logic

When searching by name:

- Searching Parent OR Child ALWAYS renders the entire family cluster (2-3 cards)
- Never show a Child alone
- Never break financial context

---

### 1.2 Family Bridge (Visual + Structural)

Between Parent and Child cards:

- Render a Link / Chain icon at the exact center
- Draw a dashed connector line between cards
- This bridge represents the "financial bloodstream"

Rules:

- Icon must be centered between cards
- Connector uses dashed border (not solid)
- Bridge is part of layout, not decoration

---

## 2. Grid System (NON-NEGOTIABLE)

- Base grid is grid-cols-2 (even when zoomed)
- Purpose: prevent Parent-Child cards from stacking vertically
- Families always occupy 2 columns as a unit

Responsive behavior:

- Mobile: Family cluster stacks internally but remains grouped
- Desktop: Family cluster is horizontal

No grid-cols-3 / 4 / 5 experiments are allowed.

---

## 3. Card Design - Modern Slate System

### Card Container

- Border radius: rounded-3xl
- Clean slate background
- Border color reflects status:
  - Urgent -> Red
  - Warning -> Amber
  - Normal -> Slate

---

### Header Zone

- Left: Days Left badge
- Right: Secured / Unsecured badge (green / amber)
- Edit icon aligned, minimal

Badges must be visually balanced (symmetrical weight).

---

### Need / Spent Zone (VERY IMPORTANT)

- Single unified section (NOT split cards)
- Vertical divider between Need and Spent
- Numbers must never overlap or wrap awkwardly
- Billing Cycle label sits ABOVE this zone

---

### Feature Zone (Height Consistency Rule)

Cashback Bar and Progress Bar:

- Must share the SAME visual height
- Enforce min-h-[44px]
- This prevents cards from becoming uneven

Cashback Rules:

- Render as integrated block inside card
- Tooltip expands from same area
- No floating / detached popovers

---

### Media Integration

- Card image is PART of the card
- Do NOT split image into a separate visual column
- Image, content, and actions are one cohesive unit

---

### Action Bar

- 4 icon-only actions
- Equal width buttons
- Soft pastel backgrounds
- Tooltip on hover

---

## 4. Interaction & Loading UX (GLOBAL)

### 4.1 Modal Add / Edit (ALL MODALS)

On Save / Update:

- Button enters loading state
- Button disabled immediately
- Prevent double submit completely

---

### 4.2 Navigation Loading (ALL CLICKABLE ITEMS)

Any click that causes:

- route change
- data fetch

MUST:

- Show loading indicator immediately
- Never leave static screen

This includes Accounts + People + Transactions + Details.

---

## 5. Technical Constraints

- UI ONLY refactor
- Do NOT change domain logic
- No new libraries
- Tailwind + shadcn + lucide-react only
- Create NEW layout components if needed
- Old layout code must be deleted if obsolete

---

## Files Expected to Change

- src/app/accounts/page.tsx
- src/components/moneyflow/account-list.tsx
- src/components/moneyflow/account-card.tsx
- New family-cluster layout components (if needed)
- Modal components (loading states)

---

## Acceptance Criteria (STRICT)

- UI matches mockups (Images 2-4) visually
- Family clusters never break
- Parent-Child bridge is visible and clear
- Cards are height-aligned
- No reuse of old broken layout
- Loading feedback everywhere
- pnpm run build passes

---

## Final Output

1. Files changed
2. Screenshot comparison: Image 1 vs New UI
3. Checklist confirming each rule above

---

# Archived Task - People Flow: Split Bill (MVP) for Lend/Repay

## Why this first (priority)

We implement manual Split Bill MVP first because it:

- Unlocks the core product workflow (group bills) without Gemini/API complexity.
- Keeps DB/domain logic unchanged by using the safest approach (multiple transactions).
- Lets UI/UX be validated quickly before AI automation.

AI bill split + chat input will be Phase 2.

---

## Goal

In People > Lend/Repay > Add Transaction modal, add a Split Bill workflow for group/team debts.

User story:

- I select a team/group (e.g. GCS) that contains multiple people.
- I toggle Split Bill.
- I see a table listing participants and how much each owes.
- Submitting creates one debt transaction per participant (or repay transactions, same pattern).

---

## Non-negotiable requirements

1. No breaking changes to existing debt logic.
2. No new dependencies.
3. Must preserve existing fields / displays and not regress current People pages.
4. Loading UX:
   - Save/Update button must disable + show spinner to prevent double submit.

---

## Scope (MVP)

### A) UI: Split Bill toggle in TransactionForm

- Add a split_bill toggle only for transaction types:
  - lend / debt (whatever your internal enum is)
  - repay
- When OFF:
  - Form behaves exactly as today.
- When ON:
  - Replace single-person debt selection with participants selection + SplitBillTable.

### B) Participants selection

Provide 2 options:

1. Select a Group (Team) -> auto-load members.
2. Optionally add/remove individuals in the table after group selection.

MVP acceptance:

- It's OK to start with "Select group only" if that's faster, as long as members appear.

### C) SplitBillTable component

- Renders rows: Person | Share (amount) | Paid by (optional) | Note (optional)
- Default:
  - Total amount = main Amount in form
  - Split evenly by default across members
  - Default payer = "Me" (the current user / self) for the bill
- Validations:
  - Sum of row amounts must equal Total Amount
  - No negative, no empty person
  - Show inline error in modal, not console-only

### D) Submit behavior (CRITICAL)

When Split Bill ON:

- On submit, create N transactions (N = number of participants).
- Each transaction:
  - person_id = participant
  - amount = participant share amount
  - type = lend or repay (based on form)
  - note includes a standardized prefix, e.g.:
    - [SplitBill] {groupName} | {billTitle}
    - plus optional payer info
- Must be done as a single UX action:
  - One Save click creates all rows
  - Loading state until all requests complete
  - If any request fails:
    - show error summary
    - do not silently partially succeed without informing user

Implementation guidance:

- If backend has bulk endpoint, use it.
- If not, do sequential or Promise.all with proper error handling.

### E) People page integration

- From People details (or group view), clicking Lend/Repay should allow Split Bill.
- After save, UI refreshes cycles/list correctly.

---

## Out of scope (Phase 2)

- Gemini API bill split suggestions
- Chat AI quick input
- Dedicated Bill Management page
- Installment + split interactions

---

## Files to inspect (must read)

- src/components/moneyflow/add-transaction-dialog.tsx
- src/components/moneyflow/transaction-form.tsx
- People detail components and debt cycle list/group:
  - src/components/people/**
  - src/components/moneyflow/debt-cycle-list.tsx
  - src/components/moneyflow/debt-cycle-group.tsx
- Any services used to create debt/repay transactions.

---

## Deliverables

1. SplitBillTable component (new file) and integration into TransactionForm.
2. Submission logic to create multiple transactions.
3. Inline validation errors.
4. Loading UX on Save/Update.
5. Short dev note in PR description: design decisions, limitations, next Phase 2.

---

## Acceptance criteria

- Split Bill OFF -> no behavior changes.
- Split Bill ON:
  - group members appear
  - default even split
  - total validation works
  - Save creates N transactions
  - modal prevents double submit
- pnpm run build passes.
