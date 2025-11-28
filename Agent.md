# **PROJECT: MONEY FLOW 3.0**

# **PHASE: 39 \- REFUND STATE MACHINE FIX & SHEET SYNC PATCH**

**WORKFLOW:**

1. **Branch:** fix/phase-39-refund-logic  
2. **Safety:** Run npm run build.

**OBJECTIVES:**

1. **Fix Refund Logic:** Ensure "Request Refund" sets status to waiting\_refund (not refunded). Ensure "Confirm" completes the cycle.  
2. **Fix Void Constraint:** Prevent voiding Pending Txn if Completed Txn exists. Rollback Original Txn status when voiding.  
3. **Fix Sheet Sync:** Repayments must be "In" and show Bank Name in "Shop" column.  
4. **UI:** Translate Refund Modal to full English.

## **I. BACKEND LOGIC (src/services/transaction.service.ts)**

### **1\. Fix requestRefund (The "Waiting" State)**

* **Current Bug:** It sets refund\_status \= 'full' immediately.  
* **Fix:**  
  * If isPending (Wait for money):  
    * Create GD2 (Pending Txn).  
    * Update GD1 (Original): status \= **'waiting\_refund'**. refund\_status \= **'pending'**.  
  * If \!isPending (Money received immediately):  
    * Update GD1: status \= 'refunded'. refund\_status \= 'full'.

### **2\. Fix voidTransaction (The Constraint & Rollback)**

* **Logic:**  
  1. **Check Constraints:**  
     * If txn.status \=== 'completed' (GD2 \- Intermediate), CHECK if there is a linked GD3 (Real Money In).  
     * If GD3 is active \-\> **THROW ERROR**: "Cannot void intermediate transaction. Please void the 'Money Received' transaction first."  
  2. **Rollback Logic:**  
     * If voiding GD2 (Pending): Find GD1 \-\> Set status \= 'posted', refund\_status \= 'none'.  
     * If voiding GD3 (Real Money): Find GD2 \-\> Set status \= 'pending'.

### **3\. Fix Sheet Sync (syncTransactionToSheet)**

* **Logic for Repayment/Refund:**  
  * If type \=== 'repayment' OR category.type \=== 'income' (Refund):  
    * **Force Type:** "In".  
  * **Fix Shop Column:**  
    * Current: Uses source\_account\_name (which is Debt Account).  
    * **Fix:** If Repayment, use destination\_account\_name (The Bank Name) as the "Shop" value in payload.

## **II. FRONTEND UI**

### **1\. TransactionForm (Refund Mode)**

* **Translation:** Translate all labels/options to English.  
  * "Đã nhận tiền" \-\> "Received (Instant)".  
  * "Chờ hoàn" \-\> "Pending (Wait)".  
  * "Số tiền" \-\> "Amount".  
  * "Tài khoản" \-\> "Account".

### **2\. UnifiedTransactionTable (Missing Pending Rows)**

* **Bug:** Pending/System transactions are missing from the list.  
* **Cause:** The default filter might be excluding account\_type \= 'system'.  
* **Fix:** Ensure the fetch query INCLUDES system accounts when viewing "All Transactions" or ensure they are visible in the /refunds page.

## **III. EXECUTION STEPS**

1. **Backend:** Rewrite requestRefund state assignment.  
2. **Backend:** Implement Void constraints.  
3. **Backend:** Patch Sheet Sync payload mapping.  
4. **Frontend:** Update translations.  
5. **Verify:** Run build.