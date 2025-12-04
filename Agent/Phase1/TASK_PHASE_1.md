# **AGENT TASK: git commit -m "Task 1: BUILD TRANSACTION FORM & CORE LOGIC"**

Objective: Create a "Add Transaction" feature.  
Constraint: User inputs SIMPLE data \-\> System converts to DOUBLE-ENTRY in Database.

## **1\. Backend Logic (src/services/transaction.service.ts)**

Update the create function to handle the Double-Entry mapping.

**Logic Rules:**

1. **Expense (Chi tiêu):**  
   * User selects: Account (Source), Category, Amount.  
   * DB creates Line 1: Credit Account, Amount \= \-Amount.  
   * DB creates Line 2: Debit Category, Amount \= \+Amount.  
2. **Income (Thu nhập):**  
   * User selects: Account (Dest), Category, Amount.  
   * DB creates Line 1: Debit Account, Amount \= \+Amount.  
   * DB creates Line 2: Credit Category, Amount \= \-Amount.  
3. **Debt/Lending (Cho vay):**  
   * User selects: Account (Source), Person (as Target), Amount.  
   * *Look up the Debt Account ID of that Person from accounts table.*  
   * DB creates Line 1: Credit Account (Source), Amount \= \-Amount.  
   * DB creates Line 2: Debit Debt Account (Target), Amount \= \+Amount.

**Code Structure for createTransaction:**

// Pseudo-code guide for Service  
export async function createTransaction(input: CreateTransactionInput) {  
  // 1\. Prepare lines based on type (Expense/Income/Debt)  
  const lines \= \[\];  
    
  // 2\. Insert Header to 'transactions' table  
  const { data: txn, error } \= await supabase.from('transactions').insert({...}).select().single();  
    
  // 3\. Insert Lines to 'transaction\_lines' table with txn.id  
  const linesWithId \= lines.map(l \=\> ({ ...l, transaction\_id: txn.id }));  
  await supabase.from('transaction\_lines').insert(linesWithId);  
}

## **2\. Frontend UI (src/components/moneyflow/transaction-form.tsx)**

Create a client component using **React Hook Form** \+ **Zod** \+ **Shadcn UI**.

**Fields required:**

1. **Date**: Use \<Calendar\> and \<Popover\>. Default to today.  
2. **Type**: Tabs or Select (Expense | Income | Transfer).  
3. **Account**: Select from list (Load from getAccounts service).  
4. **Category**: Select from list (Need to create getCategories service first).  
5. **Amount**: Number input (Formatted).  
6. **Note**: Text input.  
7. **Submit Button**: Calls the service.

**Important:**

* Create a new service function getCategories() in src/services/category.service.ts to fetch data for the dropdown.  
* On success, show a toast notification and reset form.

## **3\. Integration (src/app/page.tsx)**

1. Add a "Add Transaction" button to the main Dashboard.  
2. When clicked, open a \<Dialog\> (Modal) containing the TransactionForm.  
3. After submission success, refresh the Dashboard data (using revalidatePath or router refresh).