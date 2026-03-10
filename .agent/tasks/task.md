# Task: PocketBase ID Unification & 404 Fix (HANDOVER)

- [x] Identify root cause of 404/400 errors (Slug hashing & Invalid Expand)
- [x] Unify IDs in PocketBase service layer (Native IDs instead of hashed meta)
- [x] Add ID Resolution Helpers (`resolvePocketBaseAccountId`)
- [x] Fix mutations with PB IDs (Syncing back to Supabase)
- [x] Re-migrate foundation data for quality (Categories, Shops, People)
- [ ] Stabilize Transaction Listing (Persistent 400 error in some environments)
- [ ] Fix Accounts Page compilation (Type mismatches in stats/relationships)
- [ ] Unify ID system across remaining components (Avoid double-hashing `toPocketBaseId`)

Detailed instructions in `handover_pocketbase_fix.md`.
