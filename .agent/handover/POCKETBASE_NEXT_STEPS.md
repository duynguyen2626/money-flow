# Handover Prompt for Next Agent

Copy and paste the following context to the next agent to continue the PocketBase migration:

---

## 🎯 Objective
Complete the database migration from Supabase to PocketBase and refactor the application to use the new backend.

## 📍 Current Status
- **Phase 1: Data Migration (Incomplete)**.
- **Problem**: The migration script `scripts/pocketbase/migrate.mjs` timed out during the cleanup phase (API deletion is slow).
- **Branch**: `feat/pocketbase-migration`
- **PR**: https://github.com/rei6688/money-flow/pull/249

## 📚 Essential Files
1. **Handover Guide**: `.agent/handover/POCKETBASE_MIGRATION_GUIDE.md` (Detailed context & mappings).
2. **Schema**: `scripts/pocketbase/schema.json` (The exact JSON to import into PocketBase v0.23).
3. **Script**: `scripts/pocketbase/migrate.mjs` (Robust mapping logic, including `persisted_cycle_tag` calculation).

## 🚀 Tasks for you:
1. **Import Schema**: Use `scripts/pocketbase/schema.json` to create the 8 collections in PocketBase Admin (`https://api-db.reiwarden.io.vn/_/`).
2. **Fix Migration Timeout**: Optimize `scripts/pocketbase/migrate.mjs`. Instead of deleting records one-by-one, consider dropping/re-creating collections or bypassing cleanup if the DB is fresh.
3. **Run Migration**: Execute `node scripts/pocketbase/migrate.mjs` and verify all records (People, Accounts, Transactions, etc.) are present.
4. **Refactor Code (Phase 2)**: 
   - Update `src/lib/supabase` or create `src/lib/pocketbase`.
   - Update services in `src/services/` to use PocketBase SDK.
   - Specifically fix `cashback.service.ts` metrics.

## 🔑 Credentials
Check `.env.local` for:
- `POCKETBASE_DB_EMAIL`
- `POCKETBASE_DB_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY`
---
