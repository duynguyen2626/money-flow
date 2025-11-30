# **TASK: PHASE 49 \- UI/UX ENHANCEMENT & SAFER BATCH ACTIONS**

Status: PENDING

Phase: 49

Priority: HIGH (User Experience & Data Safety)

## **0\. Git & Workflow**

* **Branch Name:** feature/phase-49-ui-ux-polish  
* **PR Message:** feat(phase-49): refactor add-txn modal, enhance batch safety, and fix refund bugs

## **1\. Batch Actions Enhancement (Safety First)**

### **A. Bulk Void / Permanent Delete**

* **Current Behavior:** Process runs uninterrupted; cannot be stopped.  
* **New Requirement:**  
  * Add **"Cancel / Stop"** button during the progress.  
  * **Rollback Logic:** If Cancel is clicked:  
    1. Stop processing immediately.  
    2. **Restore State:** The specific item currently "In Progress" must be reverted to its previous state (e.g., pending or error). Do not leave it in a "loading" state.  
    3. Show Toast: "Process stopped. \[X\] items completed."

## **2\. Refactor Transaction Modal (add-transaction-dialog.tsx)**

### **A. General Layout & Style**

* **Objective:** Modernize UI to match add-account-dialog.  
* **Styling:** Increase input height (h-11), use clear fonts, standardize with Shadcn UI.

### **B. Form Layout Structure**

* **Layout:** Use a flexible Grid (1 or 2 columns).  
* **Positioning:**  
  1. **Top:** **Date** field (Full width or prominent).  
  2. **Middle Group:** **Category** and **Shop** MUST be placed next to each other (contextual grouping).  
  3. **Bottom:** Amount, Wallet/Account, Person, Note.

### **C. Dropdown Enhancements (Smart Select)**

* **Requirement:** All dropdowns (Account, Category, Shop, People) MUST display:  
  * **Thumbnail/Icon:** Avatar/Image on the left of the text.  
  * **Smart Add New:** "Create New" logic integrated directly in the list.

## **3\. Lending Tab \- Debt Cycle UI Redesign**

* **Location:** Move Debt Cycle (Tag) picker UP, next to the **Date** field.  
* **UI:** Redesign as a "Badge" or "Timeline" picker. Suggest Cycle automatically based on Date.

## **4\. Urgent Bug Fixes (Refund & Display) \- CRITICAL**

### **A. Missing Account Images (Refund/System Txns)**

* **Problem:** Auto-generated transactions (GD2 \- Refund, GD3 \- Confirmation) show NO image in the Account column, even though the database logo\_url exists.  
* **Cause:** Frontend UnifiedTransactionTable or transaction-mapper might still be looking for img\_url or failing to map the joined Account relation for system type transactions.  
* **Fix:** Ensure logo\_url is correctly mapped and rendered for **ALL** transaction types.

### **B. Double Shop Icons**

* **Problem:** The transaction list shows two icons (one large, one small) for Shops.  
* **Fix:** Remove the small/redundant icon. Keep only the **Larger** logo\_url image.

### **C. Void Logic Error Handling**

* **Problem:** Voiding GD2 fails because GD3 exists (correct logic), but the error handling is noisy in the Console and the UI feedback could be clearer.  
* **Fix:**  
  * Catch the specific error: Cannot void... refund... confirmed.  
  * **UI Feedback:** Instead of a generic error, show a specific Toast: "Please void the Confirmation Transaction (GD3) first."  
  * Suppress the console noise if handled by UI.

## **5\. Implementation Steps**

1. **Batch Service:** Add AbortController or cancellation flag \+ Rollback logic.  
2. **UI Refactor:** Rebuild TransactionForm (Grid layout, Date top, Shop/Category group).  
3. **Bug Fixes:**  
   * Refactor transaction-mapper.ts to strictly use logo\_url.  
   * CSS/JSX fix for Shop Icons in UnifiedTransactionTable.  
   * Update voidTransaction error handling in transaction.service.ts.

## **6\. Verification**

* \[ \] Batch Cancel restores the last item correctly.  
* \[ \] Modal is clean, Date at top, Shop next to Category.  
* \[ \] Refund Transactions (GD2/GD3) show Account Logos correctly.  
* \[ \] Shops show only ONE large icon.  
* \[ \] Voiding GD2 shows a helpful message guiding user to void GD3 first.  
*   
* 