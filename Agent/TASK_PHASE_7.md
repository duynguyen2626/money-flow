# **AGENT TASK: UI/UX OVERHAUL & ACCOUNT DETAILS PAGE**

**Context:** The core logic is solid. Now we need to polish the UX to make it faster to use and allow deep-diving into specific accounts.

**Objectives:**

1. **Refactor Transaction Modal:** Use Tabs for Transaction Type & Searchable Comboboxes.  
2. **Build Account Details Page:** A dedicated page to view history and edit config for a specific account.

## **1\. Upgrade TransactionForm (src/components/moneyflow/transaction-form.tsx)**

**A. Transaction Type UI**

* **Change:** Replace the standard \<Select\> for "Type" with Shadcn \<Tabs\>.  
* **Layout:**  
  \<Tabs value={type} onValueChange={setType} className="w-full"\>  
    \<TabsList className="grid w-full grid-cols-3"\>  
      \<TabsTrigger value="expense"\>Chi tiêu\</TabsTrigger\>  
      \<TabsTrigger value="income"\>Thu nhập\</TabsTrigger\>  
      \<TabsTrigger value="transfer"\>Chuyển khoản\</TabsTrigger\>  
    \</TabsList\>  
    {/\* Form Content... \*/}  
  \</Tabs\>

* **UX Improvement:** One less click for the user.

**B. Searchable Dropdowns (Combobox)**

* **Change:** Replace \<Select\> for **Account** and **Category** with a reusable Combobox component (using Command and Popover from Shadcn).  
* **Requirement:**  
  * User can type to filter accounts/categories.  
  * Display Icon/Logo if available (optional).  
  * *Note:* Create a reusable Combobox component in src/components/ui/combobox.tsx first to keep code clean.

## **2\. Build Account Details Page (src/app/accounts/\[id\]/page.tsx)**

**Route:** Dynamic route /accounts/\[id\]

**Backend Logic (src/services/account.service.ts):**

* getAccountDetails(id): Fetch account info \+ cashback\_config.  
* getAccountTransactions(id): Fetch transactions where this account is either source or destination (from transaction\_lines).

**UI Layout:**

1. **Header Card:**  
   * Big Name & Icon.  
   * Current Balance (Green/Red).  
   * Edit Button (To open a "Edit Account" dialog \- just UI for now).  
2. **Config Section (If Credit Card):**  
   * Show Cashback Rate, Max Cap, Min Spend, Cycle info in a clean grid.  
3. **Transaction History List:**  
   * Reuse the \<RecentTransactions /\> component logic but filtered for this account only.

## **3\. Integration**

1. Update AccountList (Dashboard): Make the account name clickable \-\> Link to /accounts/\[id\].  
2. Ensure the new TransactionForm still supports all previous logic (Smart Hints, Min Spend Warnings). **Do not break the logic while changing the UI.**

## **4\. Execution Steps**

1. **Components:** Install cmdk (npm install cmdk) and add command, tabs components via shadcn if missing.  
2. **Refactor Modal:** Implement Tabs and Combobox.  
3. **Page Build:** Create the Account Details dynamic page.