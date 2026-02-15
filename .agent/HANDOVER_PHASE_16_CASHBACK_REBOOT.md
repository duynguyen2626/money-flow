# Handover: Phase 16 - Cashback Reboot & UI Stabilization

## 🚩 Current Situation (URGENT)
- **Transaction Slide V2 (Cashback Section)**: The cashback logic in the slide-over was found to be highly inaccurate and inconsistent with the new Database schema. It has been **TEMPORARILY REPLACED BY A PLACEHOLDER**.
- **Issue**: The previous logic (now removed) was incorrectly calculating rewards, failing to handle decimal vs percentage conversions (e.g., 0.5% vs 0.005), and not excluding non-earning transactions (Income, Transfers, Initial Balances).
- **Redesign Required**: The next agent must re-implement the `CashbackSection` from scratch using the new column-based schema (`cb_type`, `cb_base_rate`, `cb_rules_json`, etc.).

## 🛠️ Mandatory Research for Next Agent
1.  **Pull Branch**: `fix/categories-ui-optimization`
    - Read this branch to understand the intended **Cashback Display Logic** and **Transaction Hints (Tooltips)**.
    - This branch contains the "ideal" logic before it was mangled by the V2 migration.
2.  **Logic Reboot**:
    - Cashback fields MUST be **dynamic** and react to:
        - `amount`: Recalculate reward based on value.
        - `cycle`: Determine which budget/cap to apply.
        - `category`: Match against `cb_rules_json` for specific boosts.
        - `account`: Retrieve properties from the new columns first (`cb_*`).

## ✅ Recent Progress (V2 Stabilization)
1.  **Unified Transaction Table**:
    - Fixed `actual_cashback` column to exclude `Income`, `Transfer`, and `Create Initial` notes.
    - Standardized "Projected" vs "Actual" calculations using `normalizeCashbackConfig`.
    - Category Column Refactored: Now shows high-contrast `CATEGORY - Shop Name` hierarchy.
2.  **Account Detail Header**:
    - Fixed `Yearly Real` metric calculation. It now correctly represents total actual cashback received (income Categorized as Cashback).
    - Added "Collateral Linked" badge for secured accounts.
3.  **Account Management**:
    - Improved state reset in `AccountSlideV2` for new accounts to prevent state bleeding.
    - Restored missing `loadedLevels` logic.

## 📝 Roadmap for Phase 16
1.  **Re-implement CashbackSection** (in `TransactionSlideV2`):
    - Must show real-time "Potential Reward" based on account selection & category.
    - Must handle "Shared Cashback" overrides correctly.
    - Must be visually consistent with the main table's new "Vibe".
2.  **Sync Service**:
    - Ensure `cashback.service.ts` correctly updates both the `transactions` table AND the `transaction_cashback` table for consistency.

---
**Date**: 2026-02-15
**Updated by**: Antigravity (Phase 75 Context)
