# PATCH 2 ƒ?" .agent/gravityrules.md
# Goal: tighten execution behavior so the agent doesn't "invent" layout, and enforces screenshot-driven UI.

# Context for Agent ƒ?" .agent Rules & Workflow

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

### UI changes must be screenshot-locked
- If the user provides mock screenshots or reference UI images, treat them as the source of truth.
- Do NOT introduce new sections, cards, or rearrange header layout unless explicitly requested.
- If something is ambiguous, choose the option that matches the screenshot layout.

### Do not mix desktop and mobile rendering logic in one table
- For complex tables or dense rows:
  - Desktop table layout remains desktop-first.
  - Mobile must use a dedicated list/card layout component.
- Mobile list/card must show correct data mapping (no shifted columns, no missing fields).

### Styling constraints
- Avoid ƒ?ocreative roundingƒ??:
  - Do not force `rounded-full` on rectangular images/logos.
  - Only use rounding where the domain requires it:
    - People avatars can be rounded.
    - Card/account logos should remain rectangular with `object-contain`.
- Keep icon sizes consistent across a page (define a small set: 16/20/24/32/48).

### Change scope discipline
- Prefer small incremental refactors:
  - Create new components first
  - Switch consumers
  - Delete old code only after the new path is verified
- Do not refactor unrelated files ƒ?obecause itƒ?Ts nicerƒ??.
