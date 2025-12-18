---
description: Task Descriptions
---

# MF5.2.2 — Fix Cashback Hint (Budget Left) + Ensure Cycle/Entry Updates + Verification Checklist

You are the coding agent working on **Money Flow 3**.
This task is **Phase MF5.2.2**.

Current status:

* MF5.2.1 fixed percent edit (no more 800/500 bug), but cashback **hint** (Budget Left / Max) still displays incorrect values.
* Example: Vpbank Lady card has max budget 1,000,000 per cycle and a real_fixed cashback of 100,000 already claimed, yet UI still shows Budget Left = 1,000,000 (should be 900,000).

This phase focuses on:

1. **Correct budget left hint logic**
2. Ensuring every transaction add/edit/delete produces the necessary data rows in **cashback_entries** and **cashback_cycles** so hints are correct
3. Providing a strict verification checklist + test cases

---

## A) Root Cause Targets (what to check/fix)

### A1. Missing entry creation

If a transaction has `cashback_mode='real_fixed'` (or percent) but there is no row in `cashback_entries`, then cycle totals will remain 0 and hints will be wrong.

### A2. Cycle not recomputed

If `cashback_entries` exists but `cashback_cycles` was not recomputed (or recompute uses wrong cap), hint may still show full budget.

### A3. UI hint not using cycle totals

The UI may be showing max_budget directly from config (or parsing wrong config keys), instead of computing:

`budget_left = max_budget - real_awarded - virtual_profit`

It must always prefer data from `cashback_cycles` if present.

### A4. Config parsing mismatch

Accounts cashback_config currently uses mixed keys in the wild:

* `max_amt` vs `maxAmount`
* `min_spend` vs `minSpend`
* `cycle` vs `cycleType`
* `statement_day` vs `statementDay`

Parsing must support aliases.

---

## B) Required Behavior

### B1. Budget left formula (single truth)

For a given account + cycle:

* `budget_left = max(0, max_budget - real_awarded - virtual_profit)`
* `real_awarded` is already clamped by cap (post MF5.2.1)
* `virtual_profit` is clamped by remaining cap after real

If `cashback_cycles` row exists:

* UI MUST use it (never fallback to raw config).

If cycle row does not exist:

* UI may show a placeholder (e.g. `--`) or derive max_budget from config, but it must not display misleading “Budget Left” values.

### B2. Entry + cycle guarantees

On transaction create/edit/delete, ensure:

* Transaction is persisted
* Cashback engine upserts (or deletes) one `cashback_entries` row when needed
* Cashback engine recomputes the relevant `cashback_cycles`

Edge case:

* If edit changes account_id or cycle_tag, recompute BOTH old and new cycles.

---

## C) Implementation Tasks

### C1. Fix/create missing `cashback_entries` for cashback txns

* Audit create/update transaction path to confirm it calls `upsertTransactionCashback`.
* Ensure mode handling includes `real_fixed` and `real_percent` and creates entry even when percent=0 but fixed>0 (or vice versa).
* Add/confirm an upsert unique key on `(account_id, transaction_id)` to prevent duplicates.

### C2. Ensure recompute runs after every mutation

* After upsert/delete entry: recompute the cycle.
* If account_id/cycle_tag changed: recompute old cycle and new cycle.

### C3. Fix UI hint to read from `cashback_cycles`

Locate the UI component(s) showing:

* Budget Left
* Max
* Cycle range
* Min spend progress

Update rules:

* Prefer `cashback_cycles` totals for:

  * `max_budget`
  * `real_awarded`
  * `virtual_profit`
  * `is_exhausted`
* Compute budget_left using the formula above.

### C4. Fix cashback config parsing aliases

Update `parseCashbackConfig` (or equivalent) to support legacy keys:

* max budget: `max_amt` OR `maxAmount` OR `maxAmount` nested
* min spend: `min_spend` OR `minSpend`
* cycle: `cycle` OR `cycleType`
* statement day: `statement_day` OR `statementDay`

The Vpbank Lady sample uses:

```
{"rate": 0.15, "cycle": "statement_cycle", "max_amt": 1000000.0, "min_spend": 0.0, "statement_day": 20}
```

### C5. Add a lightweight admin/debug recompute (optional but recommended)

* Provide a safe endpoint or script to recompute all cycles for a given account_id + cycle_tag.
* Use it for QA and to fix old data.

---

## D) Verification Checklist (Agent must provide evidence)

### Tables that must be correct

For any cashback-enabled credit card and a given cycle_tag:

1. `transactions`

* Has correct `cashback_mode`
* Has correct `cashback_share_fixed` / `cashback_share_percent`

2. `cashback_entries`

* Has exactly one row for that transaction (for real/virtual/voluntary as applicable)
* Correct:

  * `mode`
  * `amount`
  * `counts_to_budget`
  * `cycle_id` matches account + cycle_tag

3. `cashback_cycles`

* Has row for (account_id, cycle_tag)
* Fields:

  * `max_budget` matches parsed config
  * `real_awarded` == sum of real counted (clamped)
  * `virtual_profit` clamped
  * `overflow_loss` reflects overflow

4. (Legacy) `cashback_profits`

* Not required for correctness going forward.
* Keep it intact; do not rely on it for hint.

### Must-have QA proof

* SQL screenshots or logs showing:

  * budget_left calculation
  * entries exist
  * cycles updated

---

## E) Test Cases (must run)

### Test Case 1 — Real Fixed Budget Left (Lady sample)

Setup:

* Account: `Vpbank Lady` config: rate=0.15, max_amt=1,000,000, statement_day=20
* Create txn:

  * `cashback_mode='real_fixed'`
  * `cashback_share_fixed=100000`
    Expected:
* `cashback_entries` has row for txn with mode='real', amount=100000
* `cashback_cycles` for DEC25:

  * max_budget=1,000,000
  * real_awarded=100,000
  * virtual_profit=0
* UI shows Budget Left = 900,000

### Test Case 2 — Edit Transaction changes cashback amount

* Edit the same txn: change cashback_fixed from 100,000 -> 150,000
  Expected:
* No duplicate entries
* cycle real_awarded updates to 150,000
* Budget Left updates to 850,000

### Test Case 3 — Percent Cashback

* Create txn percent: cashback_share_percent=0.08 (8%)
  Expected:
* UI shows 8 (not 800)
* entries amount computed correctly by engine (if engine uses percent)
* sheet export sends 8

### Test Case 4 — Account/cycle change edit

* Edit txn and change occurred_at or tag so cycle_tag changes
  Expected:
* old cycle recomputed (deduct)
* new cycle recomputed (add)

### Test Case 5 — Transfer/Lending should not break

* Ensure non-cashback txns do not create entries

---

## Acceptance Criteria

* Budget Left hint always correct for cashback-enabled cards
* Lady sample: shows 900,000 after 100,000 real_fixed
* Entries/cycles are created/updated on add/edit/delete
* UI uses cycle totals, not raw config fallback when cycle exists

---

## Branch / Commit / PR

* Branch: `PHASE-9.2.2-CASHBACK-HINT-AND-CYCLE-SYNC`
* Commit: `PHASE 9.2.2 - Fix cashback hint and ensure cycle/entry sync`
* PR title: `MF5.2.2: Fix cashback budget-left hint + ensure entries/cycles updated`

---

## What to include in PR description

* Before/after screenshot of cashback hint for Lady card
* SQL snippet showing cycle values before/after recompute
* Checklist completion results
