# **PROJECT: MONEY FLOW 3.0**

# **PHASE: 53 \- DASHBOARD RE-ARCHITECT & SERVICE PAGE**

**WORKFLOW:**

1. **Branch:** `feat/phase-53-dashboard-service`  
2. **Safety:** Run `npm run build`.

**OBJECTIVE:**

1. **FIX DASHBOARD CRASH:** Rewrite `DashboardService` to query `transaction_lines` (NOT `transactions`).  
2. **NEW DASHBOARD LAYOUT:** Implement the "Dense Grid" layout requested by user. Add Month/Year Filter.  
3. **SERVICE PAGE:** Move Service Edit from Modal to `/services/[id]` page.  
4. **ICONS:** Change Service Icon to Cloud.

   ## **I. BACKEND: FIX DASHBOARD SERVICE (`src/services/dashboard.service.ts`)**

**Function:** `getDashboardStats(month: number, year: number)`

**Correct Logic (Double-Entry Aware):**

1. **Date Range:** StartDate \-\> EndDate of selected Month/Year.  
2. **Total Spend (For Chart):**  
   * Query: `transaction_lines` JOIN `categories`.  
   * Where: `created_at` in Range AND `line.amount` \> 0 AND `category.type` \= 'expense'.  
   * *Exclude:* Categories like "Transfer", "Credit Payment", "Loan", "Repayment".  
   * **Group By:** `category.name`. Sum `amount`.  
3. **Top Debtors:**  
   * Query: `accounts` where `type` \= 'debt'.  
   * Order By: `current_balance` DESC. Take Top 5\.  
   * *Note:* No date filter here (Debt is cumulative).  
4. **System Status:**  
   * **Refunds:** Balance of Account `SYSTEM_ACCOUNTS.PENDING_REFUNDS`.  
   * **Batches:** Sum `amount` of batch items where `status` \= 'pending'.

   ## **II. UI: NEW DASHBOARD LAYOUT (`src/app/page.tsx`)**

**Structure:** `max-w-screen-2xl mx-auto space-y-4`

**1\. Filter Bar (Top Right):**

* Select Month (1-12). Select Year (2024-2026).  
* State: `selectedDate`. Triggers data refetch.

**2\. Row 1: Debt & Analytics (Grid cols-12 gap-4)**

* **Col-span-4 (Left): "Sổ Nợ (Debt Book)" Widget**  
  * Compact List: Avatar | Name | Badge `Wait: 500k` / `Owe: 200k`.  
  * Action: Link to `/people`.  
* **Col-span-8 (Right): "Chi tiêu tháng \[M\]" Widget**  
  * **Layout:** Grid cols-2.  
  * **Sub-Col 1:** **Donut Chart** (Recharts).  
    * Height: 250px (Small). Legend: Vertical, Right aligned.  
  * **Sub-Col 2:** **Recent Transactions**.  
    * Compact Table (Date | Note | Amount). 5 items max.

**3\. Row 2: System Health (Grid cols-2 gap-4)**

* **Card 1:** **"Chờ hoàn tiền (Refunds)"**.  
  * Big Number: Current Balance of Pending Account.  
  * List: Top 3 pending transactions. Link `/refunds`.  
* **Card 2:** **"Chờ duyệt (Batches)"**.  
  * Big Number: Total Pending Amount.  
  * Text: "X lệnh đang chờ xác nhận". Link `/batch`.

  ## **III. FEATURE: SERVICE DETAILS PAGE (`src/app/services/[id]/page.tsx`)**

**Goal:** Replace the Edit Modal with a full page.

**Layout:**

* **Header:**  
  * Icon (Big Cloud/Service Logo).  
  * Title: Service Name.  
  * Subtitle: Price / Cycle / Next Billing.  
  * **Action:** "Edit Info" (Opens small dialog for Name/Price only).  
* **Body (Tabs):**  
  * **Tab 1: Members (Overview):**  
    * **Component:** `ServiceMemberManager`.  
    * **List:** People with Checkboxes & **Slot Input**.  
    * **Logic:** Toggling checkbox or changing slot immediately calls `updateSubscriptionMembers`.  
  * **Tab 2: History:** List of auto-generated transactions for this service.

**Navigation Update:**

* In `/services` list, clicking a card navigates to `/services/[id]`.

  ## **IV. UI POLISH: ICONS**

**Target:** `src/components/moneyflow/app-layout.tsx`

**Update Sidebar:**

* **Services:** Change Icon to `Cloud` or `CloudLightning` (Lucide).  
* **Accounts:** Ensure `Landmark` (Bank).  
* **People:** `Users`.  
* **Cashback:** `RotateCw`.

  ## **V. EXECUTION STEPS**

1. **Backend:** Rewrite `getDashboardStats` with correct SQL/Logic.  
2. **Page:** Rebuild `page.tsx` with the 4-block layout.  
3. **Page:** Build `src/app/services/[id]/page.tsx` and Member Manager.  
4. **Layout:** Update Sidebar Icons.  
1.   
1. 