# **PROJECT: MONEY FLOW 3.0**

# **PHASE: 52 \- PEOPLE UX OVERHAUL, DASHBOARD FIX & SERVICE PAGE**

**WORKFLOW:**

1. **Branch:** feat/phase-52-people-dashboard-fix  
2. **Safety:** Run npm run build.

**OBJECTIVE:**

1. **CRITICAL FIX:** Dashboard Service is querying transactions.amount which DOES NOT EXIST. It must query transaction\_lines.  
2. **Redesign People Card:** Make it information-dense (Debt Badges, Slot Counts, Actions).  
3. **Compact Dashboard:** Optimize whitespace, smaller charts.  
4. **Feature:** Build /services/\[id\] page (Fixing the Next.js 15 async param bug).  
5. **Config:** Dynamic Favicon.

## **I. CRITICAL BUG FIX: DASHBOARD SERVICE**

**Target:** src/services/dashboard.service.ts

The Error: column transactions.amount does not exist.

The Fix:

* **DO NOT** query transactions directly for sums.  
* **QUERY** transaction\_lines.  
  * **Total Spend:** Sum amount from lines where type\='debit' AND category.type\='expense'.  
  * **Total Income:** Sum amount from lines where type\='credit' AND category.type\='income'.  
* *Note:* Ensure you exclude "Transfer" and "Credit Payment" categories to avoid double counting.

## **II. UI: REDESIGN PeopleCard (src/components/moneyflow/person-card.tsx)**

**New Layout (Compact & Rich):**

* **Header:**  
  * **Left:** Large Avatar (Aspect Square, object-cover, rounded-md). *Fix the tiny circle issue.*  
  * **Right:** Name (Bold) \+ Relation/Role (Small gray).  
* **Middle (Stats):**  
  * **Row 1:** Badges for Debt.  
    * If balance \> 0: 🔴 Chờ thu: \[Amount\]  
    * If balance \< 0: 🟢 Nợ họ: \[Amount\]  
  * **Row 2:** Subscription Slots.  
    * Render small icons (Youtube, Netflix...) or text: 📺 3 Subs.  
* **Footer (Actions):**  
  * **Split Button:** \[ 💸 Cho vay \] | \[ 🤝 Thu nợ \] (Full width or Icon-based).

**Data Fetching:** Ensure getPeople returns aggregated debt balance and subscription stats.

## **III. COMPACT DASHBOARD (src/app/page.tsx)**

**Action:**

* Wrap content in max-w-7xl mx-auto (Constraint width).  
* **Redesign Rows:**  
  * **Row 1 (KPI):** Keep 3 cards but reduce height (Compact mode).  
  * **Row 2 (Main):**  
    * **Left (40%):** "Recent Activity" (List of last 5 transactions \- Compact table, hide unneeded columns).  
    * **Right (60%):** Spend Chart (Reduce height to 300px, move Legend to right).  
  * **Row 3 (Debt & System):** "Top Debtors" (Horizontal list) & "Pending Actions".

## **IV. FEATURE: SERVICE DETAILS PAGE (src/app/services/\[id\]/page.tsx)**

**CRITICAL FIX:** Ensure params is awaited (Next.js 15).

```

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // <--- FIX HERE
  // ... fetch data ...
}

```

**Layout:**

* **Header:** Service Icon (Big) \+ Name \+ Price \+ "Edit" Button.  
* **Tab 1 (Overview):** Chart of cost history (optional) or just stats.  
* **Tab 2 (Members):** The "Check & Slot" list (Editable).

## **V. CONFIG: DYNAMIC FAVICON (src/app/layout.tsx)**

**Action:**

* Check process.env.NODE\_ENV.  
* If 'development': Use /icon-dev.png (Prepare a distinct icon).  
* If 'production': Use /icon.png.  
* *Implementation:* Can be done via \<link rel="icon" ... /\> inside \<head\> or Next.js Metadata API.

## **VI. EXECUTION STEPS**

1. **Backend:** Fix dashboard.service.ts Logic (Priority 1).  
2. **Page:** Build /services/\[id\] and fix the async params bug immediately.  
3. **Component:** Rewrite PersonCard & PeopleList.  
4. **Page:** Refactor Dashboard layout.  
5.   
1. 