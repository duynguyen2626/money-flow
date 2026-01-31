# Handover Document - Phase 10 Prep (January 31, 2026)

## Phase 9.5 Summary (Just Completed)
- Unified Flow column UI across /transactions, account details, and people details.
  - Type icon badge appears before entities (icon-only with tooltip).
  - Direction badges (FROM/TO) removed everywhere.
  - Detail pages single-flow rows centered; /transactions keeps left-aligned single-flow.
- Cycle badges now only show for `credit_card` accounts with `cashback_config`.
- Header column borders strengthened (Flow/BASE/Net/Category) to match table grid.

**Primary file updated:**
- [src/components/moneyflow/unified-transaction-table.tsx](src/components/moneyflow/unified-transaction-table.tsx)

**Doc/rules updated:**
- [.github/copilot-instructions.md](.github/copilot-instructions.md)
- [.agent/rules/ui_rules.md](.agent/rules/ui_rules.md)
- [.agent/README.md](.agent/README.md)
- [.agent/HANDOVER_PHASE_9.md](.agent/HANDOVER_PHASE_9.md)

## Build/Problems Check
- `get_errors` reports **no TypeScript errors** in workspace.
- No `TransactionsPageV2.tsx` file exists in repo; any Problems panel entries referencing it are stale.

## Phase 10 Plan (Accounts Page Enhancements)
### Goals
1. **Add MCC column** on Accounts page table.
2. **Annual fee waiver progress** based on card spend totals (with conditional rules).
3. **Category dropdown filter** for Accounts page.

### Implementation Notes
- **MCC column**
  - Likely sourced from transactions (or account-level metadata if available).
  - Add column in the Accounts table component (V2) and include in column config.
- **Annual fee waiver**
  - Compute “target met” for credit cards only.
  - Use spend totals per account within the defined cycle or annual window.
  - The rule should be configuration-driven (per account or per program) and avoid hardcoded thresholds.
- **Category filter**
  - Add dropdown to Accounts filters; filter by category or MCC.
  - Keep consistent with existing filter UI patterns (Shadcn UI + Tailwind).

### Suggested File Touchpoints
- Accounts page table component (V2) under `src/components/accounts/`.
- Column config/helpers for accounts table (if present in `transactions-v2/utils` or similar pattern).
- Services: `account.service.ts`, `transaction.service.ts` for spend aggregation.

### Verification Checklist
- MCC column renders correctly for all account types.
- Annual fee target badges computed correctly for credit cards (edge cases included).
- Category dropdown filters rows as expected.
- Run `pnpm build` and `pnpm lint` before commit.

---
**Handover Date**: January 31, 2026
**Phase**: 10 (Prep)
**Status**: Ready for implementation
