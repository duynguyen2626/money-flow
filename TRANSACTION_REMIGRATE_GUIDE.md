# Transaction Remigration Guide (Source-ID Safe)

Date: 2026-03-10

This guide replaces the previous transaction backfill flow when you see `PB transaction not found` for all records.

## Why this flow

The new script does **not** depend on transaction hash lookup as identity.
Canonical identity is `metadata.source_id` (Supabase transaction UUID).

## Prerequisites

- `.env.local` must contain:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `POCKETBASE_DB_EMAIL`
  - `POCKETBASE_DB_PASSWORD`
- Run from project root.

## Step 1 - Recreate transactions collection schema (required)

```bash
node scripts/pocketbase/remigrate-transactions-sourceid-safe.mjs --recreate-collection --reset --apply
```

This is the required path when PocketBase rejects field type change (e.g. `parent_transaction_id` text → relation).
The script will:
- Drop existing `transactions` collection
- Recreate it from `scripts/pocketbase/schema.json`
- Reset and remigrate data from Supabase

This ensures `transactions` has required fields:
- `occurred_at`, `note`, `status`, `persisted_cycle_tag`
- `debt_cycle_tag`, `cashback_share_percent`, `cashback_share_fixed`, `cashback_mode`
- relation `parent_transaction_id`

If schema already matches and you only want data reset/remigrate, omit `--recreate-collection`.

## Step 2 - Dry-run planning

```bash
node scripts/pocketbase/remigrate-transactions-sourceid-safe.mjs --reset --limit=100
```

- No writes are made unless `--apply` is passed.
- `--recreate-collection` cannot be used in dry-run mode.
- Check summary:
  - skipped rows
  - unresolved relations
  - formula mismatch warnings

## Step 3 - Full apply (reset + remigrate)

```bash
node scripts/pocketbase/remigrate-transactions-sourceid-safe.mjs --reset --apply
```

Default behavior:
- Reset `transactions`
- Reset + remigrate `cashback_cycles`
- Rebuild transactions from Supabase using `metadata.source_id`

## Optional modes

- Keep cycles unchanged:

```bash
node scripts/pocketbase/remigrate-transactions-sourceid-safe.mjs --reset --skip-cycles --apply
```

- Non-strict relation mode (not recommended):

```bash
node scripts/pocketbase/remigrate-transactions-sourceid-safe.mjs --reset --no-strict-relations --apply
```

- Single transaction debug:

```bash
node scripts/pocketbase/remigrate-transactions-sourceid-safe.mjs --only-id=<supabase-uuid>
```

## Step 4 - Validate critical flows

After apply, script prints validation summary. Then verify manually:

1. `/accounts/[id]` loads transactions and cycle stats.
2. `/people/[id]` and `/people/[id]/details` show debt/transaction rows correctly.
3. Edit transaction form preloads:
   - `cashback_share_percent`
   - `cashback_share_fixed`
   - `cashback_mode`
4. Random spot check final price parity between SB and PB.

## Rollback

If needed:

1. Restore PB backup.
2. Re-run with `--only-id` for targeted debug.
3. Keep old writes paused until unresolved-relations is zero (or accepted explicitly).
