# **AGENT TASK: DISPLAY TRANSACTION HISTORY (READING DOUBLE-ENTRY DATA)**

Objective: Display a list of the 10 most recent transactions on the Dashboard.  
Challenge: The transactions table (Header) does NOT have an amount column. You must calculate it from transaction\_lines.

## **1\. Backend Logic (src/services/transaction.service.ts)**

Add a new function getRecentTransactions(limit: number \= 10).

**Logic:**

1. Query transactions table, joined with transaction\_lines.  
2. Include relations: transaction\_lines \-\> accounts(name), categories(name).  
3. **Calculate Display Amount:**  
   * Since this is Double-Entry, Sum(Lines) is always 0\.  
   * *Formula:* DisplayAmount \= Sum(ABS(line.amount)) / 2\.  
   * *Example:* Expense 50k (Line1: \-50k, Line2: \+50k). SumAbs \= 100k. Div2 \= 50k.  
4. **Format Return Data:**  
   * Return an array of objects containing: id, date, note, display\_amount, primary\_account\_name (find the line with type='credit' for expense), category\_name.

// Suggested return type  
export type TransactionWithDetails \= {  
  id: string;  
  occurred\_at: string;  
  note: string;  
  amount: number;  
  type: 'income' | 'expense' | 'transfer';  
  category\_name?: string;  
  account\_name?: string;  
}

## **2\. Frontend UI (src/components/moneyflow/recent-transactions.tsx)**

Create a component to display the list.

**Requirements:**

* Use a simple **Table** or **List** layout (Shadcn Table component is preferred).  
* Columns:  
  1. **Date**: Format DD/MM/YYYY.  
  2. **Note/Description**: Bold text.  
  3. **Category/Account**: Small gray text below Note.  
  4. **Amount**:  
     * Red color for Expense (- 50.000 đ).  
     * Green color for Income (+ 50.000 đ).  
* **Empty State**: If no transactions, show a friendly message.

## **3\. Integration (src/app/page.tsx)**

1. Fetch getRecentTransactions(10) in the Server Component.  
2. Place \<RecentTransactions /\> component below the \<AccountList /\>.  
3. Wrap it in a nice Card with title "Giao dịch gần đây".

**Crucial:** Ensure that when a new transaction is added (from Phase 1), this list updates automatically (Server Action revalidatePath should have handled this, please verify).