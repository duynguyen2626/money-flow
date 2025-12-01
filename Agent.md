# **PROJECT: MONEY FLOW 3.0**

# **CURRENT STATUS: UI/LOGIC STABILIZED (PHASE 50 DONE)**

# **NEXT PHASE: 51 \- SERVICE SLOTS & DASHBOARD**

**WORKFLOW:**

1. **Branch:** feat/phase-51-slots-dashboard  
2. **Safety:** Run npm run build before finishing.

**OBJECTIVE:**

1. **Service Upgrade:** Allow members to take multiple slots (e.g., 2 slots for 1 person). Logic: 1 Debt Transaction Line with multiplied amount and Note \[Slot: X\].  
2. **Dashboard:** Build the Home Page visuals (Charts, Stats) as previously planned but postponed.

## **I. FEATURE: MULTI-SLOT SUBSCRIPTION (/services)**

**1\. Database Schema**

* Table subscription\_members now has slots (int, default 1).

**2\. UI: Upgrade ServiceDialog**

* **Target:** The Member Selection List.  
* **Change:**  
  * Next to the Checkbox and Name, add a small **Number Input** (min 1).  
  * Show only if Checked.  
  * Default value: 1\.  
  * *Visual:* \[x\] \[Avatar\] Lâm Qty: \[ 2 \].

**3\. Backend: Upgrade Bot Logic (checkAndProcessSubscriptions)**

* **Logic:**  
  1. Calculate TotalSlots \= Sum of all member.slots.  
  2. Calculate UnitCost \= TotalPrice / TotalSlots (assuming "Me" is not taking slots, or "Me" is calculated as remainder).  
     * *Refinement:* If "Me" is just the payer and holds remaining slots implicitly, then UnitCost \= Price / (MemberSlots \+ MySlots).  
     * *Simplification:* For now, assume Price is split among TotalSlots defined.  
  3. **Loop Members to create Debt Lines:**  
     * MemberCost \= UnitCost \* member.slots.  
     * **Note Generation:**  
       * If member.slots \> 1: Append \[Slot: {member.slots}\] to the line description/note.  
       * Else: Keep standard note.

## **II. FEATURE: THE DASHBOARD (src/app/page.tsx)**

**Context:** The home page is currently blank/basic. We need the "Ultimate Dashboard".

**1\. Service: src/services/dashboard.service.ts**

* **getDashboardStats:**  
  * **Net Worth:** Sum of (Bank \+ Cash \+ Savings).  
  * **Monthly Spend:** Sum expense (excluding Transfer/CreditPay).  
  * **Debt Overview:** Sum positive Debt.  
  * **Waiting Money:** Sum System Account balance.

**2\. UI Layout (Using Recharts & Shadcn Cards)**

* **Top Row:** 3 Cards (Net Worth, Spend, Debt).  
* **Middle Row:**  
  * **Left (Chart):** Monthly Expense Breakdown (Donut Chart by Category).  
  * **Right (List):** "Top Debtors" (People who owe you most).  
* **Bottom Row:** "Waiting & Pending" (Batch/Refund status summary).

## **III. EXECUTION STEPS**

1. **Service:** Update subscription.service.ts to handle Slot Math.  
2. **UI:** Update ServiceDialog to input slots.  
3. **Service:** Create dashboard.service.ts.  
4. **UI:** Build the Dashboard Page.  
5. **Verify:** Run build.  
1. 