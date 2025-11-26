# **AGENT TASK: PHASE 28 \- REFUND LOGIC FIX & UI POLISH**

**Context:**

1. **Critical Logic Bug:** Refunding a Debt transaction does NOT link the refund to the Person. The money returns to Bank, but the Person's debt remains high.  
2. **UI UX:** Bulk Void uses ugly browser alerts. Date column lacks time. Filters need splitting. Sorting is missing. Notes don't auto-update on amount change.

**Objective:**

1. Fix requestRefund to preserve person\_id and handle Debt logic correctly.  
2. Upgrade TransactionForm with "Smart Note" and fixed Category defaults.  
3. Upgrade UnifiedTransactionTable: Add Sorting, Split Filters, Time Display, Shadcn Alert for Bulk.

## **1\. Backend: Fix Refund Logic (src/services/transaction.service.ts)**

**Target:** requestRefund function.

**Logic Update:**

* Fetch original transaction lines to find if a person\_id was involved.  
* **If person\_id exists:**  
  * The Refund Transaction MUST have a line with:  
    * account\_id: The original Debt Account.  
    * person\_id: The original Person ID.  
    * amount: Negative (Credit) \-\> To reduce the Debt balance.  
    * type: 'credit' (since Debt account is Asset, Credit reduces it).  
  * **Effect:** This acts exactly like a "Repayment".

## **2\. Frontend: TransactionForm Improvements**

**A. Auto-Update Note**

* Watch amount field.  
* If mode \=== 'refund':  
  * Update note field dynamically: "Refund: " \+ formatCurrency(amount).  
  * *Condition:* Only auto-update if the user hasn't typed a custom note yet (or just force it for simplicity/consistency).

**B. Category Pre-fill**

* Ensure e0000000-0000-0000-0000-000000000095 (Refund Category) is set immediately when opening Refund mode.

## **3\. Frontend: UnifiedTransactionTable Enhancements**

**A. Date Column Upgrade**

* **Format:**  
  \<div className="flex flex-col"\>  
    \<span className="font-bold"\>{format(date, 'dd/MM')}\</span\>  
    \<span className="text-xs text-gray-500"\>{format(date, 'HH:mm')}\</span\>  
  \</div\>

**B. Sorting**

* Add SortingState to the Table.  
* Make Headers clickable: **Date**, **Amount**.  
* Default Sort: created\_at descending (Newest first, including Refunds/Auto items).

**C. Filters Split**

* **Current:** Tag/Cycle combined.  
* **New:**  
  * Dropdown 1: **Tags** (e.g., NOV25).  
  * Dropdown 2: **Cycle** (For credit cards).  
  * Dropdown 3: **People** (Show only in Global View).

**D. Bulk Void UI**

* Replace window.confirm with AlertDialog component (from Shadcn).  
* Show count: "Bạn có chắc muốn hủy **5** giao dịch đã chọn?"

## **4\. Frontend: People Page UI (src/app/people/\[id\]/page.tsx)**

**Action:** Update the Action Buttons on Debt Cards.

* **Add Debt:** Button \-\> Icon Only (Plus). Color: text-red-600 bg-red-50. Tooltip: "Add Debt".  
* **Settle:** Button \-\> Icon Only (Check or DollarSign). Color: text-green-600 bg-green-50. Tooltip: "Settle".  
* **Position:** Bottom-right of the card.

## **5\. Execution Steps**

1. **Service:** Rewrite Refund logic to handle Debt/Person linking.  
2. **Form:** Add useEffect for auto-notes.  
3. **Table:** Implement Date Time styling, Sorting, and Split Filters.  
4. **Dialog:** Implement Bulk Void Alert.  
5. **Verify:** Run build.