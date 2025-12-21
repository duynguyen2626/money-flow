# MF5.4.1 — Cashback Page QA + Polish + Consistency

You are the coding agent working on **Money Flow 3**.
MF5.4 (cashback page revived) is merged/ready for QA.
This phase MF5.4.1 focuses on **correctness, consistency, and UX polish** without changing core architecture.

---

## 0) Non-negotiable invariants

* `cashback_cycles` is the single source of truth for cycle totals and budget hints.
* `cashback_entries` is the ledger; exactly one row per (account_id, transaction_id).
* `cashback_entries.metadata` must exist and be valid JSON for every row.
* UI must not recompute budgets from raw config when cycle exists.

---

## 1) Goals

1. **Cashback page correctness**

* Totals displayed must match `cashback_cycles` fields.
* Table rows must be consistent with `cashback_entries` + transactions.

2. **Consistency of percent/rate display**

* Always show rates as % in UI.
* Do not show NaN; handle undefined rate safely.

3. **Policy explanation UX**

* Policy explanation should be readable, stable, and match metadata.
* In transaction modal edit mode, persisted metadata must show correctly.

4. **Performance and stability**

* Avoid N+1 server calls in cashback table.
* Ensure no runtime console errors.

---

## 2) Required work items

### 2.1 Validate totals mapping (cycle → UI)

On `/cashback/[id]` page, verify each number comes from the intended cycle field:

* Remaining cap: `remainingBudget` derived from `cashback_cycles.max_budget - real_awarded - virtual_profit`
* Net profit: consistent definition across UI and backend

If any total is computed ad-hoc in UI, refactor to use cycle values.

### 2.2 Ensure metadata backfill is safe and idempotent

* If you added scripts/routes to backfill `cashback_entries.metadata`, ensure:

  * running twice produces same result
  * no duplicate entries
  * no breaking changes when metadata already exists

### 2.3 Fix any NaN or missing-rate rendering

Search for patterns that can produce NaN:

* `value={rule.rate * 100}`
* `Number(undefined)`

Replace with safe defaults:

* `(rule.rate ?? 0) * 100`
* render `--` when not known

### 2.4 Policy explanation rendering rules

* Prefer showing a short label:

  * e.g. `Education 10% (max 300k)`
* If levels exist:

  * show level name and threshold: `Level 2 (>= 15M)`
* If fallback default:

  * show `Default 0.5%` or `Default 0.3%`

Ensure it uses:

* persisted metadata when editing existing txn
* live computed policy when creating new txn

### 2.5 Avoid N+1 requests

If the cashback transaction table needs policy explanations:

* Do NOT fetch per-row from `/api/cashback/policy-explanation`.
* Include necessary metadata in the page payload once (server-side) OR batch fetch.

### 2.6 Add minimal automated checks (optional but recommended)

Add small unit tests for:

* `parseCashbackConfig` alias parsing
* `resolveCashbackPolicy` level/rule selection

---

## 3) Acceptance criteria

* Cashback page numbers match DB `cashback_cycles` for the displayed cycle.
* No console errors (NaN, uncontrolled input warnings).
* Policy explanation displays correctly for:

  * default policy
  * category rule policy
  * level-based policy
* No N+1 network waterfall when rendering the table.

---

## 4) Branch / Commit / PR

* **Branch:** `PHASE-9.4.1-CASHBACK-PAGE-QA-POLISH`
* **Commit:** `MF5.4.1 - Cashback page QA, polish, and metadata consistency`
* **PR title:** `MF5.4.1: Cashback page QA + polish + metadata consistency`

---

## 5) What to include in PR description

* Screenshot of `/cashback/[id]` totals and the SQL query used to verify.
* One example txn row showing metadata and the displayed explanation.
* Confirmation: no console errors.
* Confirmation: no N+1 requests.
