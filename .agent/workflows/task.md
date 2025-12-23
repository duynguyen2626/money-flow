---
description: Task Descriptions
---

# PHASE 7.3 — Cashback Policy Engine (Priority, Conflict Resolution, Preview)

## Goal

Finalize the cashback policy engine so that **any transaction always resolves to exactly one explainable policy**.
This phase completes the cashback logic after UX improvements in Phase 7.2B.

---

## In Scope

### 1. Deterministic Policy Resolution (Final Form)

Implement a strict resolution order when multiple rules may apply:

**Resolution order:**

1. Active Level (by min_total_spend)
2. Category Rules inside the active Level

   * More specific rules win (smaller category set)
   * If equal specificity, lower index (earlier rule) wins
3. Level default rate
4. Program default rate (fallback)

Only ONE policy must be applied per transaction.

---

### 2. Rule Priority & Conflict Handling

Enhance rule metadata:

```ts
policy: {
  levelId: string;
  ruleId?: string;
  ruleType: 'category' | 'level_default' | 'program_default';
  priority: number;
}
```

Rules:

* priority is implicit from order (earlier = higher priority)
* no manual priority UI yet
* conflict resolution must be fully deterministic

---

### 3. Cashback Preview / Simulation

Add a preview layer (read-only):

```ts
simulateCashback({
  accountId,
  amount,
  categoryId,
  occurredAt
}) => {
  rate,
  maxReward,
  estimatedReward,
  appliedLevel,
  appliedRule
}
```

Usage:

* Transaction add/edit modal
* Tooltip in Cashback Analysis table

Preview must NOT persist data.

---

### 4. Entry Generation (Final Rules)

When persisting:

* One transaction → one cashback_entry
* entry.metadata.policy must fully describe resolution
* Respect cycle budget and overflow rules

---

### 5. UI Enhancements (Minimal)

* Cashback Analysis table:

  * Show Policy column (Level + Rule name)
  * Hover tooltip shows resolution details

* Transaction modal:

  * Show preview hint ("Estimated cashback: …")

No redesign beyond this.

---

## Out of Scope

* No new database tables
* No relational refactor of rules
* No admin dashboard

---

## Acceptance Criteria

1. Any transaction resolves to exactly one policy
2. Conflicting category rules always resolve deterministically
3. Cashback preview matches persisted result
4. Editing rules triggers recompute correctly
5. No NaN / undefined cashback values

---

## Test Scenarios

1. Overlapping category rules (same category in 2 rules)
2. Multi-category transaction
3. No category (fallback)
4. Budget exhausted
5. Preview vs persisted consistency

---

## Branch / PR

* Branch: phase-7.3-cashback-policy-engine
* PR title: Phase 7.3 – Cashback Policy Engine (priority, conflicts, preview)
