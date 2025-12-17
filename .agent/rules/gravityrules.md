---
trigger: always_on
---

# .agent/rules/gravityrules.md — Rules (MF4)
TypeScript & Build Validation (CRITICAL)
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

## Update `.agent/workflows/commit_and_push.md`

Use dynamic placeholders (if not already):

* PHASE_ID=9.2.1
* SCOPE_SLUG=FIX-RECOMPUTE-CONSISTENCY
* COMMIT_TITLE=Fix cashback recompute consistency and normalize budgets


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