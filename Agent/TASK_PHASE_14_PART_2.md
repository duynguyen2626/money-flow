# **AGENT TASK: FIX SPLIT CATEGORY BUG & IMPLEMENT RESTORE TXN**

**Context:**

1. **Bug:** When creating a Debt Transaction with Cashback/Discount, the balancing line (the "Expense" part) is created with category\_id: null. It should be assigned to a fallback category (e.g., "General Expense" or "Adjustment").  
2. **Feature:** User wants to **Restore** (Un-void) a transaction that was previously cancelled.

**Objective:**

1. Fix createTransaction to ensure no lines have category\_id: null.  
2. Implement restoreTransaction service and UI action.

## **1\. Backend: Fix createTransaction (src/services/transaction.service.ts)**

**Action:** Review the split logic.

**Logic Update:**

* When calculating the "Difference" (e.g., 111k in the User's example):  
  * Current: lines.push({ amount: diff, type: 'debit', category\_id: null }) \-\> **BAD**.  
  * New Logic:  
    1. Fetch a default category ID.  
    2. **Strategy:** Try to find category with name **"Chiết khấu / Quà tặng"** OR **"Chi phí khác"**.  
    3. If not found, pick the *first* available category with type \= 'expense'.  
    4. Use this ID for the balancing line.

**Hardening:**

* Ensure that *every* Debit line that is NOT a Debt Account *MUST* have a category\_id.

## **2\. Backend: Implement restoreTransaction (src/services/transaction.service.ts)**

**Function:** restoreTransaction(id: string)

**Logic:**

1. Update transactions set status \= 'posted' where id \= id.  
2. **Sheet Sync:** Trigger SheetService.syncTransaction(..., 'create') (Treat it as a new creation for the Sheet, or handle duplication logic if the sheet doesn't support updates. Since we deleted it from sheet on Void, creating it again is correct).

## **3\. UI: Update TransactionTable (src/components/moneyflow/transaction-table.tsx)**

**Action:** Add "Restore" item to the Dropdown Menu.

**Logic:**

* **Condition:** Only show "Restore" if transaction.status \=== 'void'.  
* **Handler:** Call restoreTransaction \-\> Refresh Data.  
* **Visual:** Maybe change the row style from "Strike-through" back to normal immediately (Optimistic UI).

## **4\. Execution Steps**

1. **Fix the Null Bug:** Modify transaction.service.ts to assign a category to the balancing line.  
2. **Implement Restore:** Add the service function and connect it to the UI Dropdown.  
1. 