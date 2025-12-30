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

---

# Phase 1 Status - Split Bill MVP (DONE)

Status report for the next agent:

- Split Bill toggle added to lend/repay flow with group + participant selection.
- Base transaction is created for traceability; split rows are linked via metadata.
- Split repayment behavior avoids auto-adding owner; single repay can map to group.
- Paid-before support exists for lend only (not repayment).
- Split Bill Manager tab in People details with Copy Table / Copy QR capture.
- QR image URL is stored on base transaction metadata and used for capture.
- Quick Repay opens prefilled split repayment dialog.
- Build passes; lint has pre-existing repo-wide errors.

---

# Phase 2 Task Prompt - Natural Language Quick Add (Chatbot) [Dashboard Only]

## Goal

Add a dashboard-only chat assistant to create transactions from natural language input.
The bot should guide the user through a dialog (wizard style) and always show a review
step before creating a transaction.

## Scope

In-scope:
- Dashboard page only (no global widget yet).
- Wizard-style dialog with optional natural language parsing.
- Supports types: expense, income, transfer, lend, repay.
- Can toggle Split Bill for lend/repay and prefill participants.
- Uses existing TransactionForm/AddTransactionDialog for final review/submit.

Out of scope:
- Global chat on all pages.
- Voice input.
- Auto-post without user confirmation.
- AI split suggestions beyond the current split-bill rules.

## UX Requirements

- Entry point on dashboard: "Quick Add (Chat)" button.
- If user types NL input, attempt to parse and prefill fields.
- If fields are missing, ask follow-up questions (who, amount, account, date, note).
- Show recent people and accounts as fast-pick chips.
- Always show a confirmation summary and allow edit before submission.
- For lend split: auto-include owner if current UI does.
- For repay split: do NOT auto-include owner.

## Conversation Flow (Wizard)

1) Ask type (lend/repay/expense/income/transfer) if missing.
2) Ask amount (required).
3) Ask who (person or group) for lend/repay. Offer recent people/groups.
4) Ask account (source, and destination if transfer).
5) Ask date/time (default today if missing).
6) Ask note (optional).
7) For lend/repay: ask if split bill should be on (default off unless detected).
8) Review summary card -> Confirm -> open AddTransactionDialog with prefilled values.

## Data Sources

- People (groups + members), accounts, categories, shops, recent transactions.
- Tag uses existing `generateTag` and must stay `YYYY-MM`.

## Implementation Guidance

- No new dependencies.
- Create a dashboard-only chat component (new file in `src/components/ai/` or similar).
- Use server-side route for LLM parsing (do not call Gemini from client).
- Reuse AddTransactionDialog with `initialValues` / `cloneInitialValues`.
- Use existing validation logic in TransactionForm.

## Gemini Integration (Server-side)

Use a structured JSON response. Example schema:

{
  "intent": "expense|income|transfer|lend|repay",
  "amount": number|null,
  "people": [{ "id": string|null, "name": string }], 
  "group_id": string|null,
  "split_bill": boolean,
  "occurred_at": "YYYY-MM-DD" | null,
  "source_account_id": string|null,
  "debt_account_id": string|null,
  "category_id": string|null,
  "shop_id": string|null,
  "note": string|null,
  "needs": ["amount","person","account","date","split_confirm"],
  "confidence": 0.0
}

Prompt rules:
- Output JSON only, no extra text.
- If a field is unknown, return null and add to `needs`.
- Never hallucinate IDs; use `name` when unsure.
- Use the existing split-bill rules: lend can include owner by default, repay never auto-adds owner.

## Fallback (No AI)

If Gemini fails or is disabled:
- Use a simple rule-based parser for amount + keywords (lend/repay/transfer).
- Continue wizard questions to fill missing fields.

## Files Expected to Change

- `src/app/(dashboard)/page.tsx` (or dashboard entry point)
- `src/components/ai/quick-add-chat.tsx`
- `src/components/ai/quick-add-chat-message.tsx` (optional)
- `src/app/api/ai/parse-transaction/route.ts`
- Maybe shared types under `src/types/ai.types.ts`

## Deliverables

1) Dashboard chat UI with wizard flow.
2) Server-side Gemini parse endpoint with JSON schema output.
3) Integration that opens AddTransactionDialog prefilled.
4) Manual test checklist.
5) Build passes.

## Acceptance Criteria

- Chat only appears on dashboard.
- No transaction created without explicit confirm.
- Missing fields trigger follow-up questions.
- Split bill behavior matches current UI rules.
- Build passes.

## Phase 2 Status (In Progress)

Completed:
- Quick Add chat wizard with parse endpoint + review step.
- Floating widget on Dashboard, Transactions, and People detail pages.
- People detail context auto-binds the selected person/group.
- Templates API + `quick_add_templates` table migrations.
- Temp transaction view at `/transactions/temp-<id>`.

Pending / follow-ups:
- Final polish on review layout responsiveness (spacing + edit controls).
- Apply RLS migration for template saves in all environments.
