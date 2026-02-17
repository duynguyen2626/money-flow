# Handover: Phase 16 - Cashback Reboot & UI Stabilization (COMPLETED)

## 🎯 Phase Overview
Phase 16 focused on stabilizing the cashback logic across the entire application, ensuring data integrity for metrics (excluding initial balances/voids), and rebuilding the `TransactionSlideV2` cashback experience to be fully reactive.

## ✅ Key Achievements

### 1. MF16 Strict Integrity Logic
- **Exclusion Filters**: Implemented a unified exclusion logic across the Service Layer, Account Details, and Transaction Table.
- **Exclusion Keywords**: Transactions containing the following keywords in their `note` are automatically ignored for all rewards, caps, and profit metrics:
  - `Create Initial`
  - `Opening Balance` (Số dư đầu)
  - `Rollover`
- **Void Prevention**: All `void` status transactions are strictly excluded from totals.

### 2. Metric Refactor (Account Header)
- **Label Alignment**: Renamed metrics for improved clarity:
  - `Cycle Net` → **`Estimate Claim`**: Reflects the net profit for the current/selected cycle.
  - `Yearly Real` → **`Actual Reward`**: Reflects the total bank-back income received for the target year.
- **Value Correction**: Corrected `Actual Reward` to use the `cashbackTotal` summary field (income categorized as Cashback), fixing the 6M initial balance leak.

### 3. Reactive CashbackSection (Transaction Slide V2)
- **Real-time Recalculation**: The section now reacts instantly to `amount`, `source_account_id`, and `category_id` changes.
- **Policy Resolution**: Integrated `resolveCashbackPolicy` to determine the exact rate, cap, and tier metadata for the current transaction context.
- **Profit Analytics**: Added a detailed breakdown of `Bank Reward`, `Shared Amount`, and `Net Profit`.

### 4. Unified Transaction Table
- **Context-Aware Scaling**: Multi-flow columns (`actual_cashback`, `est_share`, `net_profit`) automatically show/hide based on the `accountType` (Credit Card only).
- **Strict Row UI**: Columns now correctly display `-` for excluded transactions (Income/Transfers/Initial).

## 🛠️ Implementation Details

### Exclusion Helper (Standard)
```typescript
const isExcluded = note.includes('create initial') || 
                   note.includes('số dư đầu') || 
                   note.includes('opening balance') || 
                   note.includes('rollover') || 
                   status === 'void';
```

### Essential Files
- `src/services/cashback.service.ts`: Core server-side aggregation and upsert logic.
- `src/components/transaction/slide-v2/single-mode/cashback-section.tsx`: The heart of the Slide-over cashback UI.
- `src/components/accounts/v2/AccountDetailHeaderV2.tsx`: Top-level metrics and year/cycle filters.
- `src/components/moneyflow/unified-transaction-table.tsx`: The primary ledger view with cashback columns.

## 🚀 Next Steps
1. **User Guide**: Educate the user on using the `Rollover` keyword to manually exclude transactions from cashback counters.
2. **Dashboard Integration**: Sync these stabilized metrics with the main Dashboard views.
3. **Admin Tools**: Consider adding a "Mark as Non-Cashback" flag to the database to replace keyword-based filtering in the future.

---
**Last Updated**: 2026-02-15
**Version**: 1.2 (Phase 16 Sync Complete)
