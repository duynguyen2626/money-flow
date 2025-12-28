---
description: Agent Prompt
---

# Agent Task Prompt (ENG)

## Title

Hard Refactor Accounts UI — MoneyFlow v3.8 (Family-Centric, Pixel-Exact)

## Absolute Rule (READ FIRST)

You are **NOT allowed** to reuse or lightly tweak existing Accounts UI layout.
This task requires a **clean refactor** that **matches the provided mockups (Images 2–4)**.

❌ Do NOT:

* Reuse old layout structure and "restyle" it
* Mix old sections with new ones
* Improvise your own design

✅ You MUST:

* Treat Images **2 / 3 / 4** as the **single source of truth**
* Build UI strictly according to the specification below

Image 1 = ❌ WRONG (current, rejected)
Images 2–4 = ✅ CORRECT (target)

---

## Visual Comparison Requirement (MANDATORY)

Before coding, you must explicitly compare:

* **Image 1** (current broken design)
* **Image 2–4** (approved mockups)

And understand why Image 1 is wrong:

* Old code reused
* No clear Family (Parent–Child) ecosystem
* Card sections fragmented
* No visual bridge between Parent & Child
* Cashback rules feel bolted-on, not integrated

Your implementation will be reviewed **side-by-side with the mockups**.

---

## Core Design Concept

**MoneyFlow v3.8 = Family Financial Ecosystem**

Parent–Child accounts are NOT independent cards.
They form a **financial cluster** and must always be rendered together.

---

## 1. Family Logic (CRITICAL)

### 1.1 Family Search Logic

When searching by name:

* Searching Parent OR Child → ALWAYS render the **entire family cluster** (2–3 cards)
* Never show a Child alone
* Never break financial context

---

### 1.2 Family Bridge (Visual + Structural)

Between Parent and Child cards:

* Render a **Link / Chain icon** at the exact center
* Draw a **dashed connector line** between cards
* This bridge represents the "financial bloodstream"

Rules:

* Icon must be centered between cards
* Connector uses dashed border (not solid)
* Bridge is part of layout, not decoration

---

## 2. Grid System (NON-NEGOTIABLE)

* Base grid is **grid-cols-2** (even when zoomed)
* Purpose: prevent Parent–Child cards from stacking vertically
* Families always occupy **2 columns as a unit**

Responsive behavior:

* Mobile: Family cluster stacks internally but remains grouped
* Desktop: Family cluster is horizontal

No grid-cols-3 / 4 / 5 experiments are allowed.

---

## 3. Card Design — Modern Slate System

### Card Container

* Border radius: **rounded-3xl**
* Clean slate background
* Border color reflects status:

  * Urgent → Red
  * Warning → Amber
  * Normal → Slate

---

### Header Zone

* Left: Days Left badge
* Right: Secured / Unsecured badge (green / amber)
* Edit icon aligned, minimal

Badges must be visually balanced (symmetrical weight).

---

### Need / Spent Zone (VERY IMPORTANT)

* Single unified section (NOT split cards)
* Vertical divider between Need and Spent
* Numbers must never overlap or wrap awkwardly
* Billing Cycle label sits ABOVE this zone

---

### Feature Zone (Height Consistency Rule)

Cashback Bar and Progress Bar:

* Must share the SAME visual height
* Enforce `min-h-[44px]`
* This prevents cards from becoming uneven

Cashback Rules:

* Render as integrated block inside card
* Tooltip expands from same area
* No floating / detached popovers

---

### Media Integration

* Card image is PART of the card
* Do NOT split image into a separate visual column
* Image, content, and actions are one cohesive unit

---

### Action Bar

* 4 icon-only actions
* Equal width buttons
* Soft pastel backgrounds
* Tooltip on hover

---

## 4. Interaction & Loading UX (GLOBAL)

### 4.1 Modal Add / Edit (ALL MODALS)

On Save / Update:

* Button enters loading state
* Button disabled immediately
* Prevent double submit completely

---

### 4.2 Navigation Loading (ALL CLICKABLE ITEMS)

Any click that causes:

* route change
* data fetch

MUST:

* Show loading indicator immediately
* Never leave static screen

This includes Accounts → People → Transactions → Details.

---

## 5. Technical Constraints

* UI ONLY refactor
* Do NOT change domain logic
* No new libraries
* Tailwind + shadcn + lucide-react only
* Create NEW layout components if needed
* Old layout code must be deleted if obsolete

---

## Files Expected to Change

* `src/app/accounts/page.tsx`
* `src/components/moneyflow/account-list.tsx`
* `src/components/moneyflow/account-card.tsx`
* New family-cluster layout components (if needed)
* Modal components (loading states)

---

## Acceptance Criteria (STRICT)

* UI matches mockups (Images 2–4) visually
* Family clusters never break
* Parent–Child bridge is visible and clear
* Cards are height-aligned
* No reuse of old broken layout
* Loading feedback everywhere
* `pnpm run build` passes

---

## Final Output

1. Files changed
2. Screenshot comparison: Image 1 vs New UI
3. Checklist confirming each rule above
