# **AGENT TASK: HARDEN LOGIC & UNIFY TRANSACTION UI**

**Context:**

1. **Critical Bug:** Editing a "Repayment" transaction wrongly opens the "Lending" tab.  
2. **UX Bug:** "Source" column shows "Debt Account" instead of the actual "Bank Account".  
3. **Visual Bug:** Shopping transactions appear Green (Income) instead of Red (Expense).  
4. **Feature:** Void Filter (Tabs), Bulk Void, Split Columns (Tag/People).

Objective:  
Fix the Edit Logic, Smart Source Display, and Unify the Table UI across all pages.

## **1\. Backend: Smart Transaction Fetching (src/services/transaction.service.ts)**

**Update getTransactions / getAccountTransactions:**

**A. Smart Source Logic**

* When fetching a transaction, identify the "Counterpart Account".  
* *Logic:*  
  * If viewing from Account A: Find line with Account B.  
  * If Account A is Debt: Return Account B (Bank) name as source\_name.  
  * If Account A is Bank: Return Account B (Shop/Category/Debt) name.

**B. Fix Display Amount/Type**

* Ensure Expense transactions always have negative display\_amount.  
* Ensure Repayment transactions are identified correctly.

## **2\. Frontend: Fix TransactionForm Init Logic (src/components/moneyflow/transaction-form.tsx)**

**Action:** Update useEffect when initialData changes.

**Logic:**

* **Detect Tab:**  
  * If initialData.type \=== 'expense': Tab \= expense.  
  * If initialData.type \=== 'income': Tab \= income.  
  * **Debt Detection:**  
    * If initialData.category \== "Thu nợ" OR initialData.type \== 'income' (with Debt context): Tab \= **debt\_repayment**.  
    * Else if Debt Context: Tab \= **debt\_lending**.  
* **Map Accounts:**  
  * If debt\_repayment: Source \= Debt Account, Dest \= Bank Account. (Swap them visually so user sees Bank as "Received To").

## **3\. Frontend: Unified TransactionTable (src/components/moneyflow/transaction-table.tsx)**

**A. View Modes (Tabs)**

* Add Tabs above table: **\[Active\]** | **\[Void\]**.  
* Filter rows based on status. Void rows: Standard color (no strike-through/opacity if in Void tab).

**B. Columns Refactor**

* **ID:** Add hidden column (visible via toggle or small monospace).  
* **Date:** Format DD/MM/YYYY.  
* **Type:** Badge (In/Out/Transfer). Fix logic to show Red for Shopping.  
* **Source/Account:** Display txn.source\_name (The Bank Name) instead of Debt Account name.  
* **People/Tag:** Split into two distinct columns.  
  * *People:* Avatar \+ Name.  
  * *Tag:* Badge (e.g., NOV25).  
* **Shop/Note:** Combined or separate.  
* **Cashback:** Bring back Fix Back and % Back columns.

**C. Bulk Actions**

* Enable Row Selection checkbox.  
* Show Floating Action Bar when rows selected:  
  * \[🚫 Void Selected\] button.

**D. Nest Menu (Actions)**

* **Edit:** Opens Form.  
* **Void:** Soft delete.  
* **Request Refund:** Show ONLY if shop\_id exists OR category.type is expense.  
  * *Fix:* Ensure logic checks shop\_id properly.

## **4\. Execution Steps**

1. **Backend:** Update service to return source\_name and correct types.  
2. **Form:** Fix the Tab detection logic for Edit mode.  
3. **Table:** Rewrite columns and add Active/Void tabs.  
4. **Integration:** Use this SAME table component in AccountDetails and PeopleDetails (pass props to hide redundant columns, e.g., hide People column in PeopleDetails).