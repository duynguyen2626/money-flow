---
description: Task.md
---

# PHASE 7.2 — Cashback Policy Resolution by Category Rules

## Goal

Implement deterministic cashback policy resolution per transaction using **Levels + Category Rules**, built on top of Phase 7.1 normalization & versioning.

This phase makes cashback **rule-driven, traceable, and explainable**.

---

## Non-goals (Explicit)

* No UI redesign beyond necessary labels/columns
* No refactor of transaction schema
* No new cashback tables

---

## Core Concepts

### 1. Policy Resolution Order (Deterministic)

For each transaction:

1. Select **active Level** by `min_total_spend`
2. If transaction has category:

   * Try to match **Category Rule** in active Level
3. If no category rule matched:

   * Use **Level default rate**
4. If no level default rate:

   * Fallback to account base cashback rate

---

## Data Flow

### Inputs

* account.cashback_config (normalized)
* account.cashback_config_version
* transaction.category_id
* transaction.amount
* cycle context

### Outputs

Persist into `cashback_entries.metadata`:

```json
{
  "policy": {
    "level": "LEVEL 1",
    "ruleType": "category" | "default" | "fallback",
    "categoryId": "uuid | null",
    "rate": 0.1,
    "maxReward": 300000
  }
}
```

---

## Backend Tasks

### A. Policy Resolver

Create a pure function:

```
resolveCashbackPolicy({
  account,
  transaction,
  cycle
}) => CashbackPolicy
```

* Must be deterministic
* Must not query DB internally
* Accept normalized config only

---

### B. Entry Creation Logic

On transaction create/edit:

* Resolve policy
* Compute cashback amount
* Insert into `cashback_entries`
* Respect budget exhaustion rules

---

### C. Cycle Aggregation

Update:

* real_awarded
* virtual_profit
* overflow_loss

Strictly derived from entries.

---

## Frontend Tasks

### Cashback Analysis Page

Add columns:

* Level
* Rule (Category / Default / Fallback)
* Rate

Tooltip shows:

* "Applied Level"
* "Applied Rule"

---

### Account Edit UI

* Ensure Levels are ordered by min_total_spend
* Prevent overlapping min_total_spend ranges

---

## Validation Rules

* Only one Level applies per cycle
* Category Rule overrides Level default
* Budget caps enforced at cycle level
* Version mismatch triggers recompute

---

## Acceptance Criteria

* Cashback amounts match policy logic
* UI clearly explains why cashback was applied
* Editing rules triggers recompute
* No NaN / inconsistent percent handling

---

## Test Scenarios

1. Default-only card (no levels)
2. Multi-level card
3. Category override inside level
4. Category missing → fallback
5. Budget exhausted
6. Version bump recompute

---

## Branch & PR

* Branch: phase-7.2-cashback-policy-resolution
* PR: Phase 7.2 – Cashback Policy Resolution by Category Rules
