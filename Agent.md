AGENT TASK: RESTORE CASHBACK UI & FIX BUGS

Context:
The Cashback Details Page (/cashback/[id]) is broken after recent refactors.

Data Issue: Categories show "Uncategorized". Back Amount columns are missing formulas/subtext.

Edit Bug: Editing a Cashback transaction opens "Transfer" tab instead of "Expense/Income".

Visual Bug: Icons are missing (Money Transfer has 'M' instead of image). Copy icons are gone.

Objective:

Fix UnifiedTransactionTable logic for Cashback context.

Restore "Profit/Formula" display in columns.

Fix Edit Tab detection.

1. Backend: Fix getUnifiedTransactions for Cashback

Target: src/services/transaction.service.ts

A. Category & Shop Mapping

Ensure category_name, category_icon, category_img are correctly joined and returned.

Debug: If category_id is present in DB but shows "Uncategorized", the join logic is failing.

B. Cashback Calculations

Ensure cashback_share_percent and cashback_share_fixed are returned.

Calculate on Backend (Optional) or Frontend:

initial_back: The bank's cashback amount (Calculated via CashbackService).

profit: initial_back - (share_percent * amount + share_fixed).

2. Frontend: UnifiedTransactionTable Updates

A. Restore Cashback Columns (The "Formula" Look)

Initial Back:

Display: [Bank Back Amount] (Bold).

1. **Frontend:** Update AccountCard math logic.  
2. **Frontend:** Polish UnifiedTransactionTable columns (Notes, Time).  
3. **Frontend:** Fix TransactionForm to save full datetime.  
4. **Integration:** Ensure /people page refreshes on actions.
Subtext: [Rate]% * [Amount] (Gray, small).

People Back:

Display: [Share Amount] (Red/Orange).

Subtext: [Percent]% + [Fixed] (Gray).

Profit:

Display: [Profit Amount] (Green/Red).

Subtext: "Net" (Gray).

B. Fix Copy Icon

Re-implement the "Copy" ghost button in Note/ID/Status columns.

Ensure lucide-react icons are imported correctly.

3. Frontend: Fix Edit Logic (TransactionForm)

Logic:

If initialData.category is "Cashback" or "Income" -> Tab = income.

If initialData.category is "Money Transfer" -> Tab = transfer.

Fix: Ensure the useEffect in Form correctly identifies the type from initialData.

4. Execution Steps

Service: Debug the Category Join query.

Table: Implement the complex Cell Renderers for Cashback columns.

Form: Fix the Tab switching logic.

Verify: Run build.
