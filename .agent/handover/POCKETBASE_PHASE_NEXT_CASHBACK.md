# PocketBase Phase Next - Cashback Refactor

Date: 2026-03-05

## What was implemented in code (this phase)

1. **Cycle option loading optimized**
   - Removed duplicate DB fetch in `fetchAccountCycleOptionsAction`.
   - `getCashbackCycleOptions` now returns `cycleId` + stats in one query.

2. **KPI consistency for Account Detail header**
   - Added `actualClaimed` into cashback stats payload.
   - Header now uses one primary stats source for `Actual` first.

3. **Add Transaction V2 budget becomes dynamic**
   - `Remains Cashback` and `Remains Spendable Target` now subtract projected reward from current draft transaction.

## Why this helps current pain points

- Fewer round-trips when opening account detail cycle filters.
- Reduced mismatch where `Actual` could show large value while other metrics use different source.
- Slide budget reacts immediately to amount/category changes, instead of showing static snapshot only.

## PocketBase DB refactor proposal (ready to import)

File:
- `scripts/pocketbase/migrate/schema.cashback-phase-next.api.json`

Contains:
- Expanded `cashback_cycles` snapshot fields:
  - `cycle_start_at`, `cycle_end_at`, `status`
  - `min_spend_target`, `met_min_spend`, `max_budget`
  - `real_awarded`, `est_earned`, `shared_amount`, `virtual_profit`, `net_profit`
  - `remaining_budget`, `overflow_loss`, `is_exhausted`, `updated_at`
- New `cashback_entries` collection:
  - `transaction_id`, `cycle_id`, `account_id`
  - `amount`, `mode`, `counts_to_budget`, `metadata`, `created_at`

## Next implementation steps

1. Import `schema.cashback-phase-next.api.json` to PocketBase.
2. Extend migration script to move `cashback_entries` data from Supabase.
3. In stats API, move to **snapshot-first** reads from `cashback_cycles` and only fallback recompute when stale.
4. Add background recompute job/trigger after transaction mutation for cycle snapshots.
