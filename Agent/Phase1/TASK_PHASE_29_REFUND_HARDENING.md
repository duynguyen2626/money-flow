# **AGENT TASK: HARDEN REFUND LOGIC (STATE TRACKING & BUG FIXES)**

**Context:**

1. **Logic Gap:** Users can refund a transaction multiple times, exceeding the original amount.  
2. **Regression Bug:** When refunding a Debt Transaction, the person\_id is lost, breaking the Debt Ledger logic.  
3. **Requirement:** If a Refund Transaction is VOIDED, the Original Transaction's refunded\_amount must be rolled back so it can be refunded again.

**Objective:**

1. Implement refund\_status & refunded\_amount tracking.  
2. Fix person\_id propagation in requestRefund.  
3. Implement "Rollback Logic" in voidTransaction.

## **1\. Backend: Upgrade requestRefund (src/services/transaction.service.ts)**

**Logic Steps:**

1. **Fetch Original Transaction:** Get details \+ current refunded\_amount.  
2. **Validation:**  
   const currentRefunded \= original.refunded\_amount || 0;  
   if (currentRefunded \+ newRefundAmount \> original.amount) {  
       throw new Error("Số tiền hoàn vượt quá giá trị gốc\!");  
   }

3. **Create Refund Transaction (The Fix for Person):**  
   * Loop through original lines.  
   * If a line has person\_id (Debt Line):  
     * Create a counterpart Credit Line with the **SAME person\_id** and **SAME account\_id**.  
     * *Crucial:* This ensures the money flows back from the specific Person's Debt Account.  
4. **Update Original Transaction:**  
   * Increment refunded\_amount.  
   * Update refund\_status: If (NewTotal \>= OriginalAmount) ? 'full' : 'partial'.

## **2\. Backend: Upgrade voidTransaction (The Rollback)**

**Logic Steps:**

1. Fetch the transaction being voided.  
2. **Check Context:** Is this a "Refund Transaction"? (Check if category.type is Refund or look for metadata/linked flags. *Better: Look if it has a linked\_transaction\_id pointing to a parent*).  
3. **If it is a Refund:**  
   * Find the Parent Transaction.  
   * **Rollback:**  
     * Decrement refunded\_amount on Parent by the voided amount.  
     * Recalculate refund\_status (Set back to 'partial' or 'none').

## **3\. Frontend: UI Updates (UnifiedTransactionTable)**

1. **Refund Badge:**  
   * Show a Badge column or icon:  
     * "Partial Refund" (Yellow).  
     * "Refunded" (Purple).  
2. **Action Menu Protection:**  
   * If refund\_status \=== 'full', **DISABLE** or Hide the "Request Refund" action.

## **4\. Execution Steps**

1. **Service:** Rewrite requestRefund with validation & person fix.  
2. **Service:** Update voidTransaction to handle rollback.  
3. **UI:** Add status indicators.  
4. **Test:**  
   * Refund a debt \-\> Check People Page (Balance should drop).  
   * Void that refund \-\> Check People Page (Balance should go back up).