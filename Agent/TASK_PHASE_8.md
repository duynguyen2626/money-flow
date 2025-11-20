# **AGENT TASK: BUILD PEOPLE DETAILS & DEBT TAGS**

Context:  
The User needs to drill down into Debt details.  
Currently, we only show the Total Balance. We need to replicate the "Debt Ledger" logic by grouping transactions by Tags (e.g., "OCT25", "NOV25").  
**Objective:**

1. Backend: Group debt transactions by tag for a specific person.  
2. Frontend: Build /people/\[id\] page with a "Debt Cycles" view.

## **1\. Backend Logic (src/services/debt.service.ts)**

**A. getPersonDetails(id)**

* Fetch profile info (Name, Avatar) from profiles (or accounts table where type='debt').  
* Calculate TotalBalance.

**B. getDebtByTags(personId)**

* **Logic:**  
  1. Query transaction\_lines related to this Person (Debt Account).  
  2. Join with transactions to get the tag and date.  
  3. **Group By Tag:**  
     * Key: tag (e.g., "NOV25").  
     * Value: Sum of amount (Net Balance for that tag).  
  4. **Return:** Array of objects sorted by Date descending.  
     { tag: "NOV25", balance: 150000, status: "active" | "settled", lastActivity: Date }

## **2\. UI: People Details Page (src/app/people/\[id\]/page.tsx)**

**Route:** /people/\[id\] (Dynamic Route).

**Layout:**

1. **Profile Header:**  
   * Big Avatar & Name.  
   * **Net Balance:** Big Number (Green \= They owe me, Red \= I owe them).  
   * **Action:** "Tất toán nhanh" (Reusable Settle Dialog).  
2. **Debt Cycles (The "Ledgers"):**  
   * Display a Grid of Cards. Each Card represents a **Month/Tag**.  
   * **Card Content:**  
     * Title: "Tháng 11/2025" (Tag: NOV25).  
     * Balance: \+150.000đ.  
     * Status Badge: "Đang nợ" (Active) or "Đã xong" (Settled).  
3. **Transaction History:**  
   * List of all transactions with this person.

## **3\. Integration**

1. **Update DebtList (Dashboard):** Make the person's card clickable \-\> Link to /people/\[account\_id\].  
2. **Update TransactionForm:** When creating a Debt Transaction, automatically generate a default tag based on the Date (e.g., Date is 2025-11-20 \-\> Tag "NOV25").  
   * *Logic:* const tag \= format(date, 'MMMyy').toUpperCase() (using date-fns).

## **4\. Execution Steps**

1. Update debt.service.ts with grouping logic.  
2. Build the /people/\[id\]/page.tsx.  
3. Update Transaction Form to auto-save Tag.