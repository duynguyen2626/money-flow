# PATCH 1 — .agent/gemini.md
# Goal: enforce "read-first", build gate, and mobile-split pattern as a hard requirement.

## Add this section near the top (after any intro), or at the end if unsure:
### Non-negotiable gates (must follow)
- Before editing any code, you MUST read these files and restate (in 5 bullets max) how you will apply them:
  - ./.agent/gemini.md
  - ./.agent/gravityrules.md
  - ./.agent/domain_logic.md
  - ./README.md
- Every change must keep business logic intact unless the task explicitly says otherwise.
- Build gate is mandatory:
  - Run: `npm run build`
  - If it fails, fix it in the same PR. Do not leave build broken.

### UI refactor rule: mobile must be split, reusable
- When a page has complex desktop UI (badges, chips, sticky table, hover actions), DO NOT “make it responsive” by hiding columns inside the same component.
- Instead: create a dedicated, reusable mobile component and keep the desktop component clean.
- Prefer the Transactions refactor pattern:
  - A reusable mobile row/card component
  - A page-specific mapper file
  - A thin adapter component per domain (transactions/people/accounts)
- Naming convention:
  - `XxxDesktop.tsx`
  - `XxxMobile.tsx`
  - `xxxToMobileRow.ts` (mapper)
  - `MobileRecordRow.tsx` (reusable base)

### Definition of Done (DoD)
- UI matches the provided mock screenshots (spacing + structure), not “close enough”.
- Mobile:
  - No overlap
  - No horizontal scrolling
  - No missing columns / wrong data mapping
- Desktop:
  - Works on large (27") and laptop (13") screens without excessive empty margins
- Build passes: `npm run build`
- Provide:
  - files changed list
  - manual verification checklist
  - quick notes on tradeoffs
