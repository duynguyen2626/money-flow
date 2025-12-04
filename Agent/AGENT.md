MILESTONE 3 - PHASE 1 (FINAL): INSTALLMENT WORKFLOW "MARK & PLAN"

Goal: Implement a streamlined Installment workflow: Mark transaction as installment -> Setup Plan later in a dedicated Dashboard.

1. Git Convention

Branch: feat/M3-P1-installment-workflow

Commit: [M3-P1] feat: ...

PART A: DATABASE SCHEMA

1. Update transactions Table

Task: Create migration supabase/migrations/20251206000000_add_installment_flag.sql.

-- Flag to mark a transaction as intended for installment
alter table transactions add column is_installment boolean default false;

-- (Ensure 'installments' table exists from previous plan, linking to transactions.id)


PART B: UI - TRANSACTION ENTRY (Capture Phase)

1. Add/Edit Transaction Dialog

File: src/components/moneyflow/add-transaction-dialog.tsx & transaction-form.tsx
Task: Add "Mark as Installment" Toggle.

Location: Tab "Expense" (and potentially "Lend").

UI: A simple Switch "Trả góp (Installment)?".

Logic:

If ON: Set form value is_installment = true.

Constraint: DO NOT show Term/Interest fields here. Keep the modal clean. We only flag it.

PART C: UI - INSTALLMENT DASHBOARD (Management Phase)

1. Page Structure

File: src/app/installments/page.tsx
Layout: Use Tabs component with 3 triggers:

Pending (Chờ thiết lập): Transactions marked as is_installment but NOT yet linked to an installment record.

Active (Đang góp): Records in installments table where status = 'active'.

Done (Xong): Records where status = 'completed'.

2. Tab "Pending" Logic

Data: Fetch transactions where is_installment = true. Check if they have a linked plan.

UI: Simple Table (Date, Content, Amount).

Action: Button "⚙️ Setup Plan".

Behavior: Opens CreateInstallmentDialog (pre-filled with Transaction Info).

On Save: Creates record in installments, links it to the transaction. The item moves from "Pending" to "Active".

3. Tab "Active" Logic (Main Tab)

Data: Fetch installments.

UI: Cards or Table showing Progress bars.

Action: "Pay Manual" or "Settle Early".

PART D: UI - TRANSACTION HISTORY (Linking)

1. Note Column Enhancement

File: src/components/moneyflow/transaction-table.tsx (Columns definition)
Task: Modify the "Note" column renderer.

Logic: If row.original.is_installment is true:

Render the text note.

Append a Link Icon (🔗 Link from Lucide).

Style: Small, muted color (blue/gray), clickable.

Tooltip: "Installment Plan Details".

Action: Navigate to /installments?id={planId} (or open detail modal).

4. Execution Plan

Step 1 (DB): Add is_installment column to transactions.

Step 2 (Capture): Add Toggle to Transaction Form.

Step 3 (Dashboard): Build the 3-Tab Layout for /installments.

Implement "Pending" list first.

Implement "Setup Plan" Modal.

Step 4 (Link): Add the 🔗 icon to Transaction Table.

Step 5 (Verify):

Create a transaction with "Installment = ON".

Go to /installments, see it in "Pending".

Click "Setup", create plan (6 months).

See it move to "Active".

👉 Acknowledge the "Mark & Plan" workflow and start with Step 1.