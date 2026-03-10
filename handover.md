# 🔴 UPDATE 2026-03-10: Transactions Backfill Failed (Needs Full Remigration)

## Current Incident
- Backfill run result: `Total processed: 307`, `Updated: 0`, `Errors: 307`.
- Error pattern: `PB transaction not found for SB id ...` on every record.

## Confirmed Cause
- Old script assumed deterministic transaction id mapping (SB UUID → PB hashed id).
- Current PB transactions dataset does not match this identity path.
- Consequence: lookup-by-derived-id always misses.

## Required Next Move (Do not patch blind)
1. Freeze writes.
2. Backup current PB transaction/cashback collections.
3. Drop and recreate PB `transactions` schema with all required business fields.
4. Re-migrate from SB using `metadata.source_id` as canonical transaction identity.
5. Resolve relation fields to live PB IDs before insert/update.
6. Validate `/accounts/[id]` + `/people/[id]` detail flows and cashback calculations.

## Implemented Command Path (2026-03-10)
- Script implemented: `scripts/pocketbase/remigrate-transactions-sourceid-safe.mjs`
- Execute remigration with collection recreate:
    - `node scripts/pocketbase/remigrate-transactions-sourceid-safe.mjs --recreate-collection --reset --apply`
- Then run a validation dry pass:
    - `node scripts/pocketbase/remigrate-transactions-sourceid-safe.mjs --reset --limit=100`

## Non-Negotiable Fields In New `transactions`
- Core: `date`, `occurred_at`, `amount`, `final_price`, `type`, `status`, `note`
- Relations: `account_id`, `to_account_id`, `category_id`, `shop_id`, `person_id`, `parent_transaction_id`
- Cashback/Cycle: `persisted_cycle_tag`, `debt_cycle_tag`, `cashback_share_percent`, `cashback_share_fixed`, `cashback_mode`, `cashback_amount`
- Metadata: `metadata.source_id` (SB UUID)

## Task B
- Task B (clear-all dropdown) remains pending and is paused until remigration is stable.

# 🎯 HANDOVER: Phase 12.1 - Transaction Table Flow Column Critical Issues

**Date:** Feb 2, 2026  
**Status:** ⚠️ STOPPED - 4 Failed Attempts  
**Issues:** 3 Critical UI bugs remain unfixed  

---

## 📌 For Next Agent

👉 **[READ START_HERE.md](START_HERE.md) FIRST** - It has the onboarding prompt and checklist

Then read:
- [.github/copilot-instructions.md](.github/copilot-instructions.md) - Design rules & architecture
- [HANDOVER_CRITICAL.md](HANDOVER_CRITICAL.md) - Detailed issue analysis + debug checklist

---

## Quick Problem Summary

**File:** `src/components/moneyflow/unified-transaction-table.tsx` (lines 2079-2250)

| Issue | Symptom | Root Cause |
|-------|---------|-----------|
| **#1: Too Long** | Single flow pills wider than dual flow | `flex-1` vs `max-w-[44%]` |
| **#2: Uneven Height** | Some pills cut off or misaligned | h-7, h-9, h-10 mixed in different paths |
| **#3: Edit Dialog** | Warning can be dismissed without confirmation | `hasUnsavedChanges` state not working |

---

## Previous Attempts (Why They Failed)

1. **Height alignment** → Partial changes (multiple matches)
2. **Complex refactor** → Only showed people, not accounts
3. **Badge removal** → Pills still uneven, accounts missing  
4. **Clean rewrite** → Logic `!hasTarget` wrong, filtered accounts

---

## What to Do

❌ **DO NOT CODE YET**

✅ **DO THIS FIRST:**
1. Read START_HERE.md
2. Add console.log to understand transaction data
3. Trace which rendering path executes
4. Identify condition logic bug
5. Then fix (focused, not mega-rewrite)

---

## Success Criteria

- [ ] Pills same width (single = dual)
- [ ] Consistent height (h-9 everywhere)
- [ ] Accounts AND people display
- [ ] Edit warning blocks interaction
- [ ] Avatar rounding: person=circle, account=square


---

# Handover: Transaction Table Flow Column Fix

**Date:** Feb 2, 2026  
**Status:** ⚠️ CRITICAL - Multiple Failed Attempts, Root Cause Unclear  
**Attempted By:** GitHub Copilot (Messages 1-19)  
**Next Agent:** Please focus on ROOT CAUSE analysis before coding

## Summary
We have successfully refactored the Transaction Table (`TransactionRow.tsx`) to use a **Fixed-Width CSS Grid Layout**. This resolves critical issues with column alignment, overlapping badges, and layout shifts.

## Update (Jan 26, 2026)
- Unified Flow rendering in `UnifiedTransactionTable`:
    - People debt badge order: [tag][name][avatar]
    - Badges align left; name aligns right in target entity
    - Refund flow badges restored with text
    - From/To badges darker in account/person detail views + hint text added under table for account details
- Cycle badge format updated to `dd-MM~dd-MM` and consistent size
- Calendar-month cycle now renders range (no blank)
- Account details context fix: `AccountContentWrapper` no longer depends on context provider

## Key Changes
1.  **Grid Layout**: Encapsulated in `ui_standards.md`. Flow column is now fixed at `480px`.
2.  **Image Rendering**:
    *   **Shop Icons**: `rounded-md` (Square).
    *   **Person Avatars**: `rounded-full` (Circle).
    *   **Account Images**: Original aspect ratio.
3.  **Badges**: Standardized to `24px` height, removed duplicates.

## Documentation
*   [UI Standards](.agent/context/ui_standards.md): **READ THIS FIRST**. It contains the strict rules for the grid and images.
*   [Gravity Rules](.agent/rules/gravityrules.md): (Note: might need manual update if agent failed to write) Contains the compliance rules.

## Next Steps for Next Agent
1.  **Mobile Responsiveness**: The current fix targets Desktop (Grid). Mobile view (`block` layout) was touched but needs verification.
2.  **Other Tables**: Check `PeopleDetails` and `AccountDetails` tables. They likely share Similar components but might not be using the new strict Grid yet.
3.  **Legacy Code**: Continue removing any V1/V2 legacy components not in use.

---

## Agent Prompt (Copy & Paste to Next Agent)

```md
@workspace We are continuing the "Transaction Layout Refactor".
The previous agent established a STRICT Fixed-Width Grid Layout for the main Transaction Table and fixed Image Rendering rules.

Your Logic State:
1. READ `.agent/context/ui_standards.md` immediately. This is the Source of Truth.
2. CHECK `src/components/transactions/TransactionRow.tsx` to understand the reference implementation.
3. TASK:
   - Verify Mobile Layout of Transaction Row (ensure it doesn't break).
   - Audit `src/components/people/v2/SimpleTransactionTable.tsx` (or equivalent) and apply the same Image Rendering Rules (Shop=Square, Person=Circle).
   - Do NOT break the Desktop Grid Layout (7 columns).

Rules:
- Person Avatars MUST be `rounded-full`.
- Shop Icons MUST be `rounded-md`.
- No currency symbols in amounts.
```
