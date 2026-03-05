# PocketBase Migration Handover (2026-03-05)

## 1) Scope & Goal
- Consolidate Money Flow runtime from mixed Supabase/PocketBase toward PocketBase-first service layer.
- Keep transaction integrity, cashback logic, cycle correctness, and People/Sheets sync behavior unchanged from business perspective.
- Reduce lag on account details/cycle loading while preserving V2 UI behavior.

## 2) Migration Strategy
1. Build PocketBase infra/service abstractions.
2. Rewire read-heavy routes/pages first (account details + cashback analytics).
3. Keep mutation integrity on existing flows, then migrate in controlled slices.
4. Re-migrate PocketBase collections where schema split is required.
5. Validate with targeted smoke checks and regression checks.

## 3) What has been completed

### 3.1 PocketBase service layer (new)
- `src/services/pocketbase/server.ts`
  - PB auth/token cache.
  - Common request/list/get helpers.
  - deterministic `toPocketBaseId` mapping.
- `src/services/pocketbase/account-details.service.ts`
  - PB mappers for account/category/person/shop/transactions.
  - `getPocketBaseAccountDetails`, `getPocketBaseAccounts`.
  - snapshot stats helper + cycle options + cycle transactions.
- `src/services/pocketbase/cashback-performance.service.ts`
  - PB cashback yearly analytics + progress helpers.

### 3.2 Route/page rewiring to PB
- `src/app/accounts/[id]/page.tsx`
  - switched account details data loading to PB services.
- `src/app/cashback/page.tsx`
  - switched cashback performance loading to PB services.
- `src/actions/cashback.actions.ts`
  - cycle options/transactions to PB account-details helpers.
- `src/app/api/cashback/stats/route.ts`
  - snapshot stats path using PB helper.

### 3.3 Supabase trace cleanup on account detail path
- `src/components/accounts/v2/AccountDetailViewV2.tsx`
  - removed Supabase realtime channel usage.
  - replaced with lightweight periodic refresh polling.

### 3.4 Accounts re-migration (split cashback fields)
- `scripts/pocketbase/migrate.mjs`
  - added split mapping from `cashback_config` into dedicated columns:
    - `cb_type`, `cb_base_rate`, `cb_max_budget`, `cb_is_unlimited`, `cb_rules_json`, `cb_min_spend`, `cb_cycle_type`.
  - preserved legacy JSON + extra account fields.
- Re-migration executed:
  - `--phase=accounts --cleanup=phase`
  - result: deleted 93, created 93.

### 3.5 People/Google Sheets fixes (separate sheet-sync branch work, now ready to merge)
- `src/services/sheet.service.ts`
  - fixed `syncAllTransactions()` to exclude `#nosync/#deprecated` rows (root cause of “Sync all still pushes nosync”).
  - unified exclusion logic for single/cycle/all sync paths.
- `src/components/people/v2/people-directory-v2.tsx`
  - added `router.refresh()` after sync-all and per-person sync.
- `src/components/people/sheet-sync-controls.tsx`
  - added `router.refresh()` after sync-all.
- `integrations/google-sheets/people-sync/Code.js`
  - added `shouldExcludeFromSheet` guard in Apps Script sync handlers.
  - changed conditional formatting scope to Type column only (`B2:B1000`) instead of full row range.
  - version note bumped to 7.9.

## 4) Current issues to watch (People & Sheet)
1. Auth/permission confusion on `clasp push` can still happen if script ownership/sharing differs from logged account.
2. Existing old conditional-format rules in some sheets may remain from legacy tabs; script now replaces legacy type-row rules, but old manual custom rules can still coexist.
3. Runtime has mixed backend in non-migrated areas (sheet data currently still reads Supabase service client).
4. Local workspace has heavy `.next/dev/*` tracked changes during dev sessions.

## 5) Pending migration tasks for next Agent
1. Move remaining account details dependent reads/mutations still touching Supabase into PB-safe equivalents where required.
2. Migrate People sheet data source from Supabase to PocketBase (with deterministic ID resolution, owner-account mapping parity).
3. Add explicit PB fallback/error UX around sheet sync actions to avoid silent mismatch.
4. Validate end-to-end authenticated smoke for:
   - `/accounts/[id]`, `/cashback`, `/people/[id]`.
5. Reduce noisy generated artifacts from commit surface (especially `.next/dev/*`) via cleanup policy if team agrees.

## 6) Suggested verification checklist
- Account details page opens with correct stats/cycle values.
- Cashback page numbers match expected cycle snapshots.
- `Sync all` does not send rows with `#nosync`.
- On sheet, `Type=Out` highlights only Type column (B), not full row.
- Accounts PB collection has split cashback fields populated.

## 7) Branching note
- This handover expects a single working branch after merge: `feat/pocketbase-migration`.
- Temporary sheet-sync branch can be deleted after merge.
