# Sprint 5.1 Handover Context

## Rules for Next Agent
- **Fix Build First:** Priority #1.
- **Verification:** Do not mark as "Fixed" until auto-pick is verified in browser.
- **FIFO:** Follow `domain_logic.md` for cascaded repayments.

## Objective
Forcing `debt_account_id` (Receivable Account) auto-selection in the `TransactionForm.tsx` component when a person is selected in repayment/debt/transfer modes.

## Current State
- **Logic Implemented:**
    - `debtAccountByPerson` memo (lines 320-339) updated to search by `owner_id`.
    - `useEffect` for synchronization (lines 2470-2540) separated into:
        - Aggressive auto-pick (forces the value).
        - Fallback search (finds likely candidates).
        - Asynchronous "ensure" (creates if missing).
- **UI Implemented:**
    - Read-only display (badge) replaces the dropdown when an account is auto-linked.
    - "Change" button added to allow manual override.
- **Blocker:**
    - The build is failing with `Type error: Declaration or statement expected. d })` at `.next/dev/types/routes.d.ts:115:3`.
    - Because of the build failure, the latest UI changes haven't been verified in the browser.
    - The user reports "vẫn không tự pick" (still not auto-picking), likely due to the build failure or a subtle logic flaw that needs debugging once the build is fixed.

## Next Steps for the Next Agent
1. **Fix the Build:** Identify the source of the `d })` syntax error. It might be a stray character in `src/components/moneyflow/transaction-form.tsx` or a corrupted cache.
2. **Verify Auto-Pick:** Once the build is fixed, test if selecting "Ngọc" auto-fills the "Receivable - Ngọc" account.
3. **Debug Logic:** If it still doesn't auto-pick, check the console logs (lots of `[Form Sync]` logs were added) to see where it's failing.
