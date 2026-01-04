# Scope 4.2 Context: Consolidated Debt Repayment

## The Problem
Users often accumulate debt over multiple months (e.g., T9: -2M, T11: -1M).
When repaying in T12, they prefer to make ONE transaction (e.g., +3M).
Currently, they must split this into two transactions (T9: +2M, T11: +1M) to make the "Cycle Tabs" show as settled. This is tedious.

## The Goal
Allow a single transaction in T12 (+3M) to settle T9 and T11 automatically.

## The Logic: Surplus Cascading (Dòng chảy số dư)
Since we aggregate debt by `tag` (Time Cycles), we can implement this purely in the **Read Layer** (`getDebtByTags` in `debt.service.ts`).

1. **Aggregation**: Calculate Net Balance for all tags as usual.
2. **Identification**:
   - `Surplus Pool`: Tags where `Net > 0` (e.g., T12 Repayment of 3M vs Debt 0M -> Surplus +3M).
   - `Deficit Pool`: Tags where `Net < 0` (e.g., T9: -2M, T11: -1M).
3. **Cascading**:
   - Sort Deficit Pool by Date (Oldest First).
   - Iterate through Surplus Pool.
   - For each Surplus, "apply" it to simple Deficits.
   - If Surplus >= Deficit:
     - Deficit becomes 0 (Settled).
     - Surplus decreases by Deficit amount.
     - Mark Deficit UI as "Settled via [SurplusTag]".
   - If Surplus < Deficit:
     - Deficit reduces by Surplus.
     - Surplus becomes 0.
     - Continue to next Surplus (if any).

## UI Implications
- The DATABASE remains unchanged. Records are still physically in T12.
- The UI (Debt List) "pretends" the money moved backwards in time to settle items.
- Visuals: T9 should show "Settled" status with a tooltip/icon explaining "Paid via T12".
