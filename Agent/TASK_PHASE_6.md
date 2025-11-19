# **AGENT TASK: ADVANCED CASHBACK ENGINE (SMART HINTS, HISTORY, MIN SPEND)**

**Objective:** Upgrade the Cashback module to handle complex real-world rules, historical tracking, and debt-sharing logic.

## **1\. Database & Logic Updates (src/services/cashback.service.ts)**

**A. Support Historical Cycles (Time Travel)**

* Update getCashbackProgress(monthOffset: number \= 0\)  
* Logic: Calculate StartDate and EndDate based on monthOffset.  
  * 0 \= Current Cycle.  
  * \-1 \= Previous Cycle.  
* Return: cycleLabel (e.g., "20/10 \- 19/11") to display on UI.

**B. Implement "Min Spend" Logic**

* Inside getCashbackProgress, read cashback\_config.min\_spend.  
* Logic:  
  * Calculate TotalSpend in cycle.  
  * IF TotalSpend \< min\_spend: Earned \= 0 (Display text: "Chưa đạt min spend \[Total\]/\[Min\]").  
  * ELSE: Calculate standard rate logic.

**C. Calculate "Profit" (Lợi nhuận ròng)**

* Return structure update:  
  * totalEarned: Total cashback from Bank.  
  * sharedAmount: Sum of cashback given to others (query from transaction\_lines metadata or inferred from split logic).  
  * netProfit: totalEarned \- sharedAmount.

## **2\. UI Update: Transaction Form Smart Hints (src/components/moneyflow/transaction-form.tsx)**

**Context:** When User selects a Credit Card AND adds a Person (Debt).

**New Features in Modal:**

1. **Statement Label:** Display "Kỳ: 20/10 \- 19/11" below the Account Select.  
2. **Cashback Inputs (Only appear if a Person is selected):**  
   * Input % Back (Number).  
   * Input Fixed Back (Number).  
   * Display Total Back Given: calculated from inputs.  
3. **Smart Validation (The "Brain"):**  
   * Fetch cashbackProgress for the selected card.  
   * Calculate RemainingBudget \= MaxCap \- CurrentEarned.  
   * **Rule 1:** Input % cannot exceed Card's default Rate.  
   * **Rule 2:** Total Back Given cannot exceed RemainingBudget.  
   * **Hinting:**  
     * IF (Amount \* Rate) \> RemainingBudget:  
       * Show warning: "Ngân sách hoàn tiền chỉ còn \[Remaining\]".  
       * Suggest/Auto-cap the % input to match the remaining amount (e.g., "Suggest: 6.67%").  
       * Disable Fixed Back if budget is maxed out.

**Submission Logic:**

* When saving, store the % and Fixed values into transaction\_lines.metadata for the Debt line.  
* **Money Flow:**  
  * Line 1 (Credit): Bank \-Amount.  
  * Line 2 (Debit): Debt Account \+(Amount \- GivenCashback).  
  * Line 3 (Debit): Expense (Category: "Discount Given") \+GivenCashback.

## **3\. UI Update: Cashback Details Page (src/components/moneyflow/cashback-details.tsx)**

**Features:**

1. **Cycle Selector:** Tabs or Dropdown to switch between "Cycle T11", "Cycle T10"...  
2. **Summary Cards:**  
   * Total Spend.  
   * **Total Earned (Bank)**.  
   * **Given to People (Shared)**.  
   * **My Profit (Net)**.  
3. **Min Spend Alert:** If TotalSpend \< MinSpend, show a warning bar "Need \[X\] more to unlock cashback".

## **4\. Execution Steps**

1. **Backend:** Update cashback.service.ts to handle min\_spend and history offset.  
2. **Transaction Form:** Implement the complex "Smart Hint" & Validation logic.  
3. **Details UI:** Build the new Drill-down view with Cycle Selector.