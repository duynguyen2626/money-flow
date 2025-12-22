---
description: Task Descriptions
---

# PHASE 7.2B — Cashback Rules UX (Less Cloning for Level Thresholds)

> This is a refinement to Phase 7.2. Goal: **reduce manual cloning** when the same category set exists across multiple spend groups (Levels), e.g. VPBank Lady rules for <15M and ≥15M statement-cycle spend.

---

## Problem to solve

Current UI forces the user to:

* create Level 1 (<15M)
* create Level 2 (≥15M)
* then **duplicate** the same category groups (Education, Insurance, Beauty/Health/Fashion/Entertainment, Supermarket) across Levels, re-selecting categories and retyping caps.

This is high-friction and error-prone.

---

## UX Goals

1. User can define the **category sets once** and reuse them across Levels.
2. User can input “paired” values for the same set across multiple Levels (e.g. low/high) without cloning rules manually.
3. Still supports true cloning for unrelated rules (e.g. Medical vs Education).

---

## Proposed UX (Minimal change, maximum relief)

### A) Rule Templates (Category Sets) within an Account

Introduce an in-form concept: **Rule Templates** (local to the account config screen; persisted into cashback_config).

* A template = a named set of categories.
* Example templates:

  * `Education`
  * `Insurance`
  * `Beauty/Health/Fashion/Entertainment`
  * `Supermarket`

**UI placement:**

* Above “Cashback Levels”, add a compact section:

  * `Category Sets (Templates)`
  * [Add Set]
  * Each set: Name + multi-select categories + (optional) icon

**How it reduces work:**

* In a Level’s rules area, user chooses `Use Category Set` dropdown → pick `Education` → categories auto-filled.

---

### B) Multi-Level Rate Input for a Template (optional, but recommended)

For common patterns like VPBank Lady, provide a “2-group builder”:

* User defines 2 Levels:

  * Group A: `< 15,000,000` (Level 1)
  * Group B: `≥ 15,000,000` (Level 2)

Then for each Category Set template, show a compact matrix row:

| Category Set | Level 1 Rate | Level 1 Max | Level 2 Rate | Level 2 Max |
| ------------ | ------------ | ----------- | ------------ | ----------- |
| Education    | 7.5%         | 150k        | 15%          | 200k        |

**UI behavior:**

* This matrix writes two rules automatically:

  * One rule in Level 1
  * One rule in Level 2
* No cloning or reselecting categories.

**Important:** This is just a UI helper. Persisted config remains the same canonical Levels/Rules shape.

---

### C) “Apply this rule to other levels…” shortcut (fastest win)

If you want the smallest possible scope:

* On each rule card, add action: **Apply to…**

  * modal: select target Levels (checkbox list)
  * options:

    * copy categories only
    * copy rate/max too
    * copy categories but allow me to edit rate/max after

This alone solves the complaint: you build Education once, then apply to Level 2 and only adjust numbers.

---

## How VPBank Lady is represented

### Levels

* Level 1: minTotalSpend = 0
* Level 2: minTotalSpend = 15,000,000

### Default fallback (both groups)

* program.defaultRate = 0.001 (0.1% unlimited)

### Category Rules examples

* Education:

  * L1: 0.075 max 150k (or 200k if the product spec says so)
  * L2: 0.15 max 200k
* Insurance:

  * L1: 0.075 max 150k
  * L2: 0.15 max 300k
* Supermarket:

  * L1: 0.025 max 150k
  * L2: 0.05 max 200k

---

## Persistence (No schema changes)

Do NOT add new tables.
Persist templates inside cashback_config under:

```json
{
  "templates": [
    {"id":"tpl_edu","name":"Education","categoryIds":["..."]}
  ],
  "program": {...},
  "levels": [...]
}
```

During normalization:

* templates are optional
* if templates exist, UI uses them
* policy resolution ignores templates (rules already expanded into levels)

---

## Acceptance Criteria

1. User can create a rule once and apply it to multiple levels without reselecting categories.
2. Editing a template updates category selection in the UI helpers (but does not silently mutate expanded rules unless user confirms).
3. No breaking change to existing accounts without templates.
4. VPBank Lady setup can be entered with **~70% fewer clicks** compared to current UI.

---

## Recommended implementation order

1. Add “Apply to other levels…” shortcut (smallest scope, biggest relief)
2. Add Rule Templates (category sets)
3. Add optional matrix builder (only if you want a premium UX)

---

## Branch / PR

* Branch: `phase-7.2b-cashback-rules-ux`
* PR title: `Phase 7.2B: Cashback rules UX (apply-to-levels + category templates)`
