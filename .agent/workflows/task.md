---
description: Task Descriptions
---

# MF5.4 — Checkpoint & Task Prompt (Cashback Reporting from Cycles + Metadata)

> This canvas starts after MF5.3 → MF5.3.3a is green (correctness + explainability + consistency).
> MF5.4 goal: **reporting/visibility** using existing tables and metadata.
> **Do NOT split cashback_config into new tables in MF5.4.** DB normalization is MF5.5.

---

## 1) Current Checkpoint (Locked)

### ✅ Engine & Consistency

* `transactions` + `cashback_entries` + `cashback_cycles` are stable
* `cashback_cycles` is the single source of truth for budgets/spent
* `cashback_entries.metadata` is mandatory and explains policy attribution
* UI shows policy explanation in txn modal
* Cross-login inconsistencies are eliminated

---

## 2) MF5.4 Objective# MF5.4 — Checkpoint & Task Prompt (Revive Existing Cashback Page, No New Route)

> This canvas starts after MF5.3 → MF5.3.3a is green.
> MF5.4 goal: **bring back the existing Cashback page and wire it to cycles + entries + metadata**.
> **Do NOT create a new /cashback route or a brand-new page. Use what already exists in the repo.**
> Later (future phase), Cashback will be integrated into `accounts/:id` as a second tab.

---

## 1) Current Checkpoint (Locked)

### ✅ Engine & Consistency

* `transactions` + `cashback_entries` + `cashback_cycles` stable
* `cashback_cycles` is single source of truth for budget/spent
* `cashback_entries.metadata` is mandatory and explains policy attribution
* Transaction modal shows policy explanation
* Cross-login inconsistencies are eliminated

---

## 2) MF5.4 Objective (Single Sentence)

> Make the existing Cashback page visible and accurate by reading totals from `cashback_cycles` and explanations from `cashback_entries.metadata`.

---

## 3) Scope Boundaries (ANTI-DRIFT)

### ✅ IN SCOPE

* Re-enable / expose the existing Cashback page in navigation

* Fix routing/guards/feature flags so the page reliably renders

* Wire the page data to:

  * `cashback_cycles` (totals, budget-left, spent, real_awarded, virtual_profit, overflow_loss)
  * `cashback_entries` + `transactions` (breakdown + drilldown)
  * `cashback_entries.metadata` (grouping + explanation)

* Provide **lightweight** UI sections:

  * Current cycle summary
  * Breakdown by category
  * Breakdown by policySource
  * Drilldown transaction list

### ❌ OUT OF SCOPE

* No new pages/routes (no new `/cashback`)
* No integration into `accounts/:id` tabs (postponed)
* No new DB tables
* No cashback engine changes
* No redesign of transaction modal
* No historical analytics beyond selected cycle

---

## 4) Data Rules (Strict)

* Budget-related values MUST come from `cashback_cycles`.
* Any “why” explanation MUST come from `cashback_entries.metadata`.
* Percent formatting remains unchanged:

  * DB decimal (0.08)
  * UI percent (8)

---

## 5) UX Deliverables (Minimal but Useful)

### 5.1 Page Entry

* Cashback page is reachable from sidebar/nav
* The page loads without blank states or 404

### 5.2 Cycle Summary (Header Card)

Show:

* Current cycle tag + date range
* Budget Left (derived from cycle totals; do not compute from config)
* Spent Amount
* Real Awarded
* Virtual Profit
* Exhausted status

### 5.3 Breakdown

* By Category:

  * sum spending (abs)
  * sum cashback
* By Policy Source:

  * category_rule / level_default / program_default / legacy

### 5.4 Drilldown

* Clicking a category or policy bucket filters a transaction list
* Each txn row can show applied rate from metadata (read-only)

---

## 6) Query / Reconciliation Rules

* Totals must reconcile:

  * Page totals == `cashback_cycles` for selected account+cycle

* Breakdown must reconcile:

  * Sum of cashback in breakdown equals sum of `cashback_entries.amount` for that cycle (respect `counts_to_budget` if that is the rule used by totals)

---

## 7) Test & Verification Checklist (MF5.4)

### 7.1 Smoke

* Page is visible in nav
* Page loads for at least one credit-card account
* No console errors

### 7.2 Consistency

* Cycle summary values match `cashback_cycles` exactly

### 7.3 Breakdown Reconciliation

* Category breakdown sums reconcile with cycle totals
* PolicySource breakdown sums reconcile with cycle totals

### 7.4 Drilldown

* Clicking a bucket filters the same underlying txns
* Applied rate shown is `metadata.rate` (formatted), not recomputed

---

## 8) Branch / PR

* Branch: `PHASE-9.4-CASHBACK-PAGE-REVIVE`
* Commit: `MF5.4 - Revive existing cashback page (cycles + metadata)`
* PR Title: `MF5.4: Revive existing cashback page (cycles + metadata)`

PR must include:

* Screenshots (page header + breakdown + drilldown)
* SQL snippets proving totals reconciliation
* QA checklist run

---

## 9) Stop Condition

Stop after PR opened and provide:

* QA steps
* SQL reconciliation snippets
* Screenshots

---

## 10) Roadmap Note (Postponed)

* Future phase: integrate Cashback into `accounts/:id` as a second tab (Transactions | Cashback)
* MF5.5: DB normalization/splitting config into tables/columns


> Provide a clear cashback reporting UI that helps users understand **where cashback came from** and **how much budget is left**, without changing core calculations.

---

## 3) Scope Boundaries (ANTI-DRIFT)

### ✅ IN SCOPE

* New reporting UI pages/sections (lightweight):

  * Cycle summary per credit card
  * Breakdown by category and by policySource/level
  * Drill-down list of transactions contributing to a cycle

* Queries are derived from:

  * `cashback_cycles` totals (budget_left, spent_amount, real_awarded, virtual_profit, overflow_loss)
  * `cashback_entries` + `transactions` for breakdown
  * `cashback_entries.metadata` for explanation grouping

* Optional: small helper view/query (no new tables) if it simplifies joins

### ❌ OUT OF SCOPE

* ❌ No new DB tables
* ❌ No splitting `cashback_config` into columns/tables
* ❌ No refactor of cashback engine
* ❌ No UI redesign of transaction modal
* ❌ No analytics beyond cycle scope

---

## 4) Reporting UX Deliverables

### 4.1 Cashback Dashboard (Per Card)

For each credit card account:

* Current cycle tag + date range
* Budget Left (from cycle)
* Real Awarded, Virtual Profit, Spent Amount
* Exhausted status

### 4.2 Cycle Breakdown

Within a selected cycle:

* Breakdown by **category** (sum of spending, sum of cashback)
* Breakdown by **policySource** (category_rule / level_default / program_default / legacy)
* Top contributing transactions list (with applied rate shown from metadata)

### 4.3 Drill-down

* Click a category/policySource bucket → show filtered transactions

---

## 5) Data Rules (Strict)

* Budget-related values MUST come from `cashback_cycles`.
* Any “why” explanation MUST come from `cashback_entries.metadata`.
* Percent formatting rules remain unchanged (DB decimal, UI percent).

---

## 6) Verification Checklist

* Cycle totals match `cashback_cycles` exactly
* Breakdown sums reconcile:

  * sum(entries.amount where counts_to_budget) == cycle.real_awarded (or matches according to mode rules)
* Clicking buckets filters transaction list correctly
* No NaN / percent regressions

---

## 7) Branch / PR

* Branch: `PHASE-9.4-CASHBACK-REPORTING`
* Commit: `MF5.4 - Cashback reporting from cycles + metadata`
* PR Title: `MF5.4: Cashback reporting (cycles + metadata)`

PR must include:

* Screenshots of dashboard + cycle breakdown
* SQL snippets proving totals and reconciliation

---

## 8) Stop Condition

Stop after PR opened and provide:

* QA steps
* Reconciliation SQL
* Screenshots

---

## 9) Roadmap Note

* MF5.5 is where we normalize metadata/rules into tables and/or split config columns.
* MF5.4 must stay thin and focus on visibility.