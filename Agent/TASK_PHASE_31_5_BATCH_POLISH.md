# **AGENT TASK: BATCH TRANSFER UX POLISH & SMART LOGIC**

Context:  
The Batch Transfer module works but lacks UX automation and has visual bugs.

1. **Smart Tag:** User wants to toggle "Current Month" or "Last Month" when creating a batch to auto-generate the Tag (e.g., NOV25 vs OCT25).  
2. **Smart Note:** When adding an item, extracting the Bank Name (e.g., "VCB") should auto-fill the Note with "\[Bank\] \[Tag\]" (e.g., "VCB OCT25").  
3. **Bugs:** "Confirm" button is missing. "Receiver Name" is hardcoded. Account Link is missing.

**Objective:**

1. Upgrade CreateBatchDialog with Month Toggle.  
2. Upgrade BatchAddItemDialog with Bank Name parsing and Auto-Note logic.  
3. Fix UI bugs in BatchDetailPage (Confirm button, Account Link, Receiver Name).

## **1\. UI: Upgrade CreateBatchDialog (src/components/moneyflow/create-batch-dialog.tsx)**

**A. Month Toggle Logic**

* **UI:** Radio Group: \[x\] Tháng này (Current) | \[ \] Tháng trước (Last).  
* **Logic:**  
  * Get CurrentDate.  
  * If "Last": TargetDate \= subMonths(CurrentDate, 1).  
  * If "Current": TargetDate \= CurrentDate.  
* **Auto-Fill:**  
  * Generate month\_tag (e.g., "NOV25") based on TargetDate.  
  * Update Batch Name input: CKL ${month\_tag}.

## **2\. UI: Upgrade BatchAddItemDialog (src/components/moneyflow/batch-add-item-dialog.tsx)**

**A. New Fields**

* **Bank Name:** Text Input (e.g., "VCB \- Ngoại Thương").  
* **Receiver Name:** Text Input.  
  * *Fix:* Remove NGUYEN THANH NAM hardcode. Default to the selected TargetAccount.name or empty.

**B. Smart Note Logic (Auto-Fill)**

* **Trigger:** Watch bank\_name input change.  
* **Logic:**  
  * ShortBank \= bank\_name.split('-')\[0\].trim(). (Take first part before dash).  
  * Tag \= (Pass batch.month\_tag as prop to this dialog).  
  * NewNote \= ${ShortBank} ${Tag}.  
  * **Action:** form.setValue('note', NewNote).

## **3\. UI: Fix BatchDetailPage (src/app/batch/\[id\]/page.tsx)**

**A. Fix Confirm Button Visibility**

* **Condition:** Button should show if batch.status \=== 'funded' AND item.is\_confirmed \=== false.  
* **Debug:** Ensure the batch object status is correctly updated in UI after funding.

**B. Source Account Link**

* **Action:** Wrap the Source Account Name in the Header with a Link.  
* href: /accounts/${batch.source\_account\_id}.  
* Style: Blue/Underline on hover.

**C. Table Columns**

* Ensure "Bank Name" and "Receiver Name" columns are visible.

## **4\. Execution Steps**

1. **Refactor Create Dialog:** Implement Month Toggle & Tag Gen.  
2. **Refactor Add Item Dialog:** Implement Bank Name Input & Smart Note Gen.  
3. **Refactor Detail Page:** Check Confirm button logic & Add Link.