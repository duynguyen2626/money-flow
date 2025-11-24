# **AGENT TASK: FINAL POLISH \- UNIFIED TABLE & SMART TRANSFER LOGIC**

Context:  
User wants to finalize the Transaction Table UI with specific display rules for Transfers, Shops, and Column Separation.  
Safety: Ensure Sheet Sync data remains intact regardless of UI merging.  
**Objective:**

1. **UI:** Implement UnifiedTransactionTable with separated People/Tag columns.  
2. **Logic:** Implement "Smart Transfer" display (In-TF/Out-TF) based on context.  
3. **Visual:** Combine Shop+Note nicely (\[Logo\] \*\*Shop\*\* \- Note).

## **1\. Backend: getUnifiedTransactions Refinement (src/services/transaction.service.ts)**

**Update Query Logic:**

* When fetching transactions, perform a **Self-Join** or **Double-Query** for Transfers to find the "Partner Account".  
* **Return Field:** partner\_account\_name.  
  * If Transfer Out: Name of the receiver.  
  * If Transfer In: Name of the sender.

**Data Mapping (View Model):**

* display\_type:  
  * Expense \-\> 'OUT' (Red)  
  * Income \-\> 'IN' (Green)  
  * Debt (Lend) \-\> 'OUT' (Red/Orange)  
  * Debt (Repay) \-\> 'IN' (Green/Teal)  
  * **Transfer:**  
    * If amount \< 0 (Source): 'TF-OUT' (Blue-400).  
    * If amount \> 0 (Dest): 'TF-IN' (Blue-600).

## **2\. Frontend: UnifiedTransactionTable (src/components/moneyflow/unified-transaction-table.tsx)**

**Columns Configuration:**

1. **Date:** DD/MM/YYYY.  
2. **Type:**  
   * Render Badge based on display\_type.  
   * *Text:* "Chi", "Thu", "Chuyển đi", "Nhận tiền".  
3. **Shop/Note (Merged):**  
   * **Component:**  
     \<div className="flex items-center gap-2"\>  
        {row.shop\_logo ? \<img src={row.shop\_logo} className="w-6 h-6 rounded-full border"/\> : \<DefaultIcon /\>}  
        \<div className="flex flex-col"\>  
           \<span className="font-bold text-sm"\>{row.shop\_name || row.note}\</span\>  
           {row.shop\_name && \<span className="text-xs text-gray-500"\>{row.note}\</span\>}  
        \</div\>  
     \</div\>

4. **Account (Smart Context):**  
   * If Transfer: Show "-\> \[Partner\]" or "\<- \[Partner\]".  
   * Else: Show the Account Name (Bank/Cash).  
5. **Category:** Icon \+ Name.  
6. **People:** Avatar \+ Name (Distinct Column).  
7. **Tag:** Badge (Distinct Column).  
8. **Amount:** Colored Currency.  
9. **Actions:** Dropdown Menu.

## **3\. Fix Sheet Sync Assurance**

**Verify:**

* In createTransaction, ensure shop\_name is pulled from the DB/Input and passed to SheetService.  
* *Note:* The UI change above (merging columns) does NOT affect this backend logic.

## **4\. Execution Steps**

1. **Service:** Update getUnifiedTransactions to handle Transfer Partners.  
2. **Table:** Build the columns as requested (Shop+Note merged, People/Tag separated).  
3. **Deploy:** Update all 3 pages to use this polished table.