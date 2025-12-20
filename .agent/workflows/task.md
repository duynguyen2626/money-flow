---
description: Task Descriptions
---

# MF5.3.3a — Checkpoint & Task Prompt (Eliminate Policy/Cycle Inconsistency Across Logins)

> This canvas is a focused follow-up to MF5.3.3.
> Goal: eliminate inconsistent cashback policy + cycle range + budget-left across different logins.
> **DO NOT PATCH OR MODIFY ANY ACCOUNT CASHBACK CONFIG DATA.** Data is already corrected in DB.
> **Do NOT redesign the system. Do NOT add tables. Do NOT change MF5.2 core engine.**

---

## 1) Current Checkpoint (Observed Confusion)

* VPBank Lady account in DB has correct legacy config:

  * `rate = 0.15`
  * `cycleType = statement_cycle`
  * `statementDay = 15`
  * `maxAmount = 1,000,000`

But UI can show inconsistent states depending on login:

* Cycle range sometimes shows **calendar month** (`01 Dec - 31 Dec`) instead of statement cycle (`15 Dec - 14 Jan`)
* Policy can show **Legacy / Base 0.1%** in some views
* Budget Left sometimes shows `--` or mismatched value across users

This indicates **data fetch / parsing / fallback paths are inconsistent**, not data itself.

---

## 2) MF5.3.3a Objective (Single Sentence)

> Ensure every UI path uses the same account config + same cycle key, and never falls back to guessed defaults.

---

## 3) Scope Boundaries (ANTI-DRIFT)

### ✅ IN SCOPE

* Fix inconsistent fetch/select paths so `accounts.cashback_config` is always available where needed
* Ensure `parseCashbackConfig` reliably parses JSONB returned as object OR string
* Ensure cycle range/tag selection is consistent across all logins
* Remove any silent fallback to hardcoded/default policy (0.1%, calendar-month) when config/cycle is missing
* Add explicit diagnostics: if cycle/config missing, show placeholder and log error

### ❌ OUT OF SCOPE

* NO DB data patch for Lady or any account
* NO changes to cashback rules/levels design
* NO UI redesign
* NO new tables / dashboards

---

## 4) Non-Negotiable Rules

* UI must not recompute budget-left; it must come from `cashback_cycles`
* `resolveCashbackPolicy` remains the only rate/cap decision point
* If required data is missing:

  * UI must show `--` and a clear “Missing cycle/config” hint
  * MUST NOT guess by using calendar-month defaults or hardcoded rates

---

## 5) Implementation Tasks

### 5.1 Make account config fetch consistent

* Identify all UI/API paths used by transaction modal and account header:

  * ensure they select/return `accounts.cashback_config`, `accounts.type`, and `accounts.id`
* Ensure both login A and login B hit the same endpoint or equivalent payload.

### 5.2 Harden parsing of cashback_config

* Ensure `parseCashbackConfig` supports:

  * JSONB object
  * JSON string (e.g. `"{\"rate\":0.15,...}"`)

Acceptance:

* `cycleType` and `statementDay` never default incorrectly.

### 5.3 Unify cycle key and cycle range

* Choose ONE consistent cycle key for fetching cycles:

  * `account_id + cycle_tag` (preferred)
  * where cycle_tag is derived consistently from config + occurred_at

* Ensure the UI cycle date label uses the same computed range function for all logins.

### 5.4 Remove/disable silent fallbacks

* Remove any code path that uses hardcoded “base policy” when config is missing.
* Replace with:

  * `--` + diagnostic text
  * console/server log with account_id + user_id

---

## 6) Verification Checklist (Must Pass)

### 6.1 Two-login consistency test

* Login as user A and user B
* Open the same transaction modal for VPBank Lady

Expected (both users):

* Cycle range shows statement cycle (`15 <month> - 14 <next month>`)
* Match Policy shows Legacy
* Applied Rate shows 15%
* Budget Left is identical (or `--` for both if cycle missing, but never mismatched)

### 6.2 SQL proofs

A) Verify config in DB (read-only):

```sql
SELECT id, cashback_config
FROM accounts
WHERE id = '83a27121-0e34-4231-b060-2818da672eca';
```

B) Verify cycle row exists and budget-left computation:

```sql
SELECT
  cycle_tag,
  max_budget,
  real_awarded,
  virtual_profit,
  (max_budget - real_awarded - virtual_profit) AS computed_budget_left
FROM cashback_cycles
WHERE account_id = '83a27121-0e34-4231-b060-2818da672eca'
ORDER BY updated_at DESC;
```

---

## 7) Branch / PR

* Branch: `PHASE-9.3.3A-CASHBACK-CONSISTENCY-ACROSS-LOGINS`
* Commit: `MF5.3.3a - Eliminate policy/cycle inconsistency across logins`
* PR Title: `MF5.3.3a: Eliminate cashback policy/cycle inconsistency across logins`

PR must include:

* Screenshot: login A vs login B showing identical cycle range + applied rate
* Screenshot: if missing cycle, both show `--` with diagnostic text
* Short root cause explanation

---

## 8) Stop Condition

Stop after PR opened and provide:

* QA steps (2-login test)
* SQL snippet outputs
* Notes on which fallback was removed and how parsing was hardened
