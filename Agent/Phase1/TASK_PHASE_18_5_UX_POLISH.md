# **AGENT TASK: UX POLISH & LOGIC REFINEMENT (PEOPLE & HISTORY)**

Context:  
User feedback indicates visual clutter, confusing column data, and minor bugs in the People and History views.  
**Objective:**

1. **People Page:** Compact Cards, Year Filter, Icon Actions, Math Fix (-0).  
2. **Transaction History:** "Smart Source" Column, New "Type" Column, Reorder Columns.  
3. **Logic:** Fix Quick Add realtime update & Refund Menu visibility.

## **1\. Refine People Details Page (src/app/people/\[id\]/page.tsx)**

**A. Debt Cycle Cards (UI Redesign)**

* **Layout:** Change Grid to grid-cols-1 sm:grid-cols-3 lg:grid-cols-4. Reduce Card padding/height.  
* **Labels:** Remove redundant "Tag" label (Just show "NOV25").  
* **Actions:** Replace Text Buttons with **Icon Buttons** (Size icon, Variant ghost or outline).  
  * Quick Add: Plus Icon (Red/Orange color). Tooltip: "Add Debt".  
  * Settle: Check Icon (Green color). Tooltip: "Settle".  
* **Math Fix:** Ensure Balance displays 0 instead of \-0 (Use Math.abs or amount \=== 0 ? 0 : amount).

**B. Year Filter**

* Add a Tabs/Select for **Year** (2024, 2025...) at the top of the Cycle Grid.  
* Filter displayed cards by parsing the Tag (e.g., "NOV25" \-\> 2025). Default to Current Year.

**C. Quick Add Realtime**

* Ensure router.refresh() is called *after* the Quick Add Modal closes successfully.

## **2\. Refine Transaction History Table (src/components/moneyflow/transaction-table.tsx)**

**A. Column Restructuring**

* **Order:** Date | Type | Shop/Note | People/Tag | Amount | Status | Actions.  
* **New Column "Type":**  
  * Logic: Check type (Expense/Income/Transfer) AND category context.  
  * Display: Badge (In \= Green, Out \= Red, Transfer \= Blue).  
* **Column "Account" (The "Smart Source" Fix):**  
  * **Problem:** Currently shows "Nợ phải thu..." for debt txns.  
  * **Fix:** If the main account is a Debt Account, we want to show the **Payment Source** (Bank).  
  * *Implementation:* The backend getTransactions needs to join/fetch the related\_account\_name (from the balancing line).  
  * *UI:* Rename header to "Source/Account".

**B. Column "Tag/Cycle"**

* Move this next to the "People" column or merge them?  
* *Decision:* Keep separate but move closer to People. Ensure Cycle data isn't empty (Check persisted\_cycle\_tag in DB).

**C. Nest Actions (Refund)**

* Verify why "Request Refund" is missing.  
* **Condition:** (ShopID exists OR Category is Shopping) AND Type is Expense.  
* **Menu:** Ensure "Request Refund" is in the dropdown.

## **3\. Logic & Bug Fixes**

**A. Repayment Category**

* In TransactionForm (Repayment Tab): Auto-select Category "Thu nợ người khác" (e0000000-0000-0000-0000-000000000097).

**B. Cashback Hint Text**

* In CashbackDetails, change "Could not find..." to "Không có dữ liệu hoàn tiền (No Data)" (Red/Gray text).

**C. Shop Image Bug**

* In TransactionForm: When Shop is selected, ensure the Shop Logo is passed/displayed correctly in the UI (Check shops join).

## **4\. Execution Steps**

1. **UI:** Refactor DebtCycleCard (Compact, Icons, Math).  
2. **Feature:** Add Year Filter to People Page.  
3. **Table:** Update Columns (Type, Smart Account, Reorder).  
4. **Form:** Implement Repayment Category auto-select.