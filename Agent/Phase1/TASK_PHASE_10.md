# **AGENT TASK: ASSETS MANAGEMENT & FIX ACCOUNT TRANSACTIONS**

**Context:**

1. **Bug:** AccountDetailsPage crashes or shows error when fetching transactions. The query logic likely fails on complex joins or ID handling.  
2. **New Feature:** Manage "Assets" (Savings, Investments) as Accounts.  
3. **New Feature:** Link a Credit Card to a Collateral Asset (Secured Card).

**Objective:**

1. Fix getAccountTransactions service.  
2. Update AccountService to support savings, investment types.  
3. UI: Show "Secured By" link in Account Details.

## **1\. FIX BUG: src/services/account.service.ts**

**Function:** getAccountTransactions(accountId: string)

**Problem:** The current query might be trying to filter transactions header by account\_id (which doesn't exist there) OR the join syntax is wrong.

Correct Query Logic:  
We need transactions where THIS account appears in ANY line (Debit or Credit).  
export async function getAccountTransactions(accountId: string) {  
  const supabase \= createClient();  
    
  // Query transaction\_lines to find relevant transaction IDs first  
  const { data: lines, error: lineError } \= await supabase  
    .from('transaction\_lines')  
    .select('transaction\_id')  
    .eq('account\_id', accountId)  
    .order('created\_at', { ascending: false })  
    .limit(50);

  if (lineError) {  
    console.error("Error fetching lines:", lineError);  
    return \[\];  
  }

  // Extract IDs  
  const txIds \= lines.map(l \=\> l.transaction\_id);  
  if (txIds.length \=== 0\) return \[\];

  // Fetch full transaction details for these IDs  
  const { data: txns, error: txError } \= await supabase  
    .from('transactions')  
    .select(\`  
      \*,  
      transaction\_lines (  
        \*,  
        account:accounts(name),  
        category:categories(name),  
        subcategory:subcategories(name)  
      )  
    \`)  
    .in('id', txIds)  
    .order('occurred\_at', { ascending: false });

  if (txError) {  
    console.error("Error fetching txns:", txError);  
    return \[\];  
  }

  // Map/Format for UI (Calculate display amount logic)  
  // ... reuse logic from getRecentTransactions but focused on this account  
  return txns.map(tx \=\> {  
     // Find the line belonging to THIS account to determine Amount and Type (In/Out)  
     const myLine \= tx.transaction\_lines.find((l: any) \=\> l.account\_id \=== accountId);  
     return {  
         ...tx,  
         display\_amount: myLine ? myLine.amount : 0, // Raw amount (Negative \= Out, Positive \= In)  
         // ... other props  
     };  
  });  
}

## **2\. Backend: Asset Management (src/services/account.service.ts)**

**Update createAccount / updateAccount:**

* Support new types: 'savings', 'investment', 'asset'.  
* Accept secured\_by\_account\_id (UUID).  
* Accept metadata (interest rate, term) \-\> Save into cashback\_config column (repurposed as general config).

## **3\. UI: Account Details Upgrade (src/app/accounts/\[id\]/page.tsx)**

**Feature: Secured Card Info**

* **Fetch:** When loading account, if secured\_by\_account\_id exists, fetch the name of that collateral account.  
* **Render:**  
  * In the Header/Config section, display:🔒 **Thẻ này được đảm bảo bởi:** \[Link to Savings Account\]  
  * Click link \-\> Navigate to that Savings Account Details.

**Feature: Savings Account View**

* If type \=== 'savings':  
  * Hide "Cashback Config".  
  * Show "Interest Info": Rate (%), Term, Maturity Date (read from config).

## **4\. Execution Steps**

1. **Priority:** Implement the fixed getAccountTransactions in account.service.ts.  
2. **Update Types:** Update moneyflow.types.ts to include new account types.  
3. **UI:** Update EditAccountDialog to allow selecting "Secured By" (Dropdown of Savings accounts) and picking new Types.