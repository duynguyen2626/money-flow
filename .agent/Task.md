# MF3 — Agent Prompt Pack

## Phase P8.x — Accounts Table & Cards UI Polish

> Style: **Prompt Engineering (phase-style)**
> You are the coding agent. You will read the repo, reason about the existing code, implement changes, run checks, and open PRs.
> Do NOT ask the user to code.

---

## Prompt Structure Recommendation

**Yes — split into 2 prompts.**

Reason:

* Prompt A touches **table semantics & layout** (AccountTable, AccountList, filters, collapse rows).
* Prompt B touches **card grid layout & action logic** (AccountCard, card-utils, batch confirm flow).

This reduces regression risk and keeps PRs reviewable.

You will produce **2 PRs**, merged in order.

---

# PROMPT A — Accounts Table View Refactor & Grouping

## Goal

Refactor **Accounts → Table view** for clarity, density, and consistency.
Fix spacing, column semantics, grouping UX, and linkage badges.

## Scope (FILES YOU MUST TOUCH)

* `src/components/moneyflow/account-table.tsx`
* `src/components/moneyflow/account-list.tsx`
* (if needed) `src/components/ui/table.tsx`

## Functional Requirements

### A1 — Columns & spacing

* **Remove / hide column `Type`** (both header + cells).
* Split the current column `Balance / Limit` into **two columns**:

  * `Balance`
  * `Limit`
* Add a dedicated column `Cashback / KPI`:

  * Shows `Cap left`, `Met`, `Need to spend` state.
* Fix the large empty gap between `Linkage` and `Actions`:

  * Set fixed widths:

    * `Linkage`: ~160px
    * `Actions`: ~72–80px

### A2 — Identity column (image rules)

* Identity column must show **card image at native ratio**:

  * NO square crop
  * NO ghost border
  * Use `object-contain`
  * Fixed width ~64–72px
* If no image → fallback icon as before.

### A3 — Linkage badge rules

* Replace `Parent (1)` text badge:

  * Show **icon only + label**
  * Parent → `<Users /> Parent`
  * Child → `<Baby /> Child`
  * Do NOT show count number when count = 1
* Badge color stays consistent with card view.

### A4 — Collapsible group headers

* Each account type group (Credit Cards, Payment, Savings, Debt) must be:

  * Rendered as a **collapsible block** using `<details>/<summary>` or equivalent.
  * Summary row shows:

    * Group name
    * Count
* Default: **expanded**.
* Sticky header behavior must still work.

### A5 — Table actions

* Actions column remains right-aligned.
* No logic changes here (Confirm Paid is handled in Prompt B).

## Acceptance Criteria (Prompt A)

* Table view has no `Type` column.
* Columns are compact, readable, and aligned.
* Card images are uncropped and clean.
* Linkage badges show icons, not numbers.
* Groups can be collapsed/expanded without layout break.

## PR Instructions (Prompt A)

* Branch: `fix/accounts-table-layout`
* Commit examples:

  * `refactor(table): split balance and limit columns`
  * `feat(table): collapsible account group headers`
  * `fix(table): linkage badges and spacing`

---

# PROMPT B — Cards Grid Unification & Action Required Logic

## Goal

Unify **Account Card UI**, fix badge logic, restore missing actions, and ensure Action Required is correct.

## Scope (FILES YOU MUST TOUCH)

* `src/components/moneyflow/account-card.tsx`
* `src/lib/card-utils.ts`
* `src/components/moneyflow/account-list.tsx`
* (optional) `src/components/moneyflow/account-detail-header.tsx`

## Functional Requirements

### B1 — Card layout unification (ALL card types)

Order inside card must be:

1. Header (name + Details/Edit)
2. Balance
3. KPI / Spend Progress
4. Secured / Family info (if exists)
5. **Limit bar** (ALWAYS pinned at bottom of card body)
6. **Quick Add actions** (Income / Expense / Pay / Shop / Repay) → ALWAYS LAST

Rules:

* Limit bar must visually sit at the **bottom edge** of card body (no floating).
* No card may violate this order.
* Savings / Asset cards must follow same layout where applicable.

---

### B2 — Standalone badge logic (FIX)

Correct logic:

```
isChild = !!account.parent_account_id || !!account.relationships?.parent_info
isParent = (account.relationships?.child_count ?? 0) > 0 || account.relationships?.is_parent
showStandalone = !isChild && !isParent
```

* Only show Standalone if `showStandalone === true`.

---

### B3 — Visual redesign: Spend / Due / Progress clarity (NEW)

#### B3.1 — Redesign `Need to spend` UI

Current UI is noisy and inconsistent with `SHARE / REMAINS`.

You must redesign it to match **shared/remains style**, with different color:

* Replace `Need to spend` bar + text with a **two-column pill block**:

  * LEFT: `NEED` (label)
  * RIGHT: amount remaining to qualify
* Use warm color (amber/orange), **NO check icon**.
* Typography must match SHARE/REMAINS block for visual consistency.

#### B3.2 — Due badge prominence (IMPORTANT)

Current `Due` badge is too small and easy to miss.

You must implement a **top hanging Due banner**:

* Position: slightly **outside and above** the card, attached to **left image section**.
* Shape: small rounded tag / ribbon (see mockup ref from user).
* Text: `Due Dec 15` or `Due in 3 days`.
* Color: red for due soon, darker red for overdue.
* This element must visually overlap card container (use `absolute -top-*`).

Think of this as a **card status flag**, not a normal badge.

---

### B4 — Transfer quick-add correctness (LOGIC FIX)

When user clicks **Transfer** quick-add:

* Category MUST auto-select `Money Transfer`.
* Source account selection rules:

  * Transfers **CANNOT originate from Credit Cards**.
  * Disable / hide credit accounts in source selector.

You must search entire codebase to ensure:

* No path allows transfer-from-credit via UI.
* Existing transfer flows respect this constraint.

---

### B5 — Action Required grouping (extend)

Action Required must include cards that are:

1. Due soon
2. Need to spend
3. Waiting confirm (pending batch)

Order inside section:

* Due soon
* Need to spend
* Waiting confirm

Cards in this state:

* Must be placed in Action Required section
* Must NOT appear in normal card sections

---

### B6 — New Filter: Family Cards (REPLACE Secured filter)

Replace filter button **Secured** with **Family Cards**.

Family Cards filter opens a **2-tab view**:

#### Tab 1 — Secured

* Cards linked via `secured_by_account_id`.
* Group secured pairs into **one section with border**.
* Inside section:

  * Hide individual `Secured` badges on cards.
  * Show a **central arrow icon** between cards (account → secured account).
* Section acts as a logical unit.

#### Tab 2 — Family

* Group Parent–Child cards by family.
* Each family = one bordered section.
* NO arrows required.
* Section summary (top-right corner):

  * Combined Limit
  * Combined Balance
  * Individual balances per card (small text)

---

## Acceptance Criteria (Prompt B)

* Spend / Need UI is clean, symmetric, and readable.
* Due status is immediately visible without scanning card body.
* Transfer quick-add always sets correct category and blocks credit source.
* Limit bar is always at bottom.
* Family Cards filter works with 2 tabs and correct grouping.

---

## PR Instructions (Prompt B)

* Branch: `fix/cards-ui-b3-redesign`
* Commit examples:

  * `feat(cards): redesign need-to-spend and due banner`
  * `fix(transfer): enforce non-credit source and auto category`
  * `feat(filters): replace secured with family cards view`

---

## QA Checklist

* [ ] Due banner visible and readable
* [ ] Need spend UI matches shared/remains style
* [ ] Limit bar always bottom-aligned
* [ ] Transfer from credit impossible
* [ ] Family Cards filter groups correctly
