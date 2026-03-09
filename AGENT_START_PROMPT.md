# Agent Start Prompt — PocketBase Migration Continuation

## Objective
Continue migration work safely from current base branch state, with strict branch isolation and clear handover discipline.

## Mandatory Git Workflow (DO THIS FIRST)
1. `git checkout feat/pocketbase-migration`
2. `git pull --rebase origin feat/pocketbase-migration`
3. `git checkout -b agent/pb-migration-<yyyymmdd>-<task>`

Do **NOT** code directly on `feat/pocketbase-migration`.

Suggested branch format:
- `agent/pb-migration-20260305-clasp-preflight`
- `agent/pb-migration-20260305-people-sync-validation`

## Read First (required)
1. `docs/MIGRATION_HANDOVER_2026-03-05.md`
2. `.github/copilot-instructions.md`
3. `README.md`
4. `scripts/pocketbase/migrate.mjs`
5. `src/services/pocketbase/*`
6. `src/services/sheet.service.ts`

## Current State Snapshot
- Base branch: `feat/pocketbase-migration`
- Sheet-sync fixes already merged into migration branch.
- `#nosync/#deprecated` filtering already fixed in server-side sheet sync.
- People sheet type coloring fixed to Type column only (B).
- Account/cashback PocketBase service layer exists but codebase is still mixed PB/Supabase.

## Priority Tasks
### P1 — Stabilize Google Sheets push auth (avoid account confusion)
- Add preflight account check in:
  - `integrations/google-sheets/people-sync/push-sheet.mjs`
  - `integrations/google-sheets/batch-sync/push-sheet.mjs`
- Fail fast if active `clasp` account != expected account.
- Keep logs actionable and concise.

### P2 — Continue PB migration in small safe slices
- Avoid big-bang rewrites.
- Migrate module-by-module with behavior parity.
- Keep backward compatibility while mixed backend remains.

### P3 — Validate critical flows after each change
- People sync all/current cycle
- `#nosync` exclusion
- Accounts detail route
- Cashback page

## Constraints
- No extra UX/features outside requested scope.
- Keep edits surgical.
- If tooling timeout or auth blockers occur: document blocker + commit partial progress + update handover.

## Exit Criteria for this session
- New branch pushed (not direct to base branch)
- Focused commits with clear messages
- Updated handover notes with:
  - done
  - pending
  - blockers
  - exact next command for next agent
