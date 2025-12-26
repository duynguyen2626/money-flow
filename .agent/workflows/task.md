PHASE 6A — Canonical Month Tag: YYYY-MM Everywhere (No DECxx)

Decision: The ONLY allowed month tag format across DB, UI, and Sheet sync is "YYYY-MM" (e.g. 2025-12).
Legacy month tags like "MMMYY" must be eliminated from display and from writes.

Objectives
1) Codebase: Remove all legacy "MMMYY" formatting and usage. Display month tags as YYYY-MM only.
2) Writes: Any create/update/sync must store/send YYYY-MM only.
3) Reads: Temporary backward compatibility — if DB still contains DECxx, normalize to YYYY-MM on read and never show DECxx.
4) Docs: Update .agent rules/context to enforce this convention.
5) Provide SQL migration snippets to convert DECxx -> YYYY-MM in DB (transactions, people/debt tags, any other monthly tag fields).

Constraints
- Do not change business logic (cashback/debt calculations).
- No UI redesign. Only correctness + format standardization.
- Keep commits small. Run npm run build before each commit.

Implementation
A) Add month tag utility module and tests:
- isYYYYMM, isLegacyDECxx, legacyToYYYYMM, normalizeMonthTag, toYYYYMMFromDate

B) Update .agent files to enforce standard:
- .agent/workflows/gemini.md
- .agent/rules/gravityrules.md
- domain_logic.md

C) Replace usage across repo:
- filters/grouping/sync payloads always use normalized YYYY-MM.
- UI always displays YYYY-MM.

Deliverables
- Build passing
- Migration doc + SQL snippets
- No new DECxx strings introduced (rg check must be clean)
