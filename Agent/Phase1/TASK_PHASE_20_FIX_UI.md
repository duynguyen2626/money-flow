# **AGENT TASK: FIX TRANSACTION TABLE UI & ADD RECALCULATE LOGIC**

Context:  
The "Unified Table" is live but has display bugs and layout requests.

1. **Bug:** "Source/Account" column is BLANK for transfers.  
2. **UI Request:** Date format dd-MM. Shop column show LOGO only \+ Note.  
3. **Feature:** Add "Recalculate Balance" button to Account Details page.

Objective:  
Polish the Table UI and ensure Data is correctly mapped.

## **1\. Backend: Fix Data Mapping (src/services/transaction.service.ts)**

**Function:** getUnifiedTransactions

**A. Fix Source/Account Logic (Crucial)**

* The frontend needs specific fields to render the Account column.  
* **Logic:**  
  * For every transaction, identify primary\_account (Current context or From) and partner\_account (To/Counterpart).  
  * **Return Fields:**  
    * source\_name: Name of the From Account (or Bank).  
    * source\_logo: Logo URL.  
    * destination\_name: Name of To Account (or Shop/Category).  
    * destination\_logo: Logo URL.  
  * *Transfer Logic:*  
    * If Global View: Source \= FromAccount, Dest \= ToAccount.  
    * If Account View (Account A): Partner \= Account B.

**B. Recalculate Service (src/services/account.service.ts)**

* Add recalculateBalance(accountId) function.  
* **Logic:**  
  * SUM(amount) from transaction\_lines where account\_id \= id.  
  * Update accounts.current\_balance.  
  * Update accounts.total\_in (sum positive).  
  * Update accounts.total\_out (sum negative).

## **2\. Frontend: Polish UnifiedTransactionTable**

**A. Column: Date**

* Format: dd-MM (e.g., "24-11"). Remove Year.

**B. Column: Shop/Note**

* **Layout:**  
  * Row 1: \[Shop Logo\] \[Note Text\].  
  * *Hide Shop Name text*.  
  * If no shop logo, use a generic "Shopping Bag" icon.

**C. Column: Account (Smart Source)**

* **Display:** \[Logo\] Name.  
* **Logic:**  
  * If Transfer: Show From \-\> To (with tiny logos).  
  * If Expense: Show Source Account (e.g., VCB).

**D. Column: Category**

* Display \[Image\] Name. Ensure image doesn't break layout (size 20x20).

## **3\. Frontend: Add Recalculate Button (src/app/accounts/\[id\]/page.tsx)**

**UI:**

* In the Header (Action Menu or near Balance), add a button/icon RefreshCw (Rotate).  
* **Tooltip:** "Tính toán lại số dư (Recalculate)".  
* **Action:** Call recalculateBalance \-\> Toast "Success" \-\> Reload Page.

## **4\. Execution Steps**

1. **Backend:** Update mapping logic to ensure Source/Dest names are never null.  
2. **Backend:** Implement Recalculate function.  
3. **UI:** Apply the visual changes (Date format, Shop Icon only).