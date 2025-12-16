---
description: Task Descriptions
---

# MF5.2 — Cashback Engine (Virtual Profit + Voluntary Overflow)

You are the coding agent working on **Money Flow 3**.
This task is **Phase MF5.2**.

MF5.1 created and backfilled:

* `cashback_cycles`
* `cashback_entries`
* `transactions.cashback_mode`

Now we implement the **runtime engine** that keeps these tables correct when transactions are created/edited.

---

## Goal

Implement cashback accounting rules for:

1. **Virtual profit** from “None back / I keep 100%” flows (especially Lend)
2. **Voluntary / overflow** cashback when cycle budget is exhausted
3. Deterministic cycle recomputation after any relevant change

This phase must make the system consistent for the 3 cases:

* Case 1: Lend + None back → create virtual profit entry
* Case 2: Budget remaining < requested real cashback → keep real as-is, record overflow loss, clamp virtual
* Case 3: Real cashback (percent/fixed) as before

---

## Scope

### IN SCOPE (MF5.2)

* Create/update `cashback_entries` when saving a transaction
* Maintain `cashback_cycles` totals by calling recompute
* Implement mode semantics:

  * `none_back` → virtual profit
  * `real_fixed` / `real_percent` → real awarded
  * `voluntary` → overflow/loss
* Add minimal columns if required to support the model cleanly

### OUT OF SCOPE (MF5.2)

* Major /cashback UI redesign (that is MF5.3)
* New analytics dashboards

---

## Required Data Rules

### Definitions

* **Real awarded**: cashback user actually gives/sets on a txn. Counts to budget up to remaining cap.
* **Virtual profit**: predicted cashback you “keep” when you choose None-back (no sharing). Must be clamped by remaining budget after real.
* **Overflow/Voluntary**: cashback beyond cap or explicitly voluntary when cap exhausted. Does NOT count to budget.

### Budget semantics

* Budget cap is `cashback_cycles.max_budget`.
* Real counts to budget until cap.
* Virtual counts to budget only if cap remains after real.
* Overflow/loss never counts to budget.

---

## A) Transaction integration: create/update entries

Find the transaction create/edit code path (server action / API route / service).
When a transaction is saved, do:

1. Identify:

* account_id
* cycle_tag (use existing cycle tagging logic)
* txn type (expense/income/transfer/lending/repay)

2. Ensure cycle exists:

* upsert `cashback_cycles` for (account_id, cycle_tag)

3. Determine cashback_mode for this txn:

### Mode 1 — none_back (virtual profit)

When txn is Lend (or other allowed types) and user selects “None back / I keep 100%”:

* Set `transactions.cashback_mode = 'none_back'`
* Create/Upsert a `cashback_entries` row:

  * mode='virtual'
  * amount = predicted_profit
  * counts_to_budget=true (but will be clamped at cycle level)
  * note='none_back virtual profit'

**Predicted profit calculation** (initial):

* Use account policy rate from `accounts.cashback_config.rate`
* predicted_profit = abs(txn_amount) * rate
* If policy has max per txn (optional), apply it

### Mode 2 — real cashback (fixed / percent)

When user inputs cashback (fixed or percent):

* Set `transactions.cashback_mode` accordingly
* Create/Upsert entry:

  * mode='real'
  * amount = real_cashback_amount (positive)
  * counts_to_budget=true initially

### Mode 3 — voluntary / overflow

When cycle is exhausted OR account has no cashback and user toggles Voluntary Cashback:

* Set `transactions.cashback_mode = 'voluntary'` (or keep separate if existing UI uses other fields)
* Create/Upsert entry:

  * mode='voluntary'
  * amount = user_input_amount
  * counts_to_budget=false

4. If editing a txn:

* Update the existing entry for that txn (same cycle) OR delete + recreate deterministically.
* Ensure idempotency: one txn should not produce duplicate entries.

---

## B) Cycle recomputation (must clamp virtual and overflow correctly)

After entry changes, call a single recompute routine:

### Recompute algorithm (deterministic)

Given cycle:

* real_total = sum(real entries where counts_to_budget=true)
* voluntary_total = sum(voluntary entries) + sum(entries where counts_to_budget=false)
* virtual_total_raw = sum(virtual entries)

Let cap = max_budget
Let cap_after_real = max(0, cap - real_total)

virtual_total_effective = min(virtual_total_raw, cap_after_real)
virtual_overflow = max(0, virtual_total_raw - virtual_total_effective)

Set cycle fields:

* real_awarded = real_total
* virtual_profit = virtual_total_effective
* overflow_loss = voluntary_total + virtual_overflow + real_overflow (see below)
* is_exhausted = (real_total >= cap) OR (real_total + virtual_total_effective >= cap)

### Real overflow handling (Case 2)

If a single real entry pushes beyond cap, we must preserve the real entry amount but mark the overflow portion as loss.
Implement this by:

* Keeping entry amount unchanged
* At recompute time:

  * real_counts = min(real_total, cap)
  * real_overflow = max(0, real_total - cap)
  * cycle.real_awarded should remain as **real_counts** (counts to budget)
  * Add real_overflow to overflow_loss

Important: Do NOT mutate historical real entry amounts.

---

## C) Minimal schema changes (only if needed)

If you need clearer accounting without heavy logic, you may add:

* `cashback_entries.counted_amount` numeric nullable (optional)

  * store the portion that actually counts to budget
  * but this is optional; recompute-only approach is acceptable

Do not add new tables in MF5.2 unless absolutely necessary.

---

## D) UI touchpoints (minimal)

Only minimal UI updates if required to:

* Set `cashback_mode` for “None back” selection
* Allow Voluntary Cashback when cycle exhausted / no cashback

Do NOT redesign /cashback pages in MF5.2.

---

## Acceptance Criteria

* Creating a Lend transaction with None-back creates a virtual entry and updates cycle totals.
* Creating a real cashback txn updates real totals and clamps virtual.
* If real cashback exceeds remaining budget, cycle shows exhausted and overflow_loss increases (real amount preserved).
* Voluntary cashback creates voluntary entries that do not affect real/virtual budget.
* Recompute is deterministic and idempotent (rerun yields same totals).

---

## Branch / Commit / PR

* Branch: `PHASE-9.2-CASHBACK-ENGINE-VIRTUAL-VOLUNTARY`
* Commit: `PHASE 9.2 - Implement cashback engine (virtual profit + voluntary overflow)`
* PR title: `MF5.2: Cashback engine for none-back virtual profit + voluntary overflow`

---

## QA Checklist

* [ ] Create Lend none-back → cycle virtual_profit increases (clamped)
* [ ] Add real cashback txn → cycle real_awarded increases; virtual clamps if needed
* [ ] Force over-cap real cashback → overflow_loss increases; real_awarded counted to cap
* [ ] Toggle voluntary when exhausted → voluntary entry created; does not change budget
* [ ] Edit txn updates entry without duplicates
