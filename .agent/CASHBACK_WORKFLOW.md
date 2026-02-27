# Cashback Workflow & Advanced Rules Guide

This document explains the core logic, data structures, and implementation patterns for the Cashback system in Money Flow 3.

---

## 🏗️ Architecture Overview

The cashback system is designed to handle complex, tiered reward structures from various banks. It operates on two main data sources:

1.  **Direct Columns** (`accounts` table): `cb_type`, `cb_base_rate`, `cb_max_budget`, etc.
2.  **JSON Config** (`cb_rules_json`): Detailed rules for category-specific rates and caps.

### Service Layer
- `src/services/cashback.service.ts`: Core calculation logic for spending stats.
- `src/lib/cashback.ts`: Normalization and parsing of inconsistent bank configs.

---

## 🧩 Config Structure (MF5.3)

The system uses a tiered structure called `levels`. Each level can have multiple `rules`.

```typescript
export type CashbackProgram = {
  defaultRate: number;        // decimal (e.g., 0.005 for 0.5%)
  maxBudget: number | null;   // Overall monthly cap
  cycleType: 'calendar_month' | 'statement_cycle';
  levels: CashbackLevel[];
};

export type CashbackLevel = {
  minTotalSpend: number;      // Threshold to unlock this tier
  maxReward: number | null;   // Cap for THIS tier's total rewards
  rules: CashbackCategoryRule[];
};

export type CashbackCategoryRule = {
  categoryIds: string[];      // Array of Category UUIDs
  rate: number;               // decimal (e.g., 0.1 for 10%)
  maxReward: number | null;   // Cap for THIS specific rule
};
```

---

## 💡 Advanced Rule Examples

### 1. Mb JCB Ultimate (Multi-Cap Constraint)
**Scenario**: 10% for Health & Education & Insurance. 
- Total monthly cap: 800k.
- Insurance sub-cap: 400k.

**Agent Context**: When users ask why Insurance "only" allows 400k when the total is 800k, explaining the hierarchy is key. The `maxBudget` is the global constraint. If Insurance hits 400k, the remaining 400k of the 800k budget is still available for Health/Edu.

### 2. Standard Chartered Smart (Min-Spend Threshold)
**Scenario**: No cashback unless total cycle spend is > 2M.
- `minSpendTarget`: 2,000,000.
- Calculation: `currentSpend < target ? 0 : amount * rate`.

### 3. Tiered Bonus (VIB Cash Back style)
**Scenario**: 
- Spend < 10M: 0.1% base.
- Spend >= 10M: 6% on selected cats, 0.1% base.
- Spend >= 50M: 10% on selected cats, 0.1% base.

**Implementation**: Defined via `levels` array where `minTotalSpend` values are `10000000` and `50000000` respectively.

---

## 🔄 Calculation Workflow

1.  **Normalize**: Standardize any source into `CashbackProgram` via `normalizeCashbackConfig`.
2.  **Range Determination**: Use `getCashbackCycleRange` (handles timezone-safe statement days).
3.  **Tier Selection**: Iterate through `levels` to find the highest unlocked level based on `sum(spent)`.
4.  **Rule Execution**: Match transaction `category_id` against level `rules`.
5.  **Multi-Level Capping**: Apply the tightest cap (Rule Cap vs Level Cap vs Global Cap).

---

## 🎨 UI & UX Patterns

### Credit Health Dashboard
- **Location**: `AccountDetailHeaderV2.tsx`.
- **Logic**: Calculates `available_limit` by subtracting `outstanding_balance` (absolute `current_balance`) from `credit_limit`.
- **Waiver Tracking**: Compares `yearExpensesTotal` against `annual_fee_waiver_target`.

---

## 🛠️ Maintenance for Agents

- **Category Badges**: Use visual indicators (Income/Expense/Lend) in selection lists to avoid user confusion during rule setup.
- **Pre-fill Context**: When creating a shop from a specific category slide, the category ID is passed to `ShopSlide` to ensure data consistency.
