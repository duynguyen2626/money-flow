# **AGENT TASK: BATCH IMPORT, BANK MAPPING & SMART CONFIRM**

Context:  
User wants to streamline the Batch process:

1. **Import:** Paste Excel data to create items efficiently.  
2. **Mapping:** Use bank\_mappings to auto-fill Notes (e.g., Input "970436" \-\> Get "VCB" \-\> Note "VCB NOV25").  
3. **Confirm:** Allow confirming receipt directly from the Target Account card.

**Objective:**

1. Build BankMapping Manager.  
2. Implement BatchImportDialog.  
3. Enhance AccountCard with "Confirm Paid" action.  
4. Fix UI bugs (Tabs, Arrow display, Clone settings).

## **1\. Feature: Bank Mapping Manager**

**A. Backend (src/services/bank.service.ts)**

* CRUD for bank\_mappings.  
* getBankByCode(code): Returns name and short\_name.

**B. UI (src/app/settings/banks/page.tsx OR Tab in Account)**

* Simple Table/List to Add/Edit Mappings.  
* Fields: Code, Name, Short Name (for Notes), Logo URL.

## **2\. Feature: Batch Import (src/components/moneyflow/batch-import-dialog.tsx)**

**UI:**

* **Text Area:** "Paste Excel Data here (Columns: Name | Account Number | Amount)".  
* **Parser Logic:**  
  * Split by newline \\n.  
  * Split by Tab \\t.  
  * Map columns (flexible index or fixed B,C,D as requested).  
* **Smart Enrichment:**  
  * For each row, look up TargetAccount by Number (if stored) or Name.  
  * Look up BankCode if provided.  
  * **Generate Note:** \[ShortName\] \[BatchTag\] (e.g., "MSB NOV25").

## **3\. Enhancement: Account Card "Confirm Paid"**

**Logic:**

* In AccountCard, fetch **Pending Batch Items** targeting this account.  
* **Condition:** item.target\_account\_id \== account.id AND item.status \== 'pending'.  
* **UI:**  
  * Show a Button/Badge: "💰 \[Amount\] đang về".  
  * **Action:** Click \-\> Call confirmBatchItem \-\> Update Balance immediately.

## **4\. Fixes & Polish**

**A. Sheet Export Update**

* In sendBatchToSheet, pass item.bank\_code instead of name if available.

**B. UI Fixes**

* **Batch Detail:** Change Filter Buttons (Process/Done) to **Tabs** (Shadcn Tabs).  
* **Status Logic:** Ensure Batch moves to "Done" tab if status \=== 'completed'.  
* **Account Detail:** Fix Arrow Icon z-index (bring to front, z-10 relative).  
* **Clone Settings:** Add "Auto Clone Day" input to CreateBatchDialog.

## **5\. Execution Steps**

1. **Service:** Create Bank Service.  
2. **UI:** Build Import Dialog with Parse Logic.  
3. **Integration:** Link Account Card to Batch Service for "Confirm Paid".  
4. **Polish:** Apply UI fixes.