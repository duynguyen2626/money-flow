# **AGENT TASK: PHASE 52 \- PEOPLE UX OVERHAUL & DASHBOARD COMPACTING**

**Context:**

1. **UI Feedback:** People Cards are too empty/basic. User wants rich details (Debt Badges, Slot Counts, Actions).  
2. **Bug:** Mismatch data between Transaction List and People Details (likely orphaned person\_ids).  
3. **Dashboard:** Too wide/empty. Needs compaction and more useful widgets.  
4. **Service:** Move Edit to a dedicated page /services/\[id\].

**Objective:**

1. Redesign PeopleCard to be information-dense and actionable.  
2. Compact the Dashboard Layout.  
3. Build /services/\[id\] page.  
4. Data Cleanup (Orphan check).

## **1\. UI: Redesign PeopleCard (src/components/moneyflow/person-card.tsx)**

**New Layout (Compact & Rich):**

* **Header:**  
  * **Left:** Large Avatar (Round/Square, object-cover).  
  * **Right:** Name (Bold) \+ Relation/Role (Small gray).  
* **Middle (Stats):**  
  * **Row 1:** Badges for Debt.  
    * If balance \> 0: 🔴 Chờ thu: \[Amount\]  
    * If balance \< 0: 🟢 Nợ họ: \[Amount\]  
  * **Row 2:** Subscription Slots.  
    * Render small icons (Youtube, Netflix...) or text: 3 Subs (5 slots).  
* **Footer (Actions):**  
  * **Split Button:** \[ 💸 Cho vay \] | \[ 🤝 Thu nợ \] (Full width or Icon-based).

**Data Fetching:** Ensure getPeople returns aggregated debt balance and subscription stats.

## **2\. UI: Compact Dashboard (src/app/page.tsx)**

**Action:**

* Wrap content in max-w-6xl mx-auto (Constraint width).  
* **Redesign Rows:**  
  * **Row 1 (KPI):** Keep 3 cards but reduce height.  
  * **Row 2 (Main):**  
    * **Left (40%):** "Recent Activity" (List of last 5 transactions \- Compact view).  
    * **Right (60%):** Spend Chart (Reduce height to 300px).  
  * **Row 3 (Debt & System):**  
    * "Top Debtors" (Horizontal list or Grid).  
    * "Pending Actions" (Batch/Refunds).

## **3\. Feature: Service Details Page (src/app/services/\[id\]/page.tsx)**

**CRITICAL FIX:** Ensure params is awaited (Next.js 15).

```

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // <--- FIX HERE
  // ... fetch data ...
}

```

**Layout:**

* **Header:** Service Icon (Big) \+ Name \+ Price.  
* **Tab 1 (Overview):** Chart of cost history (optional) or just stats.  
* **Tab 2 (Members):** The "Check & Slot" list (Editable).  
* **Tab 3 (Settings):** Edit Name, Shop, Account, Note Template.

## **4\. Execution Steps**

1. **Component:** Rewrite PersonCard (Add badges, slots).  
2. **Page:** Refactor Dashboard layout (CSS Grid tweaks).  
3. **Page:** Build /services/\[id\] and fix the async params bug.  
4. **Verify:** Run build.  
5. 