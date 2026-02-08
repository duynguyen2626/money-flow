# Prompt: Feature Plan - Bulk Actions & Excel Mode Upgrade

> **Purpose**: This prompt is for planning and creating a implementation walkthrough for the next phase focusing on Transactions Page enhancements.

---

## 📋 Prompt Template

Copy and paste the text below:

```markdown
I want to plan the implementation for **Transactions Page Enhancements**. This task has two main parts: **Bulk Selection Restoration** and **Excel Mode Upgrade**.

Please read the existing code in:
- `src/components/moneyflow/unified-transaction-table.tsx`
- `src/components/transactions/UnifiedTransactionsPage.tsx`
- `src/services/sheet.service.ts`

### Task 1: Bulk Select Restoration & Upgrade
- **Investigate**: Check why checkboxes might be hidden or unused in the current `UnifiedTransactionTable`.
- **Restoration**: Implement a "Master Checkbox" in the header to select/deselect all visible rows.
- **Visuals**: Show a floating `BulkActionToolbar` at the bottom when `selectedIds.size > 0`.
- **Actions**: Include "Delete Selected", "Void Selected", and "Export to Sheet".

### Task 2: Excel Mode Upgrade
- **Link Sheets**: Allow binding specific Google Sheet URLs to Accounts and People.
- **Selection Mode**: When "Excel Mode" is toggled:
  - Rows should highlight as Excel-style cells.
  - Ticking a row adds it to a "Sync Queue".
- **Dynamic Sync**: 
  - Add an "Open in Google Sheets" button.
  - Clicking this should:
    1. Send the selected rows' data to the `sheet.service.ts`.
    2. Refresh/Update the target sheet (using existing sync logic/webhooks).
    3. Open the sheet URL in a new tab.
- **Settings Management**:
  - Plan a new page/form in `/settings/sheets` to manage Sheet URLs, column mappings, and account bindings.

---

## 🚀 Requirement for your response:
1. Provide a **High-Level Implementation Plan** (not code yet).
2. Draft a **Implementation Walkthrough** (following Phase 75 style) in a new file `.agent/walkthrough/phase_76_txn_enhancements.md`.
3. Propose any **Database Schema changes** needed for "Sheet Settings" (e.g., a new `sheet_configs` table).

Do not modify any code yet. Just provide the plan and the walkthrough file.
```
