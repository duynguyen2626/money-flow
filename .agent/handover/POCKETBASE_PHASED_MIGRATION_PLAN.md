# PocketBase Migration Plan (Micro Phases)

Date: 2026-03-05  
Branch: `feat/pocketbase-migration`

> Note: `.agent/handover/POCKETBASE_MIGRATION_GUIDE.md` is not present in current branch.  
> Sources used: `.agent/handover/POCKETBASE_NEXT_STEPS.md`, `scripts/pocketbase/schema.json`, `scripts/pocketbase/migrate.mjs`.

## Core Principles

1. Migrate in **very small phases** and verify each phase before moving on.
2. Keep migration script **idempotent** (safe rerun) using deterministic PocketBase IDs.
3. Avoid timeout by using smart cleanup:
   - `--cleanup=auto`: skip cleanup when target collections are empty.
   - batched concurrent delete when cleanup is needed.
4. Preserve critical logic: `persisted_cycle_tag` is computed from `statement_cycle_tag` or `occurred_at + statement_day` and stored in `transactions.metadata.persisted_cycle_tag`.

---

## Phase 0 — Schema Readiness (Manual in PB Admin)

- Import `scripts/pocketbase/schema.json` in PocketBase Admin.
- Ensure 8 collections exist:
  - `people`, `categories`, `shops`, `accounts`, `transactions`, `cashback_cycles`, `services`, `batches`.
- Do not run data migration before schema is complete.

---

## Phase 1 — Foundation Data

### 1.1 People
- Command:
  - `node scripts/pocketbase/migrate.mjs --phase=foundation --cleanup=auto`
- Scope in phase:
  - `people`

### 1.2 Categories
- Command (same as 1.1, bundled by `foundation`):
  - `node scripts/pocketbase/migrate.mjs --phase=foundation --cleanup=auto`
- Scope in phase:
  - `categories`

**Executed result:**
- `people`: total=27, created=27, updated=0
- `categories`: total=31, created=31, updated=0

---

## Phase 2 — Shops

- Command:
  - `node scripts/pocketbase/migrate.mjs --phase=shops --cleanup=auto`
- Dependency:
  - Phase 1 complete (needs category relation mapping)

**Executed result:**
- `shops`: total=29, created=29, updated=0

---

## Phase 3 — Accounts

- Command:
  - `node scripts/pocketbase/migrate.mjs --phase=accounts --cleanup=auto`
- Dependency:
  - Phase 1 complete (owner relation to people)

**Executed result:**
- `accounts`: total=93, created=93, updated=0

---

## Phase 4 — Transactions (Critical)

- Command:
  - `node scripts/pocketbase/migrate.mjs --phase=transactions --cleanup=auto`
- Dependency:
  - Phases 1–3 complete (relations to accounts/categories/shops/people)
- Critical logic in script:
  - `persisted_cycle_tag` written into `metadata.persisted_cycle_tag`
  - parent transaction relation mapped deterministically

**Executed result:**
- `transactions`: total=295, created=295, updated=0

---

## Phase 5 — Cashback Cycles

- Command:
  - `node scripts/pocketbase/migrate.mjs --phase=cashback --cleanup=auto`
- Dependency:
  - Accounts already migrated

**Executed result:**
- `cashback_cycles`: total=54, created=54, updated=0

---

## Phase 6 — Services (from subscriptions)

- Command:
  - `node scripts/pocketbase/migrate.mjs --phase=services --cleanup=auto`
- Mapping:
  - Supabase `subscriptions` -> PocketBase `services`

**Executed result:**
- `services`: total=2, created=2, updated=0

---

## Phase 7 — Batches

- Command:
  - `node scripts/pocketbase/migrate.mjs --phase=batches --cleanup=auto`

**Executed result:**
- `batches`: total=21, created=21, updated=0

---

## Operational Commands

- Full migration in order:
  1. `node scripts/pocketbase/migrate.mjs --phase=foundation --cleanup=auto`
  2. `node scripts/pocketbase/migrate.mjs --phase=shops --cleanup=auto`
  3. `node scripts/pocketbase/migrate.mjs --phase=accounts --cleanup=auto`
  4. `node scripts/pocketbase/migrate.mjs --phase=transactions --cleanup=auto`
  5. `node scripts/pocketbase/migrate.mjs --phase=cashback --cleanup=auto`
  6. `node scripts/pocketbase/migrate.mjs --phase=services --cleanup=auto`
  7. `node scripts/pocketbase/migrate.mjs --phase=batches --cleanup=auto`

- Fast rerun without deletes:
  - `node scripts/pocketbase/migrate.mjs --phase=all --cleanup=none`

- Supported flags:
  - `--phase=all|foundation|shops|accounts|transactions|cashback|services|batches`
  - `--cleanup=auto|none|phase`

---

## Script Improvements Implemented

In `scripts/pocketbase/migrate.mjs`:

1. Added **phase-based migration** via CLI flags.
2. Added **smart cleanup** and batched concurrent deletion to avoid timeout.
3. Added **schema existence check** before migration.
4. Added **deterministic PB ID mapping** (PB-compatible 15-char IDs) to support safe reruns.
5. Preserved transaction cycle logic with `persisted_cycle_tag` in metadata.
6. Added per-phase summary output (`total/created/updated`).
