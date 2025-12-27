---
trigger: always_on
---

# .agent/rules/gravityrules.md — Rules (MF4)
TypeScript & Build Validation (CRITICAL)

Add CRITICAL: Month Tag Standardization

DO NOT introduce legacy "MMMYY" month tags anywhere

Any month tag stored/sent/displayed must be YYYY-MM

On read: normalize legacy -> YYYY-MM (temporary compatibility)

On write: always persist YYYY-MM

ALWAYS run npm run build or npx tsc --noEmit before:
Committing code
Pushing to remote
Marking task as complete
NEVER assume local dev server success = production build success
Fix ALL TypeScript errors before proceeding—no exceptions
When working with database types:
Check database.types.ts for field definitions
Handle nullable fields explicitly (use ?? '' or ?? null)
Include ALL required fields when mapping DB rows to TypeScript interfaces
Deployment Rules
Pre-push validation: TypeScript check installed via git hook
If Vercel build fails:
Check the exact error from Vercel logs
Reproduce locally with npm run build
Fix and verify build passes locally
Push fix immediately to the failing branch
Database schema changes require regenerating types

* Never ship with two recompute implementations that disagree.
* Backfill scripts must use the same recompute semantics as runtime.
* All data-fix scripts must be idempotent.
- Cashback UI hints MUST read from cashback_cycles, never directly from account config when a cycle exists.
- Any transaction with cashback_mode != null must result in:
  - a cashback_entries row
  - a recomputed cashback_cycles row
- Budget Left is always:
  max_budget - real_awarded - virtual_profit
- cashback_config parsing must support legacy keys (max_amt, min_spend, cycle, statement_day).


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
## Month Tag Rules (CRITICAL)
- Never generate or store debt/cycle tags in legacy "MMMYY" format.
- Canonical format is `YYYY-MM` only.
- Any legacy tags must be normalized to `YYYY-MM`.
- Before marking complete: repo-wide search must return 0 hits for: legacy MMMYY month tags, tagUpper, transaction_lines, shops.logo_url

## QA Expectations

* Test modal on mobile & desktop
* Test each transaction type
* Verify voluntary cashback toggle behavior
* Verify transfer constraints

---
