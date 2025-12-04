# **AGENT TASK: BUILD DEBT MANAGER DASHBOARD**

Objective: Create a "Debt Dashboard" card to track who owes money (Receivables) vs who I owe (Payables).  
Context: In our DB, "People" are mapped to accounts with type \= 'debt'.

* Positive Balance (+): They owe me (Asset).  
* Negative Balance (-): I owe them (Liability).

## **1\. Backend Logic (src/services/debt.service.ts)**

Update DebtService to fetch debt status.

**Function:** getDebtAccounts()

1. Query accounts table where type is 'debt'.  
2. Order by current\_balance descending (Highest debt first).  
3. Return types: id, name, current\_balance, owner\_id (linked profile).

## **2\. Frontend UI (src/components/moneyflow/debt-list.tsx)**

Create a component to display debt status.

**UI Requirements:**

* **Layout:** A clean list or grid of cards inside a Section titled "Sổ Nợ" (Debt Book).  
* **Visuals:**  
  * Avatar (Placeholder Initials) on the left.  
  * Name: Bold.  
  * **Amount:**  
    * If \> 0: Text Green ("Đang nợ bạn: \+100k").  
    * If \< 0: Text Red ("Bạn nợ: \-50k").  
    * If \= 0: Text Gray ("Đã tất toán").  
* **Action:** Add a small "Settle" button (Icon: Check) next to each person (Logic to be implemented later, just UI for now).

## **3\. Integration (src/app/page.tsx)**

1. Fetch getDebtAccounts() in Server Component.  
2. Place \<DebtList /\> component alongside or below \<RecentTransactions /\>.  
3. Maybe use a Grid layout: Left column (Transactions), Right column (Debt).

**Design Layout Suggestion:**

\<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6"\>  
  \<div className="md:col-span-2"\>  
    \<RecentTransactions data={transactions} /\>  
  \</div\>  
  \<div\>  
    \<DebtList data={debts} /\>  
  \</div\>  
\</div\>  
