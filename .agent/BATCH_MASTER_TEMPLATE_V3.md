# Money Flow 3 - Batch Master Template V3 Plan

This plan outlines the refactoring of the Batch Processing system from a manual "Clone & Add" model to a "Recurring Checklist" model.

## 🎯 Objectives
- **Standardization**: Create a global "Master Bank List" (Recurring Items) managed in Settings.
- **Automation**: Auto-populate 12 months of the year with the Master List.
- **Efficiency**: "Speed Entry" mode — just fill in amounts, no need to manually add or clone items monthly.
- **Organization**: Clear separation of "Before Cutoff" and "After Cutoff" targets.

---

## 🏗️ Technical Architecture

### 1. Database Schema (`batch_master_items`)
A new table to store recurring payment targets.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `bank_type` | TEXT | 'MBB' \| 'VIB' |
| `receiver_name` | TEXT | Recipient Name |
| `bank_number` | TEXT | Recipient Account No |
| `bank_name` | TEXT | Bank Short Name / Code |
| `target_account_id`| UUID | Ref to `accounts` (Internal reconciliation) |
| `cutoff_period` | TEXT | 'before' (1-15) \| 'after' (16-END) |
| `sort_order` | INT | UI display order |
| `is_active` | BOOL | Toggle for seasonal items |
| `category_id` | UUID | Default category (Optional) |

### 2. Service Layer Updates
- **`batch.service.ts`**:
    - `getBatchMasterItems(bankType)`: Fetch the master template.
    - `syncBatchFromMaster(monthYear, period, bankType)`: Ensure a batch exists for the month/period and is pre-filled with items from the master list (at amount 0).
    - `updateBatchItemAmount(itemId, amount)`: Optimized for real-time input saving.

### 3. Server Actions
- `upsertBatchMasterItemAction`: CRU for the master list.
- `quickUpdateAmountAction`: Debounced action for the Speed Entry inputs.

---

## 🎨 UI/UX Design (V3)

### A. Global Master Settings
- In **Batch Settings**, add a "Master Item Manager".
- User can add/edit/delete recurring bank targets here once.
- *Visual*: Clean list with drag-and-drop sorting.

### B. 12-Month Matrix View
- Main page `/batch/[mbb|vib]` shows 12 sub-tabs (Jan to Dec).
- The "Add Month" button is gone. All months are accessible.
- Statistics at top: "Year Total", "Month Progress".

### C. Speed Entry Interface (The Checklist)
- Under each month, two sections: **BEFORE CUTOFF** and **AFTER CUTOFF**.
- Content:
    - **Bank Info**: Rounded-none icon + Short Name.
    - **Target**: Internal Account Badge (e.g., "VIB Super Card").
    - **Amount Input**: High-contrast, large text input.
    - **Status Indicator**: 🟢 Paid \| ⚪ Empty \| 🟡 Draft.
- **Action Float Bar**: Shown at the bottom of the active period, contains "Step 1: Fund" and "Step 2: Send to Sheet".

---

## 📅 Implementation Roadmap

### Phase 1: Database & Master Management
1.  [ ] Apply SQL Migration for `batch_master_items`.
2.  [ ] Build the Master Item Editor in Batch Settings.

### Phase 2: Calendar Engine
1.  [ ] Update `BatchPageClientV2` to support 12-month fixed tabs.
2.  [ ] Implement logic to "Ensure Batch" on the fly when amount is entered.

### Phase 3: Speed Entry UI
1.  [ ] Build the new Checklist Row component.
2.  [ ] Implement debounced auto-save for Amounts.
3.  [ ] Redesign the Footer Actions (Fund/Send).

### Phase 4: Cleanup
1.  [ ] Remove legacy "Clone Batch" and "Add Month" dialogs.
2.  [ ] Migrate existing items (optional recommendation).

---

## ✅ Deliverables
- [ ] Centralized recurring item management.
- [ ] No-clone workflow.
- [ ] Visual indication of "Missing Reimbursements" for the month.
- [ ] High-speed amount filling.
