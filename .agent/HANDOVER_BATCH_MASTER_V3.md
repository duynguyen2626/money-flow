# Handover: Batch Master Template V3 (Recurring Checklist)

## 🎯 Status: Phase 1 & 2 COMPLETED
The "Recurring Checklist" model is now fully functional. Users can configure globally recurring items and manage them via a 12-month grid with high-speed amount entry.

### 🏗️ Technical Implementation

1.  **Database**:
    *   `batch_master_items`: New table for recurring targets. Includes `cutoff_period`, `receiver_name`, `bank_number`, `bank_name`, `target_account_id`.
    *   `batch_items`: Added `master_item_id` (UUID) to link row data to the master template.
2.  **Services/Actions**:
    *   `batch-master.service.ts`: Core CRUD for master items.
    *   `batch-checklist.actions.ts`: Optimized `getChecklistDataAction` to fetch both master items and existing batch items for a 12-month period in one call.
    *   `batch-speed.actions.ts`: `upsertBatchItemAmountAction` handles high-speed amount updates. It automatically creates the necessary `batches` row (Early/Late) if it doesn't exist yet for the given month.
3.  **UI Components**:
    *   `BatchMasterManager`: Admin UI in Settings to manage the Recurring Lists for MBB/VIB.
    *   `BatchMasterChecklist`: The new primary interface for Batch Processing. Features a 12-month sub-navigation and Phase 1/Phase 2 goal tracking.
    *   `ChecklistItemRow`: High-speed entry row with auto-saving on `onBlur`.

### 🚀 Usage Instructions

1.  **Setup**: Go to **Batch Settings** -> **Master Checklist**. Add your recurring bank targets (e.g., Rent, Utilities, Subscriptions). Assign them to "Before Cutoff" (1st-15th) or "After Cutoff" (16th-End).
2.  **Entry**: Go back to the MBB/VIB page. You will see 12 tabs for the year.
3.  **Speed Fill**: Just type the amount into the input field for any month. The system will instantly create the batch and item in the background.
4.  **Sync**: Use the "Send to Sheet" button at the bottom of each period section to sync the entire group to Google Sheets.

### 🛠️ Next Steps / TODOs

- [ ] **Batch Funding**: Wire the "Fund Group" button in `BatchMasterChecklist` to the existing transactional funding logic.
- [ ] **Confirmation Flow**: Add a "Confirm All" or "Mark as Paid" bulk action for a period group.
- [ ] **Installment Integration**: Automatically pull active installments into the checklist if they match the account.
- [ ] **Archive Clean-up**: Some logic in `BatchPageClientV2` for manual "Clone Month" is now secondary/obsolete for MBB/VIB but remains for legacy compatibility.

---
*Created by Antigravity - Feb 2026*
