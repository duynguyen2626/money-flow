---
description: Task Descriptions
---

# MF5.3.2 — Checkpoint & Task Prompt (Policy Explanation in UI)

> This canvas continues after **MF5.3 + MF5.3.1**.
> Goal: surface **cashback policy explanation** to the user using existing metadata.
> **No new logic. No recomputation. No schema change.**

---

## 1) Current Checkpoint (Verified)

### ✅ Completed & Locked

* Cashback engine (MF5.2) is stable
* Category-based rules + spend-based levels (MF5.3) implemented
* Attribution metadata is mandatory and audited (MF5.3.1)

Each cashback-affecting transaction now has:

* 1 `cashback_entries` row
* non-null `metadata` explaining applied policy

---

## 2) Objective of MF5.3.2

> Make cashback decisions **human-readable in UI**, using metadata only.

MF5.3.2 is **read-only UX** on top of existing data.

---

## 3) Scope Boundaries (ANTI-DRIFT)

### ✅ IN SCOPE

* Display policy explanation in UI
* Read exclusively from `cashback_entries.metadata`
* Minor UI additions (tooltip / expandable info)

### ❌ OUT OF SCOPE

* No cashback calculation changes
* No recompute in UI
* No edits to `resolveCashbackPolicy`
* No DB schema changes
* No settings or rule editing UI

---

## 4) UI Targets

### 4.1 Transaction Detail / Modal

Show a **policy explanation block** when cashback exists:

Example:

```
Cashback applied:
• Category rule: Education
• Level: Silver
• Rate: 15%
• Max reward: 300,000₫
```

Fallback cases:

* Program default
* Level default
* Legacy rule

---

## 5) Data Contract (STRICT)

UI must read ONLY:

```ts
cashback_entries.metadata
```

Expected keys:

```json
{
  "policySource": "program_default" | "level_default" | "category_rule" | "legacy",
  "reason": "Level matched: Silver",
  "levelId": "lvl_2",
  "levelName": "Silver",
  "categoryId": "...",
  "rate": 0.15,
  "ruleMaxReward": 300000
}
```

UI formatting rules:

* `rate` shown as percent (×100)
* Monetary values formatted normally

---

## 6) UX Rules (Important)

* Explanation must be:

  * non-intrusive
  * read-only
  * visible on demand (tooltip / info icon / expandable)

* No layout redesign

* No new components unless reused

---

## 7) Verification Checklist

Agent must verify:

* UI shows explanation for:

  * program default
  * level default
  * category rule

* Changing category updates explanation immediately

* Budget-left display remains unchanged

* No UI-side cashback math

---

## 8) Branch / PR

* Branch: `PHASE-9.3.2-CASHBACK-POLICY-EXPLANATION-UI`
* Commit: `MF5.3.2 - Show cashback policy explanation in UI`
* PR Title: `MF5.3.2: Show cashback policy explanation (read-only)`

PR must include:

* Screenshot of transaction modal with explanation visible
* Screenshot for category change case

---

## 9) Stop Condition

Stop after PR opened.
Provide:

* Screenshots
* Short QA checklist

---

## 10) Guiding Principle

> MF5.3.2 is about **transparency**, not intelligence.
> UI explains decisions; engine remains untouched.
