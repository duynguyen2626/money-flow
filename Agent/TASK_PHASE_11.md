# **AGENT TASK: ACCOUNT PAGE OVERHAUL (UI/UX UPGRADE)**

Context:  
The current Account List is too basic. The User wants a comprehensive "Control Center" with Card/Table views, Filtering, Smart Credit Info, and Quick Actions.  
**Objective:**

1. Refactor AccountList to support View Modes (Grid vs Table) & Filtering.  
2. Build AccountCard with rich info (Deadline, Cashback, Quick Actions).  
3. Refactor AccountDetailsPage header to be more compact.

## **1\. UI: Enhanced Account List (src/components/moneyflow/account-list.tsx)**

**Features:**

1. **Header Controls:**  
   * **Filter Tabs:** \[All\] \[Bank\] \[Credit\] \[Savings\] \[Debt\].  
   * **View Toggle:** \[Grid Icon\] / \[List Icon\].  
   * **Global Action:** "Add Account".  
2. **Grid View:** Render list of AccountCard.  
3. **Table View:** Render AccountTable (Shadcn DataTable).

## **2\. UI: Smart Account Card (src/components/moneyflow/account-card.tsx)**

**Layout Design:**

* **Header:**  
  * **Left:** Logo (Circle Avatar) \+ Name \+ Type Badge (tiny).  
  * **Right:** Menu Icon (Edit, Inactive/Close).  
* **Body:**  
  * **Balance:** Big Number (Green/Red).  
  * **Credit Info (If Credit Card):**  
    * "Hạn thanh toán: \[Calculated Date\]" (Badge: Red if near).  
    * "Cashback còn: \[Remaining\]" (Progress bar mini).  
* **Footer (Quick Actions):**  
  * \[Transfer Icon\] (Chuyển khoản).  
  * \[Credit Card Icon\] (Trả dư nợ \- If Credit).  
  * \[Plus Icon\] (Add Transaction linked to this account).

**Logic \- Deadline Calculation:**

* If statement\_day exists:  
  * Next Due Date \= Statement Date \+ 15 days (Default assumption, or add payment\_due\_days to DB later. Use 15 for now).

## **3\. UI: Account Table (src/components/moneyflow/account-table.tsx)**

**Columns:**

* **Logo/Name:** Combined cell.  
* **Type:** Badge.  
* **Balance:** Formatted currency.  
* **Details:** (Credit Limit / Interest Rate).  
* **Status:** Active/Inactive toggle.  
* **Actions:** Edit Button (Lightning Icon).

## **4\. UI: Account Details Header Refactor (src/app/accounts/\[id\]/page.tsx)**

**Action:** Merge the "Summary Stats" (Total In/Out) *into* the Header Card to save space.

**New Layout:**

* **Row 1:** Icon | Name | **Current Balance**.  
* **Row 2 (Mini Stats):** \- "In: \+50M" (Green) | "Out: \-30M" (Red) | "Net: \+20M".  
  * *Aligned right or below name.*  
* **Row 3:** Config/Edit Button.

## **5\. Execution Steps**

1. **Components:** Build AccountCard and AccountTable.  
2. **Logic:** Add helper to calculate "Next Due Date" for Credit Cards.  
3. **Integration:** Replace the old list in page.tsx with the new AccountList engine.  
4. **Details Page:** Compact the header design.