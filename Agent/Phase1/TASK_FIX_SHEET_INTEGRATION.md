# **AGENT TASK: WIRE UP SHEET SERVICE TO TRANSACTION CREATION**

**Context:**

* **Status:** The Google Sheet Webhook works (Test Connection successful).  
* **Bug:** Real transactions created via createTransaction (or Bot) are NOT appearing in the Sheet.  
* **Cause:** The call to SheetService.syncTransaction is missing or broken inside transaction.service.ts.

Objective:  
Ensure EVERY time a Debt Transaction is created (manually or by bot), it is synced to the connected Google Sheet.

## **1\. Audit & Fix src/services/transaction.service.ts**

**Target Function:** createTransaction(...)

**Action:**

1. Locate the code block *after* the transaction and lines are successfully inserted into Supabase.  
2. **Add the Sync Logic:**  
   * Iterate through the inserted transaction\_lines.  
   * **Condition:** Check if line.person\_id exists (and is not null).  
   * **Trigger:** If valid, call SheetService.syncTransaction.

**Code Snippet (Integration Guide):**

// ... after inserting header and lines ...

// \--- SHEET SYNC INTEGRATION \---  
// Iterate through lines to find Debt assignments  
for (const line of linesToInsert) {  
  if (line.person\_id) { // This indicates a Debt Line linked to a Person  
    try {  
      // We need to pass the FULL transaction context \+ specific line info  
      // It's safer to fire-and-forget (don't await) to keep UI fast  
      SheetService.syncTransaction(line.person\_id, {  
        id: transactionId,  
        date: txnData.occurred\_at,  
        shop\_name: txnData.shop\_name || txnData.note, // Fallback  
        note: txnData.note,  
        // IMPORTANT: Use the Original Amount (Gross) for the Sheet  
        original\_amount: line.original\_amount || line.amount,   
        cashback\_share\_percent: line.cashback\_share\_percent,  
        cashback\_share\_fixed: line.cashback\_share\_fixed,  
        tag: txnData.tag  
      }, 'create').catch(err \=\> console.error("Sheet Sync Error (Background):", err));  
        
      console.log(\`\[Sheet Sync\] Triggered for Person ${line.person\_id}\`);  
    } catch (e) {  
      console.error("Failed to trigger Sheet Sync:", e);  
    }  
  }  
}  
// \------------------------------

## **2\. Verify src/services/subscription.service.ts (The Bot)**

Action:  
The Bot creates transactions differently (batch insert). Ensure it ALSO performs this sync check.

* When the Bot generates debt lines for members, it must either:  
  * Call createTransaction (reusing logic above).  
  * OR have its own SheetService call loop.  
* *Recommendation:* If the Bot inserts directly, ADD the SheetService.syncTransaction loop there too.

## **3\. Debugging Logger (src/services/sheet.service.ts)**

**Action:** Add logging to syncTransaction to verify it's being called.

console.log("Syncing to sheet for Person:", personId, "Payload:", payload);

## **4\. Execution Steps**

1. Modify transaction.service.ts to insert the Sync Loop.  
2. Modify subscription.service.ts to ensure Bot transactions also sync.  
3. **Test:** Create a NEW transaction for "Lâm" and check the Server Terminal logs for "\[Sheet Sync\] Triggered".