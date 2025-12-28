---
trigger: always_on
---

# Context for Agent — .agent Rules & Workflow

## Operating mode

* Read existing implementation before coding.
* Prefer minimal refactors.
* Do not introduce breaking changes.
* Keep changes small and reviewable.

## Build / quality rules (CRITICAL)

* Fix TypeScript errors before commit/push.
* Always run `npm run build` (or equivalent project build command) before marking task complete.
* If Vercel build fails: reproduce locally with build, fix, re-run build.

## Month Tag Standard (CRITICAL)

* Canonical month tag format: `YYYY-MM`.
* Never generate/store/display legacy `MMMYY` tags.

## Commit & PR workflow template

* Use a phase/scope branch naming convention.
* Commit message style: `PHASE {PHASE_ID} - {TITLE}`.
* Never push directly to main; open PR.

## Domain logic

* This task is sheet sync / formatting only.
* Do NOT change domain calculations (cashback, debt, etc.).

## Notes specific to this task

* The fix must be limited-range operations on the table region A:J.
* Any delete or sort must never touch the Summary region (L:N).
