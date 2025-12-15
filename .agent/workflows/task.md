---
description: Task Descriptions 
---

# MF5.1 — Cashback Reboot (New Tables + Backfill)

You are the coding agent working on **Money Flow 3**.
This task is **Phase MF5.1**.

Goal: introduce a robust, auditable cashback model with **cycle summaries** + **ledger entries**, and backfill from existing data.

This phase is **DB + minimal plumbing only**. Do NOT redesign UI screens yet (that comes in MF5.2+).

---

## Why we are doing this

Current cashback is computed ad-hoc and is not reliably persisted per cycle. We need:

* A single source of truth for cycle budget remaining / exhausted
* Auditable entries per transaction
* Separation of:

  * Real awarded cashback (counts toward budget)
  * Virtual/predict profit (e.g. “None back / I keep 100%” for Lend)
  * Voluntary/overflow loss (allowed even when budget exhausted)

---

## Phase Scope

### IN SCOPE (MF5.1)

1. Create new tables:

   * `cashback_cycles` (cycle summary)
   * `cashback_entries` (ledger)
2. Backfill cycles + entries from existing data:

   * existing `transactions`
   * existing `cashback_profits`
3. Add minimal new fields needed to remove ambiguity:

   * `transactions.cashback_mode` (enum/text)
4. Implement a deterministic recompute routine (SQL function or server-side utility) that can rebuild cycle summaries from entries.

### OUT OF SCOPE (MF5.1)

* Rewriting /cashback UI
* Reworking transaction modal UI (already done in MF4)
* Full business logic for virtual profit creation (that’s MF5.2)

---

## Data Model (Required)

### Table 1 — `cashback_cycles`

One row per (account_id, cycle).

Required columns:

* `id` uuid pk
* `account_id` uuid fk -> accounts.id
* `cycle_tag` text (e.g. DEC25) OR (`cycle_start` date, `cycle_end` date). Prefer `cycle_tag` if project already uses tags.
* `max_budget` numeric (from accounts.cashback_config.maxAmount)
* `min_spend_target` numeric nullable (from accounts.cashback_config.minSpend)
* `spent_amount` numeric default 0
* `real_awarded` numeric default 0  (counts toward budget)
* `virtual_profit` numeric default 0 (clamped by remaining budget)
* `overflow_loss` numeric default 0 (budget overflow + voluntary)
* `is_exhausted` boolean default false
* `met_min_spend` boolean default false
* timestamps

Indexes:

* unique(account_id, cycle_tag)

### Table 2 — `cashback_entries`

One row per cashback-related event tied to a transaction.

Required columns:

* `id` uuid pk
* `cycle_id` uuid fk -> cashback_cycles.id
* `account_id` uuid fk -> accounts.id
* `transaction_id` uuid fk -> transactions.id
* `mode` text (enum-like): `real` | `virtual` | `voluntary`
* `amount` numeric (positive value)
* `counts_to_budget` boolean
* `note` text nullable
* timestamps

Indexes:

* index(account_id, transaction_id)
* index(cycle_id)

### Add to `transactions`

Add:

* `cashback_mode` text nullable

  * expected values: `none_back` | `real_fixed` | `real_percent` | `shared` | `voluntary`

Purpose:

* Removes ambiguity between “no cashback configured” vs “none-back keep profit” vs “real cashback given”.

---

## Backfill Plan (Must implement)

### Step 1 — Create cycles

* For each credit card account that appears in existing cashback data, create cycles based on:

  * `transactions.persisted_cycle_tag` (if present)
  * else `transactions.tag` when it stores cycle tags (e.g. DEC25)
* Each (account_id, cycle_tag) => one `cashback_cycles` row.
* Populate `max_budget` and `min_spend_target` from `accounts.cashback_config`.

### Step 2 — Backfill entries

* Migrate existing `cashback_profits` into `cashback_entries`:

  * default `mode='real'`
  * `counts_to_budget=true`
  * Link to correct `cycle_id` using the transaction’s cycle tag.

* Also create entries from existing transaction cashback fields if present:

  * if `transactions.cashback_share_fixed` is not null => entry `mode='real'`, amount=fixed, counts_to_budget=true
  * if percent-based fields exist in your schema => create entry similarly

### Step 3 — Backfill `transactions.cashback_mode`

Rules:

* If a transaction has an associated real cashback entry => set `cashback_mode` to `real_fixed` or `real_percent` depending on source.
* Else leave null for now (MF5.2 will set `none_back` / `voluntary` modes going forward).

### Step 4 — Recompute cycle summaries (deterministic)

Implement a recompute routine that derives `cashback_cycles` totals from `cashback_entries`:

* `real_awarded = sum(amount) where mode='real' AND counts_to_budget=true`
* `overflow_loss = sum(amount) where mode='voluntary' OR counts_to_budget=false`
* `virtual_profit` = sum(virtual) clamped to remaining budget after real_awarded
* `is_exhausted = (real_awarded >= max_budget)`
* `met_min_spend` computed from `spent_amount >= min_spend_target` when min_spend_target is not null

Important: in MF5.1 you may keep `spent_amount` = 0 if computing spend requires more rules; but provide the recompute hook/shape.

---

## Compatibility & Safety

* Do NOT delete `cashback_profits` in MF5.1.
* Keep all existing screens working.
* New tables must not break existing queries.

---

## Deliverables

1. SQL migration(s) to create tables + new column
2. Backfill script (SQL or server-side) that can be rerun safely (idempotent)
3. Minimal helper/service to recompute cycles from entries
4. README note in PR description explaining:

   * new tables
   * backfill strategy
   * how to validate

---

## Validation Checklist

* [ ] After migration, `cashback_cycles` rows exist for accounts with cashback activity
* [ ] `cashback_entries` count matches prior `cashback_profits` rows (plus any derived from tx fields)
* [ ] Recompute produces stable totals on repeated runs
* [ ] Existing app pages still load

---

## Branch / Commit / PR

* Branch: `PHASE-9.1-CASHBACK-CYCLES-ENTRIES-BACKFILL`
* Commit: `PHASE 9.1 - Add cashback cycles/entries tables and backfill`
* PR title: `MF5.1: Introduce cashback_cycles + cashback_entries with backfill`

---