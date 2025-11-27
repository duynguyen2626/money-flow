# **AGENT TASK: BATCH AUTOMATION, CLONE LOGIC & UI FIXES**

**Context:**

1. **Selection Logic:** "Source Account" in Batch Create must filter ONLY type \== 'bank'.  
2. **Clone Logic:** Need a "Clone Batch" dialog to select Target Month (Current/Last). It must intelligently replace the Date Tag in the Batch Name and Item Notes.  
3. **Automation:** Implement "Auto-Clone" bot for Batches marked as templates.

**Objective:**

1. Upgrade CreateBatchDialog (Filter Bank).  
2. Implement CloneBatchDialog & Service.  
3. Implement checkAndCloneBatches (Bot).

## **1\. UI: CreateBatchDialog & EditBatchDialog**

**A. Filter Source Account**

* Filter accounts dropdown: Show only where type \=== 'bank'.  
* Hide 'credit\_card', 'system', 'debt', etc.

**B. Add Automation Fields (Edit Mode Only)**

* Toggle: "Dùng làm mẫu tự động (Template)".  
* Input: "Ngày chạy tự động" (1-31).  
* Input: "Link Sheet mặc định" (Allow updating sheet\_link).

## **2\. Feature: Manual Clone Logic (src/components/moneyflow/clone-batch-dialog.tsx)**

**UI:**

* Radio: \[ \] Tháng trước (Last) | \[x\] Tháng này (Current).  
* Preview Name: Show calculated new name.

**Backend Service (cloneBatch) Logic:**

* **Input:** originalBatchId, targetMode ('current' | 'last').  
* **Step 1:** Calculate Tags.  
  * OldTag \= Extract from old batch name or month\_tag.  
  * NewTag \= Calculate based on targetMode (e.g., NOV25).  
* **Step 2:** Create New Batch.  
  * NewName \= OldName replaced OldTag with NewTag.  
  * sheet\_link \= Copy from old.  
* **Step 3:** Clone Items.  
  * Loop items.  
  * **Smart Note Replace:** newItem.note \= oldItem.note.replace(OldTag, NewTag).  
  * Reset is\_confirmed \= false.

## **3\. Automation: Auto-Clone Bot (src/services/batch.service.ts)**

**Function:** checkAndAutoCloneBatches() (Called by AutomationChecker).

**Logic:**

1. Fetch batches where is\_template \= true.  
2. Loop check:  
   * TodayDay \>= batch.auto\_clone\_day.  
   * CurrentMonthTag \!= batch.last\_cloned\_month\_tag.  
3. **Action:** Call cloneBatch logic.  
4. **Update:** Set last\_cloned\_month\_tag \= CurrentMonthTag.  
5. **Return:** List of created batches.

## **4\. Execution Steps**

1. **Service:** Implement cloneBatch with String Replacement logic.  
2. **Service:** Implement autoCloneBot.  
3. **UI:** Build CloneBatchDialog and update Create/Edit forms.  
4. **Integration:** Add Bot Check to the Header "Zap" button.