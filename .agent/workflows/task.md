---
description: Task Descriptions
---

# MF5.2.1 — Fix Cashback Percent Handling + Ensure Entries/Cycles + Sheet Export Format

You are the coding agent working on **Money Flow 3**.
This task is **Phase MF5.2.1 (revised)**.

There is a critical bug:

* `cashback_share_percent` is stored in DB as a decimal (e.g. `0.05` for 5%).
* The UI Edit modal shows `500%` instead of `5%` due to double conversion.
* Export API to Google Sheet is returning `0.05` instead of `5` (sheet expects raw percent number).
* Some transactions (add/edit) are not creating/updating the required rows in `cashback_entries` and not recomputing `cashback_cycles`.

This task must fix all of the above.

---

## Goals

1. **Percent correctness end-to-end**

* DB remains decimal: `0.05` = 5%
* UI input/display uses percent number: `5` = 5%
* There must be exactly ONE conversion layer:

  * Load: decimal -> percent
  * Save: percent -> decimal
* No other component should multiply/divide by 100.

2. **Data integrity for add/edit transactions**

* On Create Transaction: ensure `cashback_entries` is upserted and the matching `cashback_cycles` is recomputed.
* On Edit Transaction: update the existing entry (no duplicates) and recompute cycle.
* On Delete Transaction: remove entry and recompute cycle.

3. **Sheet export format**

* The API that exports/sends transactions to Sheet must send percent as **raw percent number** (e.g. 5, 8, 10), NOT decimal.

---

## A) Percent Fix: Single source of conversion

### Required conventions

* DB: `transactions.cashback_share_percent` is decimal fraction, range [0..1]. Example: `0.08`.
* UI: percent input is raw number, range [0..100]. Example: `8`.

### Implementation requirements

1. Locate all conversions around cashback percent.

   * Search for `* 100`, `/ 100` around cashback fields.
2. Choose ONE place to convert:

   * The transaction form model adapter (default values -> form)
   * And the submit mapper (form -> payload)
3. Remove all other conversions.

### Acceptance tests

* If DB is `0.05`, Edit modal shows `5` (not 500)
* If user enters `8`, DB stores `0.08`

---

## B) Ensure add/edit always updates cashback tables

### Required behavior

* Every transaction create/edit/delete must keep these in sync:

  * `transactions` (cashback_mode + percent/fixed fields)
  * `cashback_entries` (one row per txn that affects cashback)
  * `cashback_cycles` (recomputed after changes)

### Must implement

1. Identify the central transaction service/API routes for:

   * create
   * update
   * delete
2. Ensure they call the cashback engine consistently:

   * `upsertTransactionCashback(txn)` on create/update
   * `deleteTransactionCashback(txnId)` on delete
   * recompute cycle after each
3. Ensure idempotency:

   * There must not be duplicate entries for the same transaction.
   * Use a unique constraint or enforce upsert logic by `(account_id, transaction_id)`.

### Critical edge cases

* When editing a transaction changes:

  * account_id
  * cycle_tag
  * cashback_mode
    Then the engine must:
* remove/update old entry
* create/update new entry
* recompute both involved cycles

---

## C) Sheet export must not divide by 100

### Required behavior

* When exporting/sending transaction data to Sheet:

  * send `% cashback` as raw percent number
  * Example:

    * DB: 0.05
    * Sheet export: 5

### Must implement

1. Locate the Sheet export sender.
2. Identify how cashback percent is written.
3. Convert decimal -> percent number before sending.
4. Confirm no other layer converts again.

---

## D) Database constraints (recommended)

To prevent future silent bugs, add constraints:

* CHECK `cashback_share_percent >= 0 AND cashback_share_percent <= 1`
* CHECK `cashback_share_fixed >= 0`

Optionally add unique index:

* `cashback_entries (account_id, transaction_id)` unique

---

## Deliverables

* Fix percent conversion in UI and payload mapping.
* Ensure transaction CRUD always maintains cashback_entries/cashback_cycles.
* Fix sheet export percent output.
* Add DB constraints / unique index if safe.
* Add a small QA note in PR description with:

  * sample txn create/edit
  * expected DB values
  * expected UI values
  * expected sheet payload

---

## Acceptance Criteria

* Edit modal never shows 500% for 5%.
* Creating a txn with cashback creates/updates:

  * transactions fields
  * cashback_entries row
  * cashback_cycles recomputed
* Editing a txn updates entry (no duplicates) and recomputes cycles.
* Sheet export shows percent as 5/8/10, not 0.05/0.08/0.1

---

## Branch / Commit / PR

* Branch: `PHASE-9.2.1-CASHBACK-PERCENT-ENTRIES-SHEET`
* Commit: `PHASE 9.2.1 - Fix cashback percent, ensure entries/cycles, and sheet export`
* PR title: `MF5.2.1: Fix percent display + ensure cashback tables + correct sheet export`

---

## Update Agent Context / Rules / Commit Workflow

### `.agent/workflows/gemini.md`

Add:

* DB stores cashback percent as decimal [0..1]
* UI shows percent as [0..100]
* Export to sheet uses [0..100]
* Cashback tables must always be updated on txn CRUD

### `.agent/rules/gravityrules.md`

Add:

* Never apply percent conversion in more than one layer.
* Always keep cashback_entries/cycles consistent with transactions.

### `.agent/workflows/commit_and_push.md`

Update to dynamic placeholders:

* BRANCH_NAME from env/prompt
* COMMIT_MSG from task
