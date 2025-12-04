# **AGENT TASK: PHASE 48 \- BUG HUNT & SMART DROPDOWNS**

**Context:**

1. **Missing UI:** CategoryDialog lacks the MCC Code input field.  
2. **Persistent Bug:** TransactionForm force-resets Category to "Money Transfer" incorrectly when lending.  
3. **Feature:** "Smart Add New" inside Comboboxes (Account, Shop, Category, People).  
4. **Logic Change:** Full Refund (100%) should unlink the Person from the original transaction to keep Debt Ledger clean.

**Objective:**

1. Update CategoryDialog to manage MCCs.  
2. **FIX THE FORM BUG:** Stop auto-setting "Money Transfer".  
3. Implement Combobox with "Add New" trigger.  
4. Update Refund Service logic.

## **1\. Fix TransactionForm Logic (The "Money Transfer" Bug)**

**Target:** src/components/moneyflow/transaction-form.tsx

Diagnosis:

Look for a useEffect that depends on \[type\]. It likely looks like:

if (type \=== 'transfer') form.setValue('category\_id', '...MoneyTransferID')

This logic is probably firing even for 'debt\_lending' tab because of shared state variables.

**Fix:**

* **Strict Check:** Only set default category IF the field is currently empty.  
* **Debt Tab:** If tab \=== 'debt\_lending', do **NOT** auto-set "Money Transfer". Leave it empty or set to "Shopping" (if configured).  
* **Priority:** User selection \> Auto logic.

## **2\. Upgrade CategoryDialog (src/components/moneyflow/category-dialog.tsx)**

**UI Update:**

* Add Input Field: **"Mã MCC (Ngăn cách bởi dấu phẩy)"**.  
* **Logic:**  
  * Input: "5411, 5812".  
  * Save: Convert to Array \['5411', '5812'\] \-\> Save to DB mcc\_codes.

## **3\. Feature: Smart Combobox (src/components/ui/combobox.tsx)**

**Upgrade Component:**

* Add prop: onAddNew?: () \=\> void.  
* **Render:**  
  * Inside \<CommandList\>, append a fixed item at the bottom:  
* {onAddNew && (  
*   \<CommandGroup className="border-t pt-1 mt-1 sticky bottom-0 bg-white"\>  
*      \<CommandItem onSelect={onAddNew} value="CREATE\_NEW\_ITEM\_TRIGGER"\>  
*         \<PlusIcon className="mr-2 h-4 w-4" /\>  
*         Thêm mới...  
*      \</CommandItem\>  
*   \</CommandGroup\>  
* )}  
  * 

**Integration:**

* In TransactionForm, pass onAddNew={() \=\> setOpenAccountDialog(true)} to Account Select, etc.  
* **Auto-Select:** When the creation dialog closes successfully, it should return the newId. The Form should check this and setValue('account\_id', newId).

## **4\. Logic: Full Refund Cleanup (src/services/transaction.service.ts)**

**Target:** requestRefund (or confirmRefund).

**Logic:**

* **Check:** If refundAmount \== original.original\_amount (100% Refund).  
* **Action on Original Transaction:**  
  1. **Unlink Debt:** Set person\_id \= NULL.  
  2. **Add History Note:**  
     * original.note \= original.note \+ " \[Hủy nợ: " \+ PersonName \+ "\]".  
  3. **Result:** The transaction becomes a standard personal Expense (Voided/Refunded), and disappears from the Person's debt history.

## **5\. Execution Steps**

1. **Priority 1:** Fix the TransactionForm category bug.  
2. **UI:** Add MCC input to Category Modal.  
3. **Component:** Upgrade Combobox.  
4. **Service:** Update Refund logic.  
*   
* 