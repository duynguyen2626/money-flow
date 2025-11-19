# **AGENT TASK: BUILD CASHBACK TRACKING DASHBOARD**

Objective: Create a Dashboard showing Credit Card spending progress vs Cashback limits.  
Context:

* We store cashback rules in accounts.cashback\_config (JSONB).  
* We need to calculate "Earned Cashback" dynamically based on transaction\_lines of the current month.

## **1\. Backend Logic (src/services/cashback.service.ts)**

**Function:** getCashbackProgress()

**Steps:**

1. **Fetch Accounts:** Get all accounts where type is 'credit\_card' AND cashback\_config is not null.  
2. **Fetch Spending:** For each account, query transaction\_lines (type='credit') for the **Current Month** (Start of month to Now).  
   * *Note:* For MVP, assume all cards use "Calendar Month" logic. We will add Statement Cycle logic later.  
3. **Calculate Logic:**  
   * Parse cashback\_config (e.g., { rate: 0.1, max\_amt: 600000 }).  
   * CurrentSpend \= Sum of Abs(Amount) of transaction lines.  
   * Earned \= CurrentSpend \* rate.  
   * CappedEarned \= Min(Earned, max\_amt if exists).  
   * ProgressPercent \= (CappedEarned / max\_amt) \* 100\.  
4. **Return Data Structure:**  
   type CashbackCard \= {  
     accountId: string;  
     accountName: string;  
     currentSpend: number;  
     earned: number;  
     maxCashback: number | null; // Null if unlimited  
     progress: number; // 0-100  
   }

## **2\. Frontend UI (src/components/moneyflow/cashback-dashboard.tsx)**

Create a sleek dashboard component.

**UI Requirements:**

* **Layout:** Grid of Cards (one card per Credit Card).  
* **Card Content:**  
  * **Header:** Bank Logo/Icon \+ Account Name.  
  * **Main Number:** Big green text showing "Đã hoàn: \[Earned\] đ".  
  * **Progress Bar:** Use Shadcn \<Progress /\>.  
    * Label: "Đã tiêu: \[CurrentSpend\] / Cần tiêu: \[Target to Max\]".  
  * **Footer:** Config details (e.g., "Rate: 5% • Max: 600k").

## **3\. Integration (src/app/page.tsx or new /cashback page)**

1. Let's create a new page: **src/app/cashback/page.tsx**.  
2. Add "Cashback" to the Sidebar (src/components/moneyflow/app-layout.tsx) with a Credit Card icon.  
3. Render the \<CashbackDashboard /\> on that page.

**Special Instruction:**

* Handle the JSON parsing carefully. The DB field is cashback\_config, which might be returned as a string or object depending on the driver. Ensure type safety.