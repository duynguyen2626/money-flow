# **AGENT TASK: FIX DEBT LOGIC WITH NEW SCHEMA & ENHANCE UI**

**Context:**

1. **Schema Change:** We added original\_amount, cashback\_share\_percent, and cashback\_share\_fixed to transaction\_lines to replace metadata.  
2. **Critical Bug:** Debt Amount calculation is currently dividing by 2 (wrong logic inherited from Transaction List).  
3. **New Feature:** User wants a "Quick Add Debt" button on each Debt Cycle Card.

Objective:  
Refactor the Debt engine to use the new columns, fix the math, and update the UI.

## **1\. Backend: Fix Read Logic (src/services/debt.service.ts)**

**Update getDebtByTags(personId):**

**A. SQL Query Update**

* Select the new columns: amount, original\_amount, cashback\_share\_fixed, cashback\_share\_percent.

**B. Aggregation Logic (FIX THE MATH)**

* **Rule:** Do NOT divide SUM(amount) by 2\.  
* **Calculation per Tag:**  
  * NetBalance \= SUM(amount) (Where account\_id \= personId).  
  * TotalOriginal \= SUM(original\_amount) (Fallback to amount if null).  
  * TotalBack \= TotalOriginal \- NetBalance.  
  * *Note:* Only sum these for "Lending" lines (where amount \> 0).

**C. Return Type Update**

{  
  tag: string;  
  netBalance: number;       // 79.6M  
  originalPrincipal: number; // 80M  
  totalBack: number;        // 400k  
  // ...  
}

## **2\. Backend: Fix Write Logic (src/services/transaction.service.ts)**

**Update createTransaction:**

* When creating the **Debit Line** for the Debt Account:  
  * amount: Save the **Net Amount** (e.g., 79.6M).  
  * original\_amount: Save the User Input (e.g., 80M).  
  * cashback\_share\_percent: Save the Input Rate (e.g., 0.005).  
  * cashback\_share\_fixed: Save the Input Fixed (e.g., 0).  
* *Do not use metadata field anymore.*

## **3\. UI: Enhance People Details (src/app/people/\[id\]/page.tsx)**

**A. Update Cycle Cards**

* **Display:**  
  * Main Number: **Net Balance** (79.600.000 đ).  
  * Sub-text: "Gốc: **80.000.000** | 🎁 Back: **400.000**".  
* **New Action Button:** "Thêm nợ nhanh" (Plus Icon).  
  * **Position:** Top-right of the card (next to Settle button).  
  * **Behavior:** Opens TransactionForm (Modal).  
  * **Pre-fill Data:**  
    * Type: Expense/Transfer (Context dependent, usually Expense).  
    * Tag: The Card's Tag (e.g., NOV25) \-\> *Must allow Manual Tag Mode*.  
    * Person: The current Person ID.

**B. Update Transaction Modal for "Quick Add"**

* Ensure the Modal accepts defaultTag and defaultPersonId props to support the "Quick Add" feature.

## **4\. Execution Steps**

1. Refactor transaction.service.ts (Write path).  
2. Refactor debt.service.ts (Read path & Math fix).  
3. Update PeopleDetailPage UI (Cards & Quick Add).