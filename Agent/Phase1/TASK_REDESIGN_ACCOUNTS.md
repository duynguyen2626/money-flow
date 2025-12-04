# **AGENT TASK: REDESIGN ACCOUNT CARDS & ENHANCE HISTORY TABLE**

**Context:**

1. **UI Overhaul:** The current Account Cards are too big and ugly (background images make text hard to read). The User wants a "Digital Bank Card" style (Compact, Grouped by Type, Gradient backgrounds).  
2. **Logic Update:** Transaction History needs smarter column display (Cycle vs Tag) and advanced filtering.

**Objective:**

1. Redesign AccountList to group accounts (Credit, Bank, Savings, Debt).  
2. Redesign AccountCard to be compact, styled like a physical card with tooltips.  
3. Update TransactionTable logic for Tags and Filtering.

## **1\. UI: Redesign Account List (src/components/moneyflow/account-list.tsx)**

**Layout Strategy:**

* **Grouping:** Instead of one giant grid, render sections:  
  * **💳 Credit Cards:** (Gradient backgrounds, Chip icon).  
  * **🏦 Payment Accounts:** (Clean solid colors).  
  * **💰 Savings & Assets:** (Distinct style).  
  * **👥 Debt Accounts:** (Compact list or mini cards).  
* **Responsive Grid:** grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4.

## **2\. UI: Redesign Account Card (src/components/moneyflow/account-card.tsx)**

**Visual Style (Bank Card Look):**

* **Container:** Rounded-xl, aspect-ratio (like a credit card \~1.58), padding.  
* **Background:**  
  * If Credit: Dark Gradients (e.g., bg-gradient-to-br from-slate-800 to-slate-600).  
  * If Bank: Blue/Green Gradients.  
  * If Debt: Simple Bordered Card (White bg).  
* **Content Layering:**  
  * **Top:** Bank Logo (Left) | Bank Name (Right \- Small opacity).  
  * **Middle:** **Current Balance** (Big Font, White text).  
  * **Bottom:**  
    * **Info Row:** "Exp: 15 days" (Deadline) | "Cashback: 50k".  
    * **Action Bar (Hover only):** 4 small circular buttons with Tooltips.  
      * \[+\] Add Txn.  
      * \[-\>\] Transfer.  
      * \[$\] Pay Debt.  
      * \[...\] Edit.

**Tooltip Implementation:**

* Use Tooltip from Shadcn UI wrapping the Action Buttons.

## **3\. UI: Update Transaction History (src/app/accounts/\[id\]/page.tsx)**

**A. Smart Tag Column Logic**

* **Condition:** Check account.type.  
* **Render:**  
  * **IF Credit Card:** Display txn.persisted\_cycle\_tag (or calculate Cycle Label).  
    * *Header:* "Statement Cycle".  
  * **IF Other (Bank/Debt):** Display txn.tag (e.g., "NOV25").  
    * *Header:* "Debt Tag".

**B. Add "Statement Cycle" Column**

* Add a specific column for Statement Cycle (if available in DB logic or derived).

**C. Advanced Filter (Category \+ Subcategory)**

* **Current:** Only Category filter.  
* **New:**  
  * When a Category is selected in the Faceted Filter...  
  * Show a **Second Filter Dropdown**: "Subcategory".  
  * Populate it only with subcategories of the selected parent.

## **4\. Execution Steps**

1. **Refactor Card:** Create the new CSS-heavy AccountCard.  
2. **Refactor List:** Implement grouping logic in AccountList.  
3. **Update Table:** Modify the columns definition in the Transaction Table to support the conditional Tag logic and nested filtering.