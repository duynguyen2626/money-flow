# **AGENT TASK: FINALIZE BATCH TRANSFER (CLONE, DELETE, EXPORT FIX)**

**Context:**

1. **Sheet Export:** The payload sent to Google Sheet needs to match the Banking Template (Specific columns).  
2. **Missing Features:** User needs to **Clone** a batch (for next month) and **Delete** a batch.  
3. **UI Bugs:** "Fund" logic visual issues, missing Account Links, messy Note generation (showing "VCB 5" instead of "VCB NOV25").

**Objective:**

1. Update sendBatchToSheet payload.  
2. Implement cloneBatch and deleteBatch.  
3. Enhance BatchList (Filters) and BatchDetail (Links, Fixes).

## **1\. Backend: Upgrade src/services/batch.service.ts**

**A. sendBatchToSheet (Payload Update)**

* Ensure payload structure matches the Apps Script expectation:  
  {  
    "items": \[  
      { "receiver\_name": "...", "bank\_number": "...", "amount": 100, "note": "VCB NOV25", "bank\_name": "..." }  
    \]  
  }

* *Fix Note:* Ensure the note passed is the full formatted string.

**B. cloneBatch(originalBatchId, newMonthTag)**

* **Logic:**  
  1. Fetch original batch \+ items.  
  2. Create New Batch: Name \= CKL ${newMonthTag} ....  
  3. Loop items \-\> Create New Items linked to New Batch.  
     * **Important:** Reset is\_confirmed \= false and transaction\_id \= null.  
     * **Smart Note Update:** Replace old Tag (e.g., OCT25) in notes with New Tag (NOV25).

**C. deleteBatch(id)**

* **Logic:**  
  * Delete (or Void) the Batch.  
  * *Safety:* Check if it was Funded. If yes, warn user or void the funding transaction too.

## **2\. UI: Upgrade BatchList (src/app/batch/page.tsx)**

**A. Tabs Filter**

* **\[Processing\]:** Status draft or funded (Not all items confirmed).  
* **\[Done\]:** Status completed (All items confirmed).

**B. Action Menu (Card)**

* Add **"Clone to Next Month"**.  
* Add **"Delete"**.

## **3\. UI: Upgrade BatchDetail (src/app/batch/\[id\]/page.tsx)**

**A. Table Columns**

* **Target Account:** Show \[Logo\] Name (Clickable Link to /accounts/\[id\]).  
* **Bank Name / Number:** Ensure these columns are visible (Editable if needed).

**B. Fix Note Generation (Dialog)**

* **Bug:** "VCB 5" \-\> Cause: date.getMonth() returns 0-11 index (e.g., 10 for Nov).  
* **Fix:** Use the batch.month\_tag string directly (e.g., "NOV25").

**C. Fund Button UX**

* **Checkbox:** "Fund All"? \-\> *Correction:* "Fund" usually means moving money from Source \-\> System (One Big Transaction).  
* Keep "Fund" as a single action for the Batch.  
* "Confirm" is the per-item action.

## **4\. Execution Steps**

1. **Service:** Implement Clone/Delete logic.  
2. **UI:** Fix the Note generation bug (Month index).  
3. **UI:** Add Tabs and Links.  
4. **Sheet:** Verify payload mapping.