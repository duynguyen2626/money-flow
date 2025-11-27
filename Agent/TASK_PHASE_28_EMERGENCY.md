# **AGENT TASK: EMERGENCY UI FIXES (PEOPLE PAGE & TABLE)**

Context:  
The Refactor caused severe UI regressions:

1. **Missing Actions:** "Add Debt" and "Settle" buttons are missing from the People Header.  
2. **Ugly Table:** Shop Name dominates the Note column. Images (Category/Account) are missing.  
3. **Wrong Default:** Debt transactions default to "Adjustment" instead of "Lending".

Objective:  
Restore the UI polish and fix the data mapping bugs.

## **1\. Frontend: Fix PeopleDetailPage (src/app/people/\[id\]/page.tsx)**

**A. Restore Header Actions**

* **Location:** Inside the Header Card (next to Balance or Name).  
* **Design:** Two clear buttons (Icon \+ Text or Tooltip).  
  * 🔴 **Add Debt:** Icon Plus. Variant destructive (or outline red).  
  * 🟢 **Settle:** Icon Check. Variant default (green).  
* **Function:** Ensure they open TransactionForm with the correct tabs (debt\_lending / debt\_repayment).

**B. Fix Debt Cards**

* Ensure the Debt Cycle Cards are visible and compact.

## **2\. Frontend: Polish UnifiedTransactionTable (src/components/moneyflow/unified-transaction-table.tsx)**

**A. Fix Note/Shop Column**

* **Current:** Shop Name (Big) \- Note (Small).  
* **Fix:** **Note (Big/Bold)** \- Shop Name (Small/Gray/Under).  
  \<div className="flex flex-col"\>  
     \<span className="font-medium text-gray-900"\>{row.note || 'No Note'}\</span\>  
     {row.shop\_name && (  
       \<span className="flex items-center gap-1 text-xs text-gray-500"\>  
         \<img src={row.shop\_logo} className="w-4 h-4 object-contain"/\>   
         {row.shop\_name}  
       \</span\>  
     )}  
  \</div\>

**B. Fix Images (Category & Account)**

* **Bug:** Images are not showing.  
* **Check:** Inspect row.category.image\_url and row.source\_account.logo\_url.  
* **Fallback:** If URL is missing, render the Emoji icon or a default lucide icon. Don't render broken image tag.

## **3\. Logic: Fix Defaults (src/components/moneyflow/transaction-form.tsx)**

**Action:** Update useEffect for default values.

**Logic:**

* **IF Tab \== debt\_lending:**  
  * Set Category \= **"Lending"** (ID: ...89 from SQL).  
  * *Do NOT use "Adjustment".*  
* **IF Tab \== debt\_repayment:**  
  * Set Category \= **"Debt Repayment"** (...96).

## **4\. Execution Steps**

1. **Page:** Move Action Buttons to People Header.  
2. **Table:** Swap Note/Shop priority and fix image rendering.  
3. **Form:** Hardcode the correct Category IDs for Debt tabs.  
4. **Verify:** Run build.