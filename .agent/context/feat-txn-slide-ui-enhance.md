# Handover — feat/txn-slide-ui-enhance (2026-03-13)

## Prep Work
- Reviewed `<BankSelectionLanding>` entry in `src/app/batch/page.tsx` to understand how the landing page wires bank selection and navigation before diving into transaction slide tweaks.
- Read `src/components/services/services-page-content.tsx` to capture how service tabs and transaction tables are structured (including `ServiceTransactionsTable` usage) before updating Notes/Flow interactions.

## Implemented (This Branch)
### 1) Transaction Slide V2 (single mode)
- `src/components/transaction/slide-v2/single-mode/amount-section.tsx`
  - Service fee input is no longer always visible.
  - New `Add Fee` control toggles the fee field, and `X` removes fee cleanly (no overlapping clear button).
  - Total display is always present and highlights when fee > 0.
- `src/components/transaction/slide-v2/transaction-slide-v2.tsx`
  - Note marker changed from `#Fee=...` to `(principal | Fee: fee)` on submit.
  - Existing fee markers (`#Fee=...` or the new `( ... | Fee: ... )`) are stripped before inserting the latest marker.
  - Account edit flow: selecting edit from account selector opens `AccountSlideV2` with `zIndex={900}` so it renders above the txn slide.
- `src/components/transaction/slide-v2/single-mode/account-selector.tsx`
  - Adds a sub-row under `Pay With` / `Deposit To` showing badge-like icon buttons:
    - `Pencil` → edit selected account (opens account slide).
    - `Database` → open PocketBase admin filtered to the selected account ID (new tab).

### 2) Fix `/accounts/[id]` Flow → People Link (PocketBase route)
- Root cause: PocketBase account detail mapping was prioritizing `expandedPerson.slug` (Supabase UUID) into `txn.person_id`, so unified table generated `/people/<uuid>`.
- Fix:
  - `src/services/pocketbase/account-details.service.ts` now includes `person_pocketbase_id`.
  - `src/components/moneyflow/unified-transaction-table.tsx` prefers `txn.person_pocketbase_id` for person resolution + route building.

### 3) Google Sheets Sync Review
- Reviewed `src/services/sheet.service.ts` + `integrations/google-sheets/people-sync/Code.js`.
- `toPocketBaseId()` is idempotent for PB IDs, so sheet sync functions accept either PB IDs or legacy UUIDs safely.
- No `Code.js` header changes needed for this branch.

## Next Steps
- Run `npm run lint` and `npm run build` on this branch and note results here.
- Manually sanity-check:
  - Add txn with fee: UI, total, note marker formatting.
  - Account selector sub-row: edit account slide stacking + PB admin link.
  - `/accounts/[id]` Flow: People links open `/people/<pocketbaseId>` (not UUID).

## Test Notes
- `npm run lint`: fails (repo-wide lint includes `Archive/` + `.archive/` and many deprecated files).
- `npm run build`: success.
  - Warnings: `baseline-browser-mapping` outdated data; Next `middleware` deprecation warning.
  - Log noise during SSG: `/batch` uses `cookies` so it cannot be statically rendered; build still completes (route remains dynamic).
