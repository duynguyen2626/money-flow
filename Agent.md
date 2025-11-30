# **PROJECT: MONEY FLOW 3.0**

# **PHASE: 51 \- DASHBOARD & LOGIC REFINEMENTS**

**WORKFLOW:**

1. **Branch:** `feat/phase-51-dashboard-and-fix`  
2. **Safety:** Run `npm run build` before finishing.

**OBJECTIVE:**

1. **Build Dashboard:** Visualize Monthly Spend, Net Worth, and Debt.  
2. **Fix UI Bugs:** "Create New" missing in dropdowns, Refund Note pollution.  
3. **Enhance Logic:** Group Debt handling (Payer Name).

   ## **I. FEATURE: THE ULTIMATE DASHBOARD (`src/app/page.tsx`)**

**1\. Service: `src/services/dashboard.service.ts`**

* **Function:** `getDashboardStats()`  
* **Aggregations:**  
  * **Total Assets:** Sum `current_balance` of Bank \+ Cash \+ Savings.  
  * **Monthly Spend:** Sum `amount` (Debit Category) where `type`\='expense'. *Exclude Transfers/CreditPayments*.  
  * **Debt Overview:** Sum positive balances of `type`\='debt'.  
  * **System Status:** Count Pending items in Batch/Refunds.  
* **Chart Data:** Group Expenses by Category Name for the current month.

**2\. UI Layout (Grid)**

* **Row 1 (KPI Cards):** Net Worth (Blue), Monthly Spend (Red), Monthly Income (Green).  
* **Row 2 (Main):**  
  * **Left (60%):** Donut Chart (Recharts) \- "Spending Breakdown".  
  * **Right (40%):** "My Debtors" List (Top 5 People who owe me).  
* **Row 3 (System):** Batch & Refund status cards.

  ## **II. FIX UI & LOGIC BUGS**

**1\. Fix Missing "Create New" in Dropdowns**

* **Target:** `src/components/ui/combobox.tsx`  
* **Problem:** The "Add New" button is hidden or missing from the DOM.  
* **Fix:** Ensure the `CommandGroup` for "Add New" is rendered **OUTSIDE** the filtered `CommandList` or forced to stick at the bottom using `sticky bottom-0 bg-white z-50 border-t`.  
* **Integration:** Ensure `TransactionForm` passes `onAddNew` prop to all selectors (Account, Category, Shop, People).

**2\. Fix Refund Note "Pollution"**

* **Target:** `TransactionForm` (`useEffect` on `mode='refund'`).  
* **Problem:** Note auto-fills as "ShopName Notes".  
* **Fix:** Clean the string. Use `original.note` directly. DO NOT prepend `original.shop_name`.  
  * *Desired Format:* "Refund: \[Original Note\]".

**3\. Enhance Group Debt Logic**

* **Target:** `TransactionForm` (Repay Tab).  
* **Logic:**  
  * Fetch `person_details` when Person is selected.  
  * **Condition:** If `person.is_group === true`:  
    * Show Input: **"Người trả (Payer Name)"**.  
  * **Save:** Append this name to the Transaction Note (e.g., "Trả nợ (bởi Tuấn)").

  ## **III. EXECUTION STEPS**

1. **Component:** Fix `Combobox` (Sticky Footer).  
2. **Form:** Update Refund Note logic & Group Payer input.  
3. **Service:** Implement `DashboardService`.  
4. **Page:** Build the Dashboard UI with Recharts.  
5. **Build:** Verify no errors.  
*   
* 