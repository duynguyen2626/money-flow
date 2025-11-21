# **AGENT TASK: FIX MATH BUGS, DATA MAPPING & LAYOUT**

**Context:**

1. **Critical Math Bug:** In the People Details page, the transaction amounts are displayed as **HALF** their actual value (e.g., 276M instead of 552M).  
2. **Missing Data:** The columns "% Back", "Fix Back", "Sum Back" are empty because the UI isn't reading the new DB columns (cashback\_share\_...).  
3. **Layout Bug:** The "Quick Add" button breaks the Debt Card layout.

**Objective:** Fix the math, map the data correctly, and polish the layout.

## **1\. Fix Math Bug in src/services/debt.service.ts (or transaction.service.ts)**

Diagnosis:  
The function fetching transactions for a person (likely getPersonTransactions or similar) is probably using a helper that divides amount by 2\.  
**Action:**

* Locate the query logic.  
* **Rule:** If querying specific transaction\_lines for a Debt Account, return the **RAW amount**. Do NOT divide by 2\.  
* Ensure amount (Net) and original\_amount (Gross) are passed through as-is.

## **2\. Fix Data Mapping in Transaction List (src/components/moneyflow/person-transaction-table.tsx)**

**Context:** This component is likely used inside src/app/people/\[id\]/page.tsx.

**Update Columns:**

1. **% Back:** Read txn.cashback\_share\_percent.  
   * *Display:* (value \* 100\) \+ '%' (e.g., 0.005 \-\> 0.5%).  
   * *Handle null:* Display "-" if 0 or null.  
2. **Fix Back:** Read txn.cashback\_share\_fixed.  
   * *Display:* Format Currency.  
3. **Sum Back:** Calculate on the fly if not in DB, or derive:  
   * Sum \= (original\_amount \* percent) \+ fixed.  
   * *Display:* Format Currency (Green color).  
4. **Số tiền (Original):** Display txn.original\_amount.  
5. **Final Price (Net):** Display txn.amount.

## **3\. Fix Layout Bug (src/app/people/\[id\]/page.tsx)**

**Context:** The Debt Cycle Card Header is breaking.

CSS Fix:  
Update the Card Header structure to use flex-wrap or better spacing.  
\<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4"\>  
  {/\* Left: Title & Amount \*/}  
  \<div\>  
    \<h3 className="font-bold text-lg"\>{tag}\</h3\>  
    {/\* ... amounts ... \*/}  
  \</div\>

  {/\* Right: Actions \*/}  
  \<div className="flex items-center gap-2 shrink-0"\>  
    \<Button size="sm" variant="outline" onClick={...}\>  
      \<PlusIcon className="w-4 h-4 mr-1" /\> Thêm nợ  
    \</Button\>  
    \<Button size="sm" onClick={...}\>  
      \<CheckIcon className="w-4 h-4 mr-1" /\> Tất toán  
    \</Button\>  
  \</div\>  
\</div\>

## **4\. Execution Steps**

1. **Stop the Division:** Search for / 2 in the debt service and remove it for this specific query.  
2. **Map Columns:** Update the table rendering logic to use the snake\_case columns from DB.  
3. **Fix CSS:** Apply the flexbox fix to the Card Header.