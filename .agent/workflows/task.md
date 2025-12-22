---
description: Task.md
---

# PHASE 7.1 — Cashback Rules UI Rework

> Priority decision: Start Phase 7 with **UI + naming + config normalization + versioning** (items 2,3,5).
> Reason: It reduces confusion, prevents NaN/percent bugs, and creates a stable base for advanced category rules in 7.2.

---

## Why PHASE 7.1 is the best next canvas

We already confirmed Phase 6 migration is clean and the Account Details now has **Transactions** + **Cashback Analysis** tabs.
The remaining risk is: the current “Tier” UI + mixed config keys leads to user confusion, percent display bugs, and recompute uncertainty.

So Phase 7.1 focuses on:

* rename concepts (Tier → Level, Tier Rule → Category Rule)
* normalize `accounts.cashback_config` into one canonical shape
* introduce `cashback_config_version` to force deterministic recompute

This unlocks Phase 7.2 (advanced category rules) safely.

---

## Scope

### In scope

### (2) Rename Tier UI and labels → Levels / Rules

* Everywhere in UI, replace:

  * “Tier” → **Level**
  * “Advanced Tiers” → **Cashback Levels**
  * “Tier 1/2/3” → **Level 1/2/3**
  * “Category Rules” stays but must be clearly nested under a Level.

* Also update helper texts:

  * “Min Total Spend” = threshold to enter that level
  * “Default Rate” = level default rate (inherits from program default if blank)
  * “Max Reward” = cap for that rule/level

### (3) Implement/prepare Advanced Category Rules (UI groundwork, not full engine)

* Keep the existing ability to add multiple category rules inside a level.
* Improve UX:

  * Add “Applies to Categories” multi-select with chips
  * Add numeric inputs with percent formatting (UI shows %; DB stores decimals)
  * Add “Max Reward (VND)” optional

> NOTE: Full dynamic policy resolution by category will be Phase 7.2.
> In 7.1 we only ensure the UI can reliably capture + persist rules.

### (5) Add deterministic recompute triggers via versioning

* Add column `accounts.cashback_config_version` (int, default 1).
* Any change to cashback_config (cycleType, statementDay, rates, levels, rules, maxBudget, minSpend) must:

  1. increment `cashback_config_version`
  2. trigger recompute for recent cycles (ex: last 12 cycles)

---

## Canonical cashback_config shape (must be enforced)

Agent must normalize legacy keys into this canonical JSON shape on read & write:

```json
{
  "program": {
    "defaultRate": 0.003,
    "cycleType": "statement_cycle",
    "statementDay": 20,
    "maxBudget": 1000000,
    "minSpendTarget": 0,
    "dueDate": 15
  },
  "levels": [
    {
      "id": "lvl_1",
      "name": "Default",
      "minTotalSpend": 0,
      "defaultRate": null,
      "rules": [
        {
          "id": "rule_1",
          "categoryIds": ["..."],
          "rate": 0.1,
          "maxReward": 300000
        }
      ]
    }
  ]
}
```

Rules:

* UI displays rates as percent (10) but persist decimals (0.1)
* If `levels` is empty, treat as only `program.defaultRate`
* Parse legacy config keys:

  * `rate` → program.defaultRate
  * `cycle` or `cycleType` → program.cycleType
  * `max_amt` or `maxAmount` → program.maxBudget
  * `min_spend` or `minSpend` → program.minSpendTarget
  * `statement_day` or `statementDay` → program.statementDay

---

## Required engineering changes

### A) UI refactor (edit/create account dialogs)

* Rename all labels + section headers.
* Ensure numeric inputs never receive NaN (guard empty state).
* Percent inputs:

  * UI value is 0..100
  * state stores decimal 0..1
  * display rounding to max 2 decimals

### B) Config normalization utilities

* Create 1 helper:

  * `normalizeCashbackConfig(rawConfig): CanonicalConfig`
* Use it consistently in:

  * account forms
  * cashback policy resolution
  * cashback recompute services

### C) Versioning + recompute

* Add DB migration:

  * `accounts.cashback_config_version int not null default 1`
* On account update, detect if cashback_config changed (deep compare canonical form).

  * If changed: increment version and call recompute

### D) Recompute behavior

* Implement/standardize one function:

  * `recomputeCashbackForAccount(accountId, { monthsBack: 12 })`
* Must be idempotent.

---

## Acceptance criteria

1. No more “Tier” wording in UI; everything reads “Level / Rule”.
2. Saving account config produces canonical JSON shape.
3. Editing rates never shows 500%/800% type bugs.
4. Changing cashback config increments version and triggers recompute.
5. Existing accounts with legacy config still render correctly after normalization.

---

## Branch / Commit / PR

* Branch: `PHASE-7.1-CASHBACK-RULES-UI-NORMALIZE`
* Commit: `PHASE 7.1 - Rename tiers to levels, normalize cashback config, add versioning + recompute`
* PR title: `Phase 7.1: Cashback rules UI refresh + config normalization + versioned recompute`

---

## Phase 7 roadmap (for reference)

* **PHASE 7.2**: Implement full category-based policy resolution (Levels + Rules) affecting entries/cycles.
* **PHASE 7.3**: Optional DB normalization (split rules into relational tables) only if JSON becomes too heavy.
