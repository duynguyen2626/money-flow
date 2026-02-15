# Handover: Phase 16 - Cashback Reboot & Logic Stabilization

## 🚩 Current Situation (URGENT)

### 1. Transaction Slide V2 (Edit/Add)
- **Status**: The the cashback section in `src/components/transaction/slide-v2/single-mode/cashback-section.tsx` is currently a **Stale/Flawed implementation**.
- **Requirement**: Must be completely rebooted to be **Dynamic**. Rewards must recalculate in real-time when `amount`, `category_id`, or `source_account_id` change.

### 2. Account Details Header (Analytics)
- **Status**: Visual metrics in `AccountDetailHeaderV2.tsx` are currently **INACCURATE** and showing illogical values (e.g., -5.8M or 6.1M when no transactions exist).
- **Renaming Required**:
    - `Cycle Net` → **`Estimate Claim`**: Represents projected cashback to be received for current cycle spending.
    - `Yearly Real` → **`Actual Reward`**: Represents true received cashback (income categorized as cashback).
- **Logic Bugs**:
    - **Spent Amount**: Currently incorrectly includes "Rollover" notes and "Create" categories (e.g., "Create Initial", "Opening Balance").
    - **Exclusion Rule**: MUST strictly exclude Categories starting with "Create" and Notes containing "Rollover".
    - **Void Status**: Voided transactions must be excluded from all calculations.

## 🛠️ Mandatory Research for Next Agent
1.  **Pull Research Branch**: `fix/cashback-ui-and-logic-v2`
    - **CRITICAL**: This branch contains the original UI sections as shown in the project's design goals (Cycle Spent, Match Policy, Bank Rate, Shared progress, etc.).
    - Pull this branch to understand the intended visual components and hint tooltips.
2.  **Logic Reference**:
    - Use `resolveCashbackPolicy()` service for rate resolution.
    - Ensure decimal (0.005) vs percentage (0.5%) conversions are handled via `normalizeCashbackConfig`.

## ✅ Current Stabilization (Table & Category)
- **Unified Transaction Table**: `actual_cashback` column is stabilized with initial exclusion logic.
- **Category Column**: Unified to `Category Name - Shop Name` hierarchy.

---
**Date**: 2026-02-15
**Updated by**: Antigravity (Phase 75 Context)
