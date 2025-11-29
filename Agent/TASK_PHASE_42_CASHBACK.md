# **AGENT TASK: CASHBACK REBOOT & REFUND UI POLISH**

**Context:**

1. **Refund UI:** Pending transactions are currently struck-through (ugly). User wants a clear "Status" column instead.  
2. **Cashback Logic:** Need to support complex tiered cards (like VPBank Lady) where rate depends on Total Spend and Category.  
3. **Cashback UI:** The details page needs to show "Profit" (Bank Back \- People Back).

**Objective:**

1. Upgrade UnifiedTransactionTable with Status Badge.  
2. Implement TieredCashbackService.  
3. Rebuild /cashback page with detailed Profit tables.

## **1\. UI: Polish UnifiedTransactionTable**

**Action:**

* **Remove line-through and opacity-50** for transactions with status \=== 'waiting\_refund' or 'pending'. Only apply it to void.  
* **Add "Status" Column:**  
  * Render Badges:  
    * 🟢 Active (Posted)  
    * 🟡 Pending (System/Intermediate)  
    * 🟠 Waiting Refund  
    * 🟣 Refunded  
    * ⚫ Void

## **2\. Backend: Tiered Cashback Engine (src/services/cashback.service.ts)**

**Upgrade calculateCashbackForTransaction:**

**Logic:**

1. Check account.cashback\_config.  
2. **If has\_tiers is true:**  
   * Calculate TotalSpendInCycle first.  
   * Find the matching Tier (e.g., Spend \> 15M \-\> Tier 1).  
   * Check Transaction Category (Map category\_id to config keys like 'insurance', 'supermarket').  
   * Apply specific Rate & Cap from that Tier.  
3. **If Standard:** Use existing logic.

**Return Structure:**

* bankBackAmount: What the bank gives me.  
* peopleBackAmount: What I gave away (from transaction\_lines).  
* profit: bankBackAmount \- peopleBackAmount.

## **3\. UI: Upgrade Cashback Details (src/app/cashback/page.tsx or \[id\])**

**Layout:**

* **Overview Cards:** Total Earned | Total Shared | **Net Profit**.  
* **Table:** List all Credit Cards.  
  * Columns: Card Name, Cycle Status, Min Spend Progress, Earned, Profit.  
* **Drill-down:** Clicking a card opens a detailed table of transactions in that cycle with columns:  
  * Txn Amount.  
  * **Initial Back** (Bank calculated).  
  * **People Back** (Given).  
  * **Profit** (Difference).

## **4\. Execution Steps**

1. **Table:** Fix the visual style of Pending items.  
2. **Service:** Implement the VPBank logic parser.  
3. **Page:** Build the new Cashback Dashboard with Profit tracking.