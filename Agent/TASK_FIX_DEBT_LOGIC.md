# **AGENT TASK: FIX DEBT CALCULATION LOGIC & METADATA DISPLAY**

**Context:**

1. **Math Bug:** When viewing Debt Details, the displayed amount is exactly **HALF** of the expected value (e.g., User expects 79.6M, App shows 39.8M).  
   * *Cause:* The service is likely applying the Sum / 2 logic (intended for Transaction List) to the Debt Ledger.  
2. **Missing Info:** The UI does not show the "Cashback Share" details (Fix Back, % Back) even though it exists in transaction\_lines.metadata.

**Objective:**

1. Fix the getDebtByTags aggregation logic (Do NOT divide by 2).  
2. Extract and Sum metadata fields to display "Original Amount" and "Total Cashback" on the UI cards.

## **1\. Fix Backend Logic (src/services/debt.service.ts)**

**Update getDebtByTags(personId):**

**A. Fix Aggregation (The Math Bug)**

* **Current (Wrong):** Likely summing absolute values or dividing by 2\.  
* **Correct Logic:**  
  * Query transaction\_lines WHERE account\_id \== personId.  
  * Just SUM(amount). Positive \= They owe me. Negative \= I owe them.

**B. Extract Metadata (The Missing Info)**

* While iterating/grouping by tag, we need to parse the metadata column (JSONB).  
* **Accumulate these values per Tag:**  
  * totalPrincipal: The original amount before cashback deduction.  
    * *Logic:* If metadata.cashback\_share\_amount exists: Principal \= amount \+ cashback\_share\_amount. Else Principal \= amount.  
  * totalCashback: Sum of metadata.cashback\_share\_amount.  
* **Return Structure:**  
  {  
    tag: string;  
    netBalance: number; // The actual debt (79.6M)  
    originalPrincipal: number; // The money spent (80M)  
    totalCashback: number; // The discount given (400k)  
    status: string;  
  }

## **2\. Verify Write Logic (src/services/transaction.service.ts)**

Double Check createTransaction for Debt:  
Ensure the split calculation matches the User's requirement:

* **User Input:** Amount \= 80M, Rate \= 0.5% (400k).  
* **Money Flow:**  
  1. **Credit Bank:** \-80M (Full amount leaves bank).  
  2. **Debit Debt Account:** \+79.6M (Friend owes Net Amount).  
  3. **Debit Expense (Category: Discount/Gift):** \+400k (My cost/loss).  
* **Metadata:** Save { "cashback\_share\_amount": 400000, ... } in the **Debt Line** (Line 2).

## **3\. Update UI (src/app/people/\[id\]/page.tsx)**

**Update the Cycle Cards:**

* **Main Number:** Display netBalance (e.g., **79.600.000 đ**).  
* **Sub-info (New Section):**  
  * If totalCashback \> 0, display a row:"Gốc: 80.000.000 đ | 🎁 Back: 400.000 đ"  
  * Use a distinct color for the Cashback part (e.g., Amber/Blue).

## **4\. Execution Steps**

1. **Refactor Service:** Rewrite getDebtByTags to parse metadata and sum correctly.  
2. **Refactor UI:** Update the Card component to show the breakdown.  
3. **Test:** Refresh the People Detail page. The number should double back to the correct amount (79.6M) and show the cashback details.