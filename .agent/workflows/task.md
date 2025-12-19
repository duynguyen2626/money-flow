---
description: Task Descriptions
---

# MF5.2.2B — Fix Cashback Hint + Data Sync (Prep for MF5.3 Category-based Cashback)

You are the coding agent working on **Money Flow 3**.
This is **Phase MF5.2.2B**.

This phase must stabilize the cashback foundation (cycles/entries/hints) and prepare clean interfaces for MF5.3 where cashback is computed by **category rules / tiers**.

---

## 0) What MF5.2.2B is (and is not)

### IN SCOPE

* Fix remaining bugs where cashback % and budget-left hint are incorrect.
* Ensure every transaction add/edit/delete updates:

  * `transactions`
  * `cashback_entries`
  * `cashback_cycles`
* Fix NaN in edit-account tier UI.
* Standardize cashback config parsing (aliases) and define a stable internal config shape.
* Add preparation hooks for MF5.3:

  * clean function boundaries for “resolve cashback policy for txn” (currently just default rate/cap)
  * ensure category is available in the resolution inputs

### OUT OF SCOPE

* Full MF5.3 implementation of category-based rules and spend thresholds.
* Major UI redesign.

---

## 1) Non-negotiable data contracts

### 1.1 Percent representation

* DB `transactions.cashback_share_percent`: **decimal fraction** in [0..1], e.g. `0.08`.
* UI percent input/display: **raw percent number** in [0..100], e.g. `8`.
* Exactly one conversion layer:

  * Load: decimal → percent
  * Save: percent → decimal
* Sheet export: percent must be sent as **raw percent** (8, not 0.08).

### 1.2 Cashback tables must always sync

For any txn affecting cashback:

* Create/Update must upsert **one** `cashback_entries` row.
* Delete must remove the entry.
* Every mutation must recompute `cashback_cycles`.
* If edit changes account_id or cycle_tag: recompute both old and new cycles.

### 1.3 Budget left formula

When `cashback_cycles` exists for (account_id, cycle_tag):

* `budget_left = max(0, max_budget - real_awarded - virtual_profit)`
  UI must prefer cycle totals over raw config.

---

## 2) Required fixes

### 2.1 Fix cashback hint still showing full budget

* Identify all UI components that show:

  * Budget Left
  * Max budget
  * Card rate
  * Cycle range
* Fix them to read from `cashback_cycles` (when present).
* If cycle missing, show placeholder (e.g. `--`) for budget-left; do NOT mislead.

### 2.2 Ensure `cashback_entries` is created for every cashback txn

* Audit transaction create/update code path.
* Confirm that for `cashback_mode`:

  * `real_fixed` creates a `cashback_entries(mode='real')` with amount = fixed
  * `real_percent` creates entry with amount = computed real cashback or stored fixed equivalent (choose one, document)
  * `none_back` creates entry mode='virtual'
  * `voluntary` creates entry mode='voluntary' counts_to_budget=false
* Ensure idempotency: no duplicates per txn.

**DB constraint required (safe):**

* Add unique index: `cashback_entries(account_id, transaction_id)`.

### 2.3 Fix NaN in edit-account-dialog tiers

Console error shows:

* `value={rule.rate * 100}` producing NaN when rate is undefined.

Fix requirements:

* Default rate to 0 for render: `(rule.rate ?? 0) * 100`.
* On change, parse number safely; if empty string, set to 0 or undefined consistently.
* Ensure no uncontrolled/controlled warnings.

### 2.4 Standardize cashback_config parsing (aliases)

Accounts have mixed keys:

* `max_amt` vs `maxAmount`
* `min_spend` vs `minSpend`
* `cycle` vs `cycleType`
* `statement_day` vs `statementDay`

Implement `parseCashbackConfig()` that returns a single internal shape:

```ts
{
  rate: number;                 // decimal
  cycleType: 'calendar_month' | 'statement_cycle';
  maxAmount: number | null;     // VND cap per cycle
  minSpend: number | null;
  statementDay: number | null;
  hasTiers?: boolean;
  tiers?: ... // keep as-is for MF5.3, but never break if missing
}
```

---

## 3) MF5.3 preparation: reduce “tier” confusion and create clean extension points

### 3.1 Naming guidance

The term “tier” is confusing. Start migrating terminology in UI labels (no DB rename yet):

* Prefer: **Cashback Levels** or **Cashback Rulesets**
* In code, prefer: `levels` or `rules` instead of `tiers`

### 3.2 Add a single policy resolver function (stub for MF5.3)

Create a function used by transaction cashback calculation:

* `resolveCashbackPolicy({ account, categoryId, amount, cycleTotals })`

For MF5.2.2B it can return default policy:

* rate, cap, minSpend from parsed config

But it must accept:

* `categoryId` (for MF5.3)
* `amount` and `spent_amount` (for spend thresholds in MF5.3)

This keeps MF5.3 changes localized.

---

## 4) Verification checklist (Agent must verify with SQL)

For the Lady example (or any card):

### 4.1 transactions

* Row has:

  * `cashback_mode` set appropriately
  * `cashback_share_fixed` or `cashback_share_percent` correct

### 4.2 cashback_entries

* Exactly 1 row exists for the txn:

  * correct `mode`
  * correct `amount`
  * `cycle_id` matches cycle

### 4.3 cashback_cycles

* Row exists for (account_id, cycle_tag)
* `max_budget` matches parsed config maxAmount
* `real_awarded` updates after txn
* `budget_left = max_budget - real_awarded - virtual_profit` is correct

### 4.4 UI

* Hint displays Budget Left correctly
* No NaN warning in tier editor

### 4.5 Sheet export

* Percent is sent as raw percent number (8 not 0.08)

---

## 5) Required test cases

### Test 1 — Real Fixed affects budget left

* Card max budget 1,000,000
* Create txn real_fixed 100,000
  Expected:
* cycle.real_awarded=100,000
* UI budget_left=900,000

### Test 2 — Edit txn updates cycle (no duplicates)

* Edit fixed 100,000 → 150,000
  Expected:
* still 1 entry
* cycle.real_awarded=150,000
* UI budget_left=850,000

### Test 3 — Percent display and sheet export

* DB stores 0.08
  Expected:
* UI shows 8
* Sheet export sends 8

### Test 4 — NaN regression

* Open edit-account dialog with rules missing rate
  Expected:
* no NaN warning

---

## 6) Branch / PR info (do NOT ask for commit workflow file)

* **Branch:** `PHASE-9.2.2B-CASHBACK-HINT-PREP-CATE-RULES`
* **Commit message:** `MF5.2.2B - Fix cashback hint sync + prep policy resolver for MF5.3`
* **PR title:** `MF5.2.2B: Fix cashback hint + data sync; prep for category-based cashback`

---

## 7) PR description requirements

Include:

* Before/after screenshot of Budget Left for Lady example
* SQL snippets showing:

  * transactions row
  * cashback_entries row
  * cashback_cycles row
* Confirmation checklist + test case results
