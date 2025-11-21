# **AGENT TASK: BUILD SUBSCRIPTION MANAGER & AUTOMATION BOT**

Context:  
The User manages recurring services (YouTube, iCloud, Netflix...).  
We need a system to:

1. Manage these subscriptions (Edit Price, Members, Billing Cycle).  
2. **Auto-generate transactions** when the billing date arrives.

**Objective:**

1. Build /services page (List & Edit).  
2. Implement the "Lazy Bot" logic to check and process due subscriptions.

## **1\. Backend Logic (src/services/subscription.service.ts)**

**A. checkAndProcessSubscriptions() (The Bot)**

* **Logic:**  
  1. Query subscriptions table where next\_billing\_date \<= TODAY.  
  2. Loop through each due subscription:  
     * Create a **Parent Transaction** (Expense). Note: "Auto-generated for \[Service Name\]".  
     * Query subscription\_members.  
     * **Create Transaction Lines (Split Logic):**  
       * Line 1 (Credit): Payment Account (Full Amount).  
       * Line 2 (Debit): My Expense (Amount \- Members' Share).  
       * Line 3..N (Debit): Debt for Member A, Member B... (Based on fixed\_amount or percentage).  
     * **Update Subscription:** Set next\_billing\_date \= next\_billing\_date \+ 1 month (logic varies by cycle).  
  3. Return summary: { processedCount: number, names: string\[\] }.

**B. CRUD Operations**

* getSubscriptions(): List all with member details.  
* updateSubscription(id, data): Edit members/price.

## **2\. UI: Services Page (src/app/services/page.tsx)**

**Layout:**

* **List of Services:** Cards showing Name, Price, Next Billing Date.  
* **Status Badge:** "Active" or "Due Soon".  
* **Edit Dialog:** Allow adding/removing members (People) and setting their share.

## **3\. UI: Automation Trigger (src/components/moneyflow/automation-checker.tsx)**

**Concept:** A hidden component or a small indicator in the Dashboard Header.

* **On Mount (useEffect):** Call checkAndProcessSubscriptions.  
* **Feedback:** If transactions are created, show a **Toast** notification: "⚡ Đã tự động tạo 2 giao dịch định kỳ: Youtube, iCloud".

## **4\. Execution Steps**

1. Implement the checkAndProcessSubscriptions logic (Complex Split Transaction).  
2. Build the UI to Manage Services.  
3. Add the Trigger to the Main Layout (so it runs whenever app is opened).