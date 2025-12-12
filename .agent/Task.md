# Task: Fix Credit Cards UI/UX + Action Required grouping (rebuild if needed)

## Context

This repo is **Money Flow 3** (Next.js 15 App Router, TS, Tailwind + shadcn, Supabase). Credit-card list UI currently has a persistent bug where cards that **Need to Spend more** are shown in a separate section, while **Action Required → Cards due soon or need more spending** only shows **Due soon** cards. This breaks user expectations and causes missing badges/incorrect layout.

You must **research the repo** and implement fixes. Do not ask the user to code. You will code, run checks, and open a PR.

### Screens (symptoms)

* **Bug:** Action Required header says "Cards due soon or need more spending" but only due-soon cards appear. Need-to-spend cards appear elsewhere (separate section), mixed with normal cards.
* **UX issue:** Standalone badge is black and hard to read; should be a dark-but-not-black color and bold.
* **Badge missing:** "Due: …" badges disappeared in the Action Required section.
* **Image issue:** Left image area behaves wrong: images appear sideways / wrong orientation / not filling the left section.

## Objectives

### O1 — Unify classification & sectioning (stop the persistent bug)

Rebuild the sectioning logic for credit cards from scratch **if necessary**.

Expected sections:

1. **Action Required**

   * Subtitle: "Cards due soon or need more spending".
   * Contains **ALL cards** that match either:

     * **Due soon** (immediate due date window), OR
     * **Need to spend more** (minSpend not reached for current cycle).
2. **Credit Cards (without immediate due dates)**

   * Contains remaining credit cards **that are not in Action Required**.

Constraints:

* A card must appear in exactly **one** section.
* Do not show need-to-spend cards in a separate section anymore.
* Ensure sorting is stable and predictable (see O4).

### O2 — Fix badges & visibility

* Restore and ensure the **Due: …** badge is displayed wherever it should be (Action Required cards included).
* Ensure "Need to spend" indicator is clearly visible (existing text is OK, but it must be consistent).
* Fix the **Standalone** badge:

  * Replace pure black background with a dark readable color (e.g., slate/neutral), add **bold** text.
  * Ensure contrast over any card image.

### O3 — Fix left image section & orientation

The left area of each card should show the card image as a **portrait rectangle** filling the entire left section (no square crop).

#### Must-haves (to prevent the current regression)

* The left image container must **NOT** use `aspect-square`, `aspect-[1/1]`, fixed `h-*` that forces a square, or any layout that clamps height.
* The container must be **full card height** and a fixed/narrow width (portrait strip): `h-full` + a consistent width (e.g. `w-[120px]` / `w-[132px]` responsive).
* The `<img>` / `next/image` must **cover** the container: `object-cover` and `w-full h-full` (or `fill` with `className="object-cover"`).
* Do not let the image render inside a square wrapper. If using `next/image`, ensure its wrapper is not enforcing a square (check parent div styles).

#### Orientation rule

* If the source image is landscape (`naturalWidth > naturalHeight`): rotate 90° for display **and still cover** the portrait container.
* If the source image is already portrait: **do not rotate** and still cover full container.

#### Suggested implementation pattern (robust)

Create a reusable component `CardImagePortrait`:

* Outer container: `relative h-full w-[120px] overflow-hidden` (adjust widths per breakpoint)
* If portrait: render `Image fill className="object-cover"`
* If landscape: render a nested wrapper with `absolute inset-0 flex items-center justify-center` and rotate the image; ensure scaling keeps coverage:

  * Example technique: place the image in a `div` rotated, then set its width/height swapped and use `object-cover`.

#### Visual QA

* For an already-portrait image (your screenshot #2), it must show **full-height portrait strip**, not a square corner crop.
* For landscape images, after rotation it must still fill the strip without letterboxing.
* Due badges near/over the image must remain readable; increase size if needed.

### O4 — Make state explicit (reduce “blind code”)

Current DB does not store an explicit “need spend more” status.

You must:

* Propose and implement **one** of these approaches (prefer lowest-risk):
  A) **Derived state in app** (recommended first): compute a `cardActionState` from existing fields and `view_account_stats`/cashback config.
  B) **DB view** that exposes computed state per account.
  C) **New columns** on `accounts` (or a new table) to persist state per cycle (with timestamps), plus migrations.

If you choose (C), you must also define state model:

* `spend_state`: enum like `NONE | NEED_SPEND | QUALIFIED` (or similar)
* `due_state`: enum like `NONE | DUE_SOON | OVERDUE`
* `action_required`: boolean derived or stored
* include cycle boundaries (statement_day, dueDate) to explain why it’s in a state.

Given this is UI bugfix first, it’s acceptable to implement (A) now, and leave (C) as a follow-up RFC — but you must write down the recommendation in PR description.

## Where to look (you must locate exact files)

Search for:

* The Credit Cards list page / dashboard that renders sections:

  * strings like `Action Required`, `Cards due soon`, `Credit Cards`, `Need to spend`.
* Components for account cards:

  * likely under `src/components/...` (accounts / moneyflow)
* Data assembly logic:

  * account stats computation might be in `src/services/account.service.ts` / `src/services/dashboard.service.ts`.

## Implementation Plan

### Step 1 — Map current logic

* Identify current computed flags:

  * `isDueSoon`, `needToSpend`, `hasMinSpend`, `missingSpend`, etc.
* Identify where sections are built and why cards end up split.
* Add temporary console logs in development if needed (remove before commit).

### Step 2 — Introduce a single source of truth for card state

Create a function (or small module) that converts an account + stats into:

* `actionRequiredReason`: `DUE_SOON | NEED_SPEND | BOTH | NONE`
* `dueBadgeText`: e.g. `Due: 10 Dec` or `Due in 3 days`
* `spendBadgeText`: e.g. `Need to spend: 1,288,539`
* `imageOrientation`: `PORTRAIT | ROTATE_LANDSCAPE`

All UI sections must use ONLY this function.

### Step 3 — Rebuild the sections

* Build arrays:

  * `actionRequiredCards`
  * `normalCards`
* Ensure no duplicates.

### Step 4 — Fix UI pieces

* Update badge styles (Standalone).
* Restore Due badge visibility.
* Replace left image rendering with a portrait-cover component that rotates landscape images.

### Step 5 — QA and acceptance

Run:

* `pnpm lint`
* `pnpm typecheck` (if present)
* `pnpm build`

Manual QA checklist:

* Cards needing spend more now appear in **Action Required** section.
* Action Required section includes both due soon and need spend more.
* Cards without immediate due dates appear in the second section only.
* "Due: …" badge present in Action Required cards.
* Standalone badge is readable and bold.
* Left image is portrait, covers area, rotates landscape images correctly.

## Sample data hint

Account example (need spend more state is derived from cashback_config + spending):

* `cashback_config.minSpend = 3,000,000`
* current cycle spent < minSpend ⇒ show `Need to spend`.

## PR instructions

* Branch: `fix/cards-action-required-sectioning`
* Commits:

  1. `fix(cards): unify action-required classification and sections`
  2. `fix(ui): restore due badges and improve standalone badge style`
  3. `fix(ui): portrait card image with landscape rotation`
* PR description must include:

  * Root cause of the persistent bug
  * What changed
  * Screenshots (before/after)
  * Recommendation about DB-persisted state (if not implemented)
