# .agent/rules/gravityrules.md
# Purpose: core workflow and UI rules.

## Operating mode

- Read existing implementation before coding.
- Prefer minimal refactors.
- Do not introduce breaking changes.
- Keep changes small and reviewable.

## Build / quality rules (critical)

- Run `npm run build` (or project build) before marking task complete.
- If build fails locally or on Vercel, fix it and re-run build.

## Month tag standard (critical)

- Canonical month tag format: `YYYY-MM`.
- Never generate/store/display legacy formats.

## Commit / PR workflow

- Use a phase/scope branch naming convention.
- Commit message style: `PHASE {PHASE_ID} - {TITLE}`.
- Never push directly to main; open PR.
- **CRITICAL**: Before committing, YOU MUST run:
  - `npm run lint`
  - `npm run build`
  - Only commit if both pass.

## UI changes must be screenshot-locked

- If the user provides mock screenshots or reference UI images, treat them as the source of truth.
- Do not introduce new sections, cards, or rearrange header layout unless explicitly requested.
- If something is ambiguous, choose the option that matches the screenshot layout.

## Do not mix desktop and mobile rendering logic in one table

- For complex tables or dense rows:
  - Desktop table layout remains desktop-first.
  - Mobile must use a dedicated list/card layout component.
- Mobile list/card must show correct data mapping (no shifted columns, no missing fields).

## Styling constraints

- Avoid creative rounding:
  - Do not force `rounded-full` on rectangular images/logos.
  - Only use rounding where the domain requires it:
    - People avatars can be rounded.
    - Card/account logos should remain rectangular with `object-contain`.
- Keep icon sizes consistent across a page (define a small set: 16/20/24/32/48).

## Change scope discipline

- Prefer small incremental refactors:
  - Create new components first
  - Switch consumers
  - Delete old code only after the new path is verified
- Do not refactor unrelated files because it is nicer.

## Project-specific UI scope

- Quick Add chat widget is limited to Dashboard, Transactions, and People detail pages.
