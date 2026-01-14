# Handover Note - Jan 14, 2026

## Critical Context

### 2. Repo Structure (New)
- `database/schema.sql`: Main database schema.
- `database/migrations/`: Archived migrations.
- `.agent/`:
    - `logs/`: Bug reports & error logs.
    - `task/`: Task documentation.
    - `rules/`: Project rules (`rules.md`).
- `integrations/`:
    - `google-sheets/`: Google Apps Scripts (People Sync, Batch Import).

## Application Status
### 1. Reverted Feature: Volunteer Cashback
A feature to track "Volunteer" cashback (for debt accounts) was attempted but fully reverted.
- **Goal**: Allow flagging debt transactions as "Voluntary" to count towards cashback.
- **Problem**: The logic for `cashback_mode` and filtering debt accounts in the Cashback Dashboard proved inconsistent and cluttered the UI with empty debt accounts.
- **Status**: 
    - UI Controls removed from `CashbackDashboardV2`.
    - Backend logic in `cashback.service.ts` reverted to ONLY fetch `credit_card` accounts.
    - **Do not attempt to restore this without a complete redesign of the requirement.**

### 2. UI Refinements (People & Metrics)
- **People Details**: V2 UI is live with a horizontal metrics bar.
- **Formulas**: 
    - `Net Lend` display now includes `Original - Cashback` subtitle.
    - `Remains` is calculated as `Net Lend - Repay`.
- **Navigation**: Eye icon in People Directory links to `/people/[id]/details`.
- **Void Logic**: Voiding a transaction now recursively voids linked parent/child transactions (cascading void).

## Pending/Next Tasks
- Verify `pnpm push sheet people` script functionality.
- Continue monitoring Void cascading logic for edge cases.

## Environment & Scripts
- **Push Sheet**: Use `pnpm push sheet people` to deploy Google Apps Script changes for the People Sheet.
