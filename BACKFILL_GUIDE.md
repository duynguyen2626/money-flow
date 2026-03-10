# Backfill Guide: SB → PB Migration for Debt Cycles & Cashback Share

## Overview
This guide walks through migrating transaction data from Supabase (SB) to PocketBase (PB) to:
- Add `debt_cycle_tag` field for debt transactions (from SB `tag`)
- Add `cashback_share_percent`, `cashback_share_fixed`, `cashback_mode` columns to PB
- Validate `final_price` calculation consistency

## Prerequisites
- `.env.local` configured with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_POCKETBASE_URL` (default: `https://api-db.reiwarden.io.vn`)
  - `POCKETBASE_DB_PASSWORD`

## Step 1: Sync PB Schema
Update PocketBase collections with new transaction fields:

```bash
node scripts/pocketbase/migrate.mjs --sync-schema
```

This reads `scripts/pocketbase/schema.json` and syncs all collections to PB. It will add:
- `debt_cycle_tag` (text)
- `cashback_share_percent` (number)
- `cashback_share_fixed` (number)
- `cashback_mode` (text)

**⚠️ Note:** If you only want to sync `transactions`, edit the script or use the selective approach.

## Step 2: Run Backfill (Dry-Run First)
Always test with `--dry-run` before applying:

```bash
node scripts/backfill-cashback-debt-cycles.mjs --dry-run --limit 100
```

Output sample:
```
[Backfill] Starting backfill script (dry-run: true, limit: 100)
[Backfill] Fetching transactions from Supabase...
[Backfill] Found 42 transactions to process
[1/42] Setting debt_cycle_tag="2026-03" for a1067713-5437-4b75-9ad3-4be28b897f4c
[1/42] Setting cashback_share_percent=0.04 for a1067713-5437-4b75-9ad3-4be28b897f4c
[1/42] [DRY RUN] Would update a1067713-5437-4b75-9ad3-4be28b897f4c
...
[Backfill] === SUMMARY ===
Total processed: 42
Updated: 38
Errors: 0
[Backfill] Backfill completed in DRY RUN mode.
```

**Check for errors** before proceeding. Common issues:
- "PB transaction not found" → PB record doesn't exist yet (may need to create via sync process)
- "Final price mismatch" → Validation warning only, not blocking

## Step 3: Apply Backfill
Once dry-run looks good, apply the changes:

```bash
node scripts/backfill-cashback-debt-cycles.mjs
```

Or with a custom limit:
```bash
node scripts/backfill-cashback-debt-cycles.mjs --limit 500
```

The script will:
1. Map `tag` → `debt_cycle_tag` for type='debt' transactions
2. Copy `cashback_share_percent`, `cashback_share_fixed`, `cashback_mode` from SB to PB
3. Update PB records with new values
4. Print summary of processed/updated/errors

## Step 4: Verify
Check a few random records in PB to confirm:

```bash
# In PB Admin UI: Browse transactions collection
# Or via API:
curl -H "Authorization: Bearer <admin-token>" \
  "https://api-db.reiwarden.io.vn/api/collections/transactions/records?perPage=5&sort=-date"
```

Sample successful record:
```json
{
  "id": "qy9xuxfos1n1afq",
  "date": "2026-03-03",
  "type": "debt",
  "amount": -1623796,
  "debt_cycle_tag": "2026-03",
  "cashback_share_percent": 0.04,
  "cashback_share_fixed": null,
  "cashback_mode": "real_percent",
  "final_price": -1558844.16,
  "metadata": { "service_fee": 33604, ... }
}
```

## Rollback Plan
If data is incorrect, you can:
1. Clear the new fields on PB (set to null)
2. Re-run backfill with corrected logic
3. Or restore from database backup

## Notes
- **Backfill is idempotent**: Running twice won't duplicate data (checks for existing values)
- **Metadata preserved**: The backfill reads from SB but preserves PB metadata
- **Final price fallback**: Code still reads from both PB columns AND metadata for compatibility
- **No data loss**: Both SB and PB records remain unchanged if values already exist

## Post-Migration
Once backfill is complete and verified:
1. Code will read `cashback_share_percent/fixed/mode` from dedicated PB columns (faster than metadata lookup)
2. New transactions will automatically use the new PB columns
3. Old transactions with metadata fallback will still work but may want a second pass to clean up metadata

## Troubleshooting
| Error | Cause | Solution |
|-------|-------|----------|
| "Missing environment variables" | `.env.local` incomplete | Verify all vars are set and non-empty |
| "PocketBase request failed [401]" | Invalid PB password | Check `POCKETBASE_DB_PASSWORD` |
| "PB transaction not found" | PB lacks record | Ensure sync-schema completed successfully |
| "Final price mismatch" | Cashback calculation differs | ⚠️ Warning only; verify SB data is correct |

## Command Reference
```bash
# Dry-run all transactions
node scripts/backfill-cashback-debt-cycles.mjs --dry-run

# Dry-run first 100 only
node scripts/backfill-cashback-debt-cycles.mjs --dry-run --limit 100

# Apply all (requires confirmation in interactive mode)
node scripts/backfill-cashback-debt-cycles.mjs

# Apply with limit
node scripts/backfill-cashback-debt-cycles.mjs --limit 500
```
