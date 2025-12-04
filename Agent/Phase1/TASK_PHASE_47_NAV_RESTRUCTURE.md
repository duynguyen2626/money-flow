# **AGENT TASK: PHASE 47 \- NAVIGATION OVERHAUL & UI CONSOLIDATION**

**Context:**

1. **Navigation:** Left Sidebar needs reordering, better icons, and proper "Active State" handling for nested routes.  
2. **Consolidation:** Merge Debt features into People Cards clearly.  
3. **Missing UI:** Build /categories page and manager.  
4. **Bugs:** Transaction Form defaults to "Subscription" incorrectly. "Money Transfer" category isn't editable.

**Objective:**

1. Rebuild AppLayout Navigation.  
2. Enhance PeopleCard with Badges & Actions.  
3. Build CategoryManager page.  
4. Fix Form Logic bugs.

## **1\. UI: Navigation Re-structure (src/components/moneyflow/app-layout.tsx)**

**A. Menu Items Order & Icons:**

1. **Overview** (/) \- Icon: LayoutDashboard  
2. **Transactions** (/transactions) \- Icon: List  
3. **Refunds** (/refunds) \- Icon: Undo2 (New\!)  
4. **Accounts** (/accounts) \- Icon: Landmark (Bank)  
5. **People** (/people) \- Icon: Users  
6. **Cashback** (/cashback) \- Icon: RotateCw (or BadgePercent)  
7. **Categories** (/categories) \- Icon: Tags  
8. **Shops** (/shops) \- Icon: Store  
9. **Batch Transfer** (/batch) \- Icon: Layers  
10. **Services** (/services) \- Icon: Zap

**B. Active State Logic:**

* **Current:** Exact match (pathname \=== href).  
* **Fix:** Prefix match (pathname.startsWith(href)).  
  * *Exception:* Overview (/) should be exact match.

## **2\. UI: Category Manager (src/app/categories/page.tsx)**

**A. Layout:**

* **Tabs:** \[Expense\] | \[Income\] | \[Transfer\].  
* **List:** Grid of Category Cards (Icon/Image \+ Name).  
* **Action:** "Add Category" Button.

**B. CategoryDialog:**

* Fields: Name, Type (Hidden/Derived from Tab), Icon (Emoji), Image URL.  
* **Fix "Money Transfer":** Ensure System Categories are editable (or at least their Image/Icon). If ID is system-protected, allow updating fields but not ID.

## **3\. UI: People Card Enhancement (src/components/moneyflow/person-card.tsx)**

**Action:**

* **Badges:**  
  * If balance \> 0 (They owe me): Badge Red Wait: \[Amount\].  
  * If balance \< 0 (I owe them): Badge Green Owe: \[Amount\].  
* **Quick Actions (Bottom Row):**  
  * \[HandCoins\] **Lend** (Open Txn Form: Tab=Lend, Person=This).  
  * \[Banknote\] **Repay** (Open Txn Form: Tab=Repay, Person=This).

## **4\. Fix Logic Bugs**

**A. Category "Subscription" Default Bug**

* **Diagnosis:** TransactionForm might be defaulting to the first available category if none selected, or useEffect logic is flawed.  
* **Fix:** Ensure category\_id is **NULL** (or empty string) when opening a fresh form, unless a specific default is passed.  
* **Check:** Look for form.setValue calls in useEffect that set category based on type. Remove any hardcoded "Subscription" fallback.

**B. Table Links (UnifiedTransactionTable)**

* **Person Column:** Wrap name in \<Link href={'/people/' \+ person.id} ...\>.  
* **Account Column:** Wrap name in \<Link href={'/accounts/' \+ account.id} ...\>.

## **5\. Execution Steps**

1. **Nav:** Update AppSidebar items and logic.  
2. **Page:** Build /categories page.  
3. **Component:** Update PeopleCard and UnifiedTransactionTable.  
4. **Debug:** Fix the Form category default bug.  
*   
* 