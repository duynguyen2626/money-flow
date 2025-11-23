# **AGENT TASK: IMPLEMENT EDIT & SOFT DELETE (VOID) WORKFLOWS**

Context:  
User needs to modify or cancel transactions.  
Policy:

* **Delete:** We use **Soft Delete** (Set status \= 'void'). Voided transactions do not count towards balance (handled by DB Trigger) but remain visible in history (grayed out).  
* **Edit:** Allows changing Amount, Date, Note, Category.

**Objective:**

1. Backend: Implement voidTransaction and updateTransaction.  
2. UI: Add Action Menu (Edit/Void) to TransactionTable.

## **1\. Backend Logic (src/services/transaction.service.ts)**

**A. voidTransaction(id: string)**

* **Step 1:** Update transactions set status \= 'void'.  
  * *Note:* The DB Trigger update\_account\_balance will automatically detect this change (because we updated the Trigger to filter status='posted') and recalculate balances.  
* **Step 2:** Trigger Sheet Sync (Delete).  
  * Fetch the transaction to check if it had a person\_id (Debt).  
  * If yes, call SheetService.syncTransaction(..., 'delete').

**B. updateTransaction(id: string, newData: any)**

* **Step 1:** Update Header (transactions).  
* **Step 2 (Complex):** Update Lines.  
  * *Strategy:* Full Replacement (Safest for consistency).  
  * Delete existing transaction\_lines for this transaction\_id.  
  * Insert NEW lines based on newData (Amount, Category, etc.).  
  * *Reason:* Trying to diff lines is too error-prone with Double Entry logic.  
* **Step 3:** Trigger Sheet Sync.  
  * Call 'delete' for old data.  
  * Call 'create' for new data.

## **2\. UI: Upgrade Transaction Table (src/components/moneyflow/transaction-table.tsx)**

**Action:** Replace the generic "Ghost Button" with a DropdownMenu.

**Menu Items:**

1. ✏️ **Chỉnh sửa (Edit):**  
   * Opens TransactionForm in "Edit Mode" (pre-filled data).  
   * *Requires:* Update TransactionForm to accept initialData and transactionId.  
2. 🚫 **Hủy giao dịch (Void):**  
   * Show AlertDialog (Confirm?).  
   * On Confirm: Call voidTransaction.  
   * **Visual Feedback:** Voided rows should be displayed with opacity-50 line-through text-gray-400.

## **3\. Execution Steps**

1. **Service:** Implement voidTransaction and updateTransaction.  
2. **UI Component:** Build the RowActions dropdown.  
3. **Form:** Refactor TransactionForm to support Editing.  
4. **Safety Check:** Run npm run build after coding to ensure no type errors.