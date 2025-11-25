# **AGENT TASK: UNIFY PEOPLE UI & FIX CATEGORY LOGIC**

**Context:**

1. **UI Consistency:** /people/\[id\] is using an old/broken table. It must use the UnifiedTransactionTable.  
2. **Visual Logic:** "Debt Repayment" transactions should appear as **Transfer (TF)** badges in the UI (blue), but sync as **"In"** to Google Sheet.  
3. **Category Logic:**  
   * "Refund" action currently picks "Discount/Gift" (Wrong). It must pick the new "Refund" category.  
   * "Repay" tab currently picks "Money Transfer" or null. It must pick "Debt Repayment".

**Objective:**

1. Refactor PeopleDetailPage to use UnifiedTransactionTable.  
2. Update TransactionService mapping for Repayment types.  
3. Hardcode Category defaults in TransactionForm and requestRefund.

## **1\. Refactor People Page (src/app/people/\[id\]/page.tsx)**

**Action:**

* **Remove** the old table implementation (or PersonTransactionTable).  
* **Import** UnifiedTransactionTable.  
* **Usage:**  
  \<UnifiedTransactionTable   
    data={transactions}   
    context="person"   
    hiddenColumns={\['people', 'shop'\]} // Keep it clean  
  /\>

* *Note:* Ensure getDebtByTags or the transaction fetcher for this page returns the data structure required by Unified Table.

## **2\. Fix Display Logic vs Sheet Logic**

**Target:** src/services/transaction.service.ts

**A. UI Display (getUnifiedTransactions)**

* If type \=== 'repayment' (or Income on Debt Account):  
  * Set display\_type \= **'transfer'** (So UI shows Blue Badge).  
  * Set source\_name \= Debt Account Name.  
  * Set dest\_name \= Bank Account Name.

**B. Sheet Sync (syncTransactionToSheet)**

* If type \=== 'repayment':  
  * Payload type \= **"In"** (or "Repayment").  
  * *Do NOT send "Transfer" to sheet.*

## **3\. Fix Category Defaults**

**A. Refund Logic (requestRefund service)**

* Target Category ID: 'e0000000-0000-0000-0000-000000000095' (**Refund**).  
* *Fix:* Do not look up "Discount Given" anymore.

**B. Repay Tab (TransactionForm.tsx)**

* **Effect:** When Tab changes to debt\_repayment:  
  * form.setValue('category\_id', 'e0000000-0000-0000-0000-000000000096') (**Debt Repayment**).  
  * *Validation:* Ensure this category exists in the dropdown list (Fetch logic).

## **4\. Execution Steps**

1. **Page:** Update /people/\[id\] to use the unified table.  
2. **Service:** Update requestRefund to use the new Refund Category ID.  
3. **Form:** Wire up the auto-select logic for Repayment Category.  
4. **Mapping:** Ensure Repayment shows as TF in UI but In in Sheet.