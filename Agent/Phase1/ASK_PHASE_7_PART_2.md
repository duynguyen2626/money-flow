# **AGENT TASK: BUILD ACCOUNT DETAILS & CONFIG EDITOR**

**Context:** The User needs a dedicated page to view a specific account's history and, crucially, to EDIT its settings (especially the complex Cashback JSON config).

**Objective:** Create the dynamic page /accounts/\[id\] with a "Edit Configuration" feature.

## **1\. Backend Logic (src/services/account.service.ts)**

**A. Fetch Details**

* getAccount(id): Returns single account data.  
* getAccountTransactions(accountId, limit=50): Returns transactions where account\_id MATCHES either transaction\_lines.account\_id (Debit/Credit).  
  * *Note:* This requires joining transaction\_lines \-\> transactions.

**B. Update Config**

* updateAccountConfig(id, data): Update basic info (Name, Credit Limit) AND the cashback\_config JSONB column.

## **2\. UI: Account Details Page (src/app/accounts/\[id\]/page.tsx)**

**Layout Structure:**

1. **Header Section:**  
   * **Left:** Icon (Bank Logo placeholder) \+ Name \+ Type (Badge).  
   * **Right:** Big Current Balance (Green/Red).  
   * **Action:** "Cấu hình" (Settings) Button \-\> Opens Edit Dialog.  
2. **Stats Cards (Grid):**  
   * Total Inflow (All time or This Month).  
   * Total Outflow.  
   * *If Credit Card:* Current Cashback Cycle status (Reuse logic from Phase 6 if possible, or simplify).  
3. **History Section:**  
   * Table of transactions specific to this account.

## **3\. UI: Edit Account Dialog (src/components/moneyflow/edit-account-dialog.tsx)**

**This is the most critical part.** Create a Form to edit the Account.

**Form Fields:**

1. **Basic:** Name, Credit Limit (if credit card).  
2. **Cashback Configuration (Only if type \== 'credit\_card'):**  
   * *Render these inside a "Cấu hình hoàn tiền" Fieldset/Card.*  
   * **Rate (%):** Number input (e.g., 0.1 for 10%).  
   * **Max Amount:** Number input.  
   * **Min Spend:** Number input (The new field from Phase 6).  
   * **Cycle Type:** Select (Calendar Month | Statement Cycle).  
   * **Statement Day:** Number input (1-31, only show if Statement Cycle is selected).

**Submission Logic:**

* Construct the JSON object from these fields.  
* Call updateAccountConfig.  
* Refresh page on success.

## **4\. Execution Steps**

1. Create the Backend functions in account.service.ts.  
2. Create the EditAccountDialog component with the JSON parsing logic.  
3. Build the /accounts/\[id\]/page.tsx.  
4. Update the Dashboard Account List to link to this page.