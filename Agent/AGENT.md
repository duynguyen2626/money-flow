# **PROJECT: MONEY FLOW 3.0**

# **PHASE: 38 \- ADVANCED REFUND LIFECYCLE (STATE MACHINE)**

**WORKFLOW:**

1. **Branch:** feat/phase-38-refund-lifecycle  
2. **Safety:** Run npm run build.

OBJECTIVE:  
Implement a strict 3-step Refund Workflow:

1. **Request:** Original Txn \-\> Waiting Refund. Create Pending Txn (Pending).  
2. **Confirm:** Pending Txn \-\> Completed. Create Real Txn (Posted). Original Txn \-\> Refunded.  
3. **Rollback:** Voiding Pending Txn reverts Original to Posted.

## **I. BACKEND LOGIC (src/services/transaction.service.ts)**

**1\. Update requestRefund**

* **Input:** originalTxnId, amount, isFullRefund.  
* **Logic:**  
  * Create **Refund Request Transaction** (System Account). Status: 'pending'. Note: Refund Request: ....  
  * **Update Original Transaction:**  
    * Set status \= 'waiting\_refund' (if full) or keep 'posted' (if partial).  
    * Update refunded\_amount.  
    * Set refund\_status \= 'pending' or 'partial'.

**2\. Update confirmRefund**

* **Input:** pendingTxnId, targetAccountId.  
* **Logic:**  
  * Fetch Pending Txn.  
  * Create **Real Transaction** (Target Account). Status: 'posted'.  
  * **Update Pending Txn:** Set status \= 'completed'.  
  * **Update Original Transaction:**  
    * Fetch Original (via linked\_transaction\_id or similar trace).  
    * Set status \= 'refunded' (if full coverage).  
    * Set refund\_status \= 'full'.

**3\. Update voidTransaction (Rollback)**

* If voiding a Pending/Completed Refund Txn:  
  * Find Original.  
  * Revert Original status to 'posted'.  
  * Revert Original refund\_status to 'none' or 'partial'.

## **II. FRONTEND UI (UnifiedTransactionTable)**

**1\. Status Badges Mapping**

* waiting\_refund: **Badge (Amber)**: "Waiting Refund".  
* refunded: **Badge (Purple)**: "Refunded".  
* pending: **Badge (Yellow)**: "Pending".  
* completed: **Badge (Blue/Gray)**: "Completed".  
* posted: **Badge (Green)**: "Active".

**2\. Refund Badge Text**

* Change "Partial Refund" \-\> **"Partial"**.

**3\. Refund Modal Logic**

* Ensure amount field defaults to row.amount (Raw Amount), NOT final\_price.  
* When "Cancel 100%" is clicked \-\> Open Modal \-\> Ask: "Tiền đã về chưa?".  
  * If "Chưa" \-\> Run requestRefund (Flow above).  
  * If "Rồi" \-\> Run Immediate Refund (Short circuit to Refunded status).

## **III. EXECUTION STEPS**

1. **Service:** Implement the State Machine logic in transaction.service.ts.  
2. **UI:** Update Badge colors and text.  
3. **Integration:** Wire up the Cancel/Refund actions to the new service logic.  
4. **Verify:** Run build.