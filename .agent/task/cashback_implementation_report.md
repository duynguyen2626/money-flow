# REPORT: CASHBACK ENGINE IMPLEMENTATION (MF5.2)

## 1. Summary of Implementation
We have successfully implemented the core **Cashback Engine** following the MF5.2 requirements.

### Data & Types
- **New Types**: Added `CashbackMode` (`none_back`, 'real_fixed', 'real_percent', 'voluntary'), `CashbackEntry`, and `CashbackCycle`.
- **Database Alignment**: Verified `transactions` table integration with `cashback_entries` and resolved type mismatches in `FlatTransactionRow`.

### Core Features
- **Virtual Profit (None-back)**: Logic to create `virtual` entries for transactions that don't receive direct cashback (e.g., Lends/Expenses) to track "potential" profit.
- **Real Cashback**: Standard cashback (Fixed or Percent) that counts directly towards the cycle's budget.
- **Voluntary/Overflow**: Logic to handle cashback that exceeds the budget or is manually flagged as arbitrary/voluntary (does not consume budget).

### Integration Points
- **Create Transaction**: Automatically triggers `upsertTransactionCashback` to calculate and record entries.
- **Update Transaction**: Added logic to recalculate cashback when a transaction is edited (amount, mode, or type changes).
- **Delete Transaction**: Automatically removes associated cashback entries and triggers a cycle re-computation.

---

## 2. Key Logic Enhancements (TypeScript Engine)
We replaced the legacy SQL/RPC approach with a deterministic **TypeScript Recomputation Engine** mechanism (`recomputeCashbackCycle` in `cashback.service.ts`).

### Logic Flow: "Real First, Cap Virtual"
1. **Aggregation**: The engine sums up all entries for a cycle into three buckets: `Real Total`, `Virtual Raw`, and `Voluntary Total`.
2. **Budget Capping**:
   - `Cap Available` = `Max Budget` - `Real Total`. (Real cashback eats the budget first).
3. **Virtual Effective Calculation**:
   - `Virtual Effective` = `Min(Virtual Raw, Cap Available)`.
   - *Result*: Virtual profit effectively "shrinks" if Real cashback increases, preventing the total from exceeding the Max Budget.
4. **Overflow & Loss Tracking**:
   - `Overflow Loss` is explicitly calculated as: `Voluntary + (Virtual Raw - Virtual Effective) + (Real Overflow)`.
   - This provides clear visibility into how much potential value was "lost" due to budget constraints.

### Stability
- **Build Verification**: All type errors were resolved (including `CreateTransactionInput` mismatches), and `npm run build` passed successfully.
- **Atomic Updates**: Cycle stats (`real_awarded`, `virtual_profit`, `overflow_loss`, `is_exhausted`) are updated atomically after every transaction change.
