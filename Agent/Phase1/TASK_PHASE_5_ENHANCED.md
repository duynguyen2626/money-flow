# **AGENT TASK: ENHANCE CASHBACK ENGINE (HINTS & DETAILS & CYCLES)**

**Context:** The Cashback Dashboard is live, but basic. We need to add "Smart Features" mapping closely to the logic in Accounts\_Report.md.

**Objectives:**

1. **Transaction Form Hints:** Show cashback rules/est. amount when adding a transaction.  
2. **Advanced Cycle Logic:** Support "Statement Cycle" (e.g., 20th to 19th) vs "Calendar Month".  
3. **Drill-down View:** Click a card to see contributing transactions.

## **1\. Frontend: Transaction Form Hints (src/components/moneyflow/transaction-form.tsx)**

**Logic:**

* Watch the accountId field.  
* Find the selected account in the accounts list.  
* Check cashback\_config (JSON).  
* **UI Update:**  
  * Display a **Badge/Alert** below the Account Select.  
  * Content: "Cashback Rate: \[rate\*100\]%" OR "Max: \[max\_amt\]".  
  * *Bonus:* When User types Amount, calculate PotentialCashback \= Amount \* rate and show it dynamically (e.g., "Dự kiến hoàn: \+15,000đ").

## **2\. Backend: Advanced Cycle Logic (src/services/cashback.service.ts)**

**Upgrade Function:** getCashbackProgress()

Logic update for Date Filtering:  
Iterate through each account. Check cashback\_config for cycle\_type and statement\_day.  
**Algorithm:**

* **Case A: Calendar Month** (Default)  
  * StartDate \= 1st of current month.  
  * EndDate \= Last day of current month.  
* **Case B: Statement Cycle** (e.g., statement\_day: 20\)  
  * Get Today.  
  * If Today \>= 20:  
    * StartDate \= 20th of This Month.  
    * EndDate \= 19th of Next Month.  
  * If Today \< 20:  
    * StartDate \= 20th of Previous Month.  
    * EndDate \= 19th of This Month.

*Use these Start/End dates to filter the transaction\_lines query for summation.*

## **3\. Frontend: Cashback Details Dialog (src/components/moneyflow/cashback-details.tsx)**

**UI Requirements:**

* Wrap the Cashback Card in the Dashboard with a clickable area (or a "Chi tiết" button).  
* On Click \-\> Open a **Dialog/Sheet**.  
* **Content:**  
  * Title: "Chi tiết hoàn tiền \- \[Account Name\]".  
  * Subtitle: "Kỳ: \[StartDate\] \- \[EndDate\]".  
  * **List:** Display transactions that contributed to this cashback.  
  * **Summary Footer:** Total Spend | Total Earned.

## **4\. Execution Steps**

1. **Refactor Backend:** Implement the Date Logic in cashback.service.ts first.  
2. **Update Dashboard:** Ensure the progress bar reflects the correct Cycle dates.  
3. **Create Details View:** Build the modal to list transactions.  
4. **Update Transaction Form:** Add the realtime hint.