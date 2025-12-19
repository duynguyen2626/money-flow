---
description: Task Descriptions
---

# MF5.3.1 — Checkpoint & Task Prompt (Attribution Metadata + QA Hardening)

> This canvas continues after MF5.3 was implemented.
> Goal: make MF5.3 **auditable in DB** by ensuring `cashback_entries.metadata` is reliably populated and never silently NULL.
> **Do NOT redesign the system. Do NOT change MF5.2 cycle/entry engine. Do NOT add new tables.**

---

## 1) Current Checkpoint (Observed Issue)

### ✅ MF5.3 Implemented

* Category-based rules + spend-based levels
* `resolveCashbackPolicy()` decides rate/cap and returns metadata
* UI shows match hints and dynamic rate suggestions

### ❗ Problem to fix (blocking)

* SQL proof shows `cashback_entries.metadata` is **NULL** for recent rows.

Expected: metadata contains applied policy context.

---

## 2) MF5.3.1 Objective (Single Sentence)

> Ensure every cashback-affecting transaction results in exactly one `cashback_entries` row whose `metadata` is populated with policy attribution (level/rule/rate/cap), and provide DB + UI proof.

---

## 3) Scope Boundaries

### ✅ IN SCOPE

* Fix persistence path so `cashback_entries.metadata` is always written on create/update
* Backfill existing `cashback_entries.metadata` for recent/active cycles
* Add safe guardrails to prevent future NULL metadata (minimal)
* Provide QA queries + reproducible steps

### ❌ OUT OF SCOPE

* No new tables
* No new reporting/dashboard
* No refactor of recompute engine
* No UI redesign (only fix hints if they are reading wrong field)

---

## 4) Non‑Negotiable Rules

* `resolveCashbackPolicy()` remains the **only** decision point for rate/cap
* UI must not recompute budgets; budget-left comes from `cashback_cycles`
* `cashback_entries` must remain 1 row per (account_id, transaction_id)
* Metadata must enable auditing by DB inspection

---

## 5) Required Metadata Shape (Minimum)

Persist at least these keys:

```json
{
  "policySource": "program_default" | "level_default" | "category_rule" | "legacy",
  "levelId": "..." | null,
  "categoryId": "..." | null,
  "rate": 0.075,
  "ruleMaxReward": 100000
}
```

Notes:

* `ruleMaxReward` can be null.
* Store decimal rate (0.075), not percent.

---

## 6) Implementation Tasks (Agent Must Do)

### 6.1 Fix write path (root cause)

* Audit `upsertTransactionCashback()`:

  * Confirm resolver metadata is being passed into the insert/upsert payload
  * Confirm update path also writes metadata (not only insert)
  * Ensure metadata is not dropped by type mismatch or undefined filtering

### 6.2 Add guardrail (minimal, safe)

* Migration (safe):

  * Set default `cashback_entries.metadata` = `'{}'::jsonb`
  * Optional: make `metadata` NOT NULL if no conflicts

### 6.3 Backfill existing rows

* For last N days (or active cycles):

  * For each `cashback_entries` row with NULL/empty metadata:

    * Load txn + account + cycle
    * Re-run `resolveCashbackPolicy()` and update metadata

Keep backfill small and targeted (avoid heavy scan).

---

## 7) Verification Checklist (Must Pass)

### 7.1 SQL Proof

Run:

```sql
SELECT t.amount, t.category_id, ce.amount AS cashback, ce.metadata
FROM transactions t
JOIN cashback_entries ce ON t.id = ce.transaction_id
ORDER BY t.created_at DESC
LIMIT 20;
```

Expected:

* `ce.metadata` is **NOT NULL**
* `policySource`, `rate`, `ruleMaxReward` present

### 7.2 Level Switch Proof

* Create txns to push cycle spent across threshold
* Verify the next txn picks the higher level
* Metadata must show the levelId and new rate

### 7.3 UI Proof

* In transaction modal, changing category updates:

  * applied rate
  * rule max reward
  * suggested cashback
  * match explanation

Budget-left must still come from `cashback_cycles`.

---

## 8) Branch / PR

* Branch: `PHASE-9.3.1-CASHBACK-METADATA-QA`
* Commit: `MF5.3.1 - Ensure cashback_entries metadata + backfill`
* PR Title: `MF5.3.1: Ensure cashback attribution metadata + QA hardening`

PR must include:

* Screenshot: transaction modal category switching
* SQL: transactions + cashback_entries (metadata) + cashback_cycles
* A short note: root cause + fix

---

## 9) Stop Condition

Stop after PR opened and provide:

* QA steps
* SQL snippets (before/after)
* Backfill scope statement (what rows were updated)
