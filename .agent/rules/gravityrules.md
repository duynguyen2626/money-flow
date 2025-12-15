---
trigger: always_on
---

# .agent/rules/gravityrules.md — Rules (MF4)

## UI Rules

* Modal layout must be:

  * Sticky header
  * Scrollable body
  * Fixed footer

* Transaction type tabs:

  * Must never scroll out of view
  * Must clearly indicate active state

* Do not stack multiple progress bars or dense indicators

* Prefer badges, pills, and grouped information

## Cashback Rules (MF4)

* Voluntary Cashback is allowed when:

  * Account has no cashback
  * OR cashback budget is exhausted

* Voluntary cashback values:

  * Are allowed to be negative / overflow
  * Must NOT affect min spend or budget calculations

* No cashback database schema changes in MF4

## Business Rules

* Transfer transactions:

  * Must auto‑select category `Money Transfer`
  * Must NOT allow credit cards as source accounts

* Lending / Repay:

  * Require person selection

## Engineering Discipline

* Do not duplicate business logic across components
* Keep derived state in helpers when possible
* Small, reviewable commits only

## QA Expectations

* Test modal on mobile & desktop
* Test each transaction type
* Verify voluntary cashback toggle behavior
* Verify transfer constraints

---
