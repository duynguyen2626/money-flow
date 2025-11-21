# **AGENT TASK: BUILD SERVICES UI & AUTOMATION BOT**

Context:  
User needs a UI to manage Subscriptions (YouTube, Netflix...) BEFORE linking them to People.  
Priority Order:

1. Build /services Page (UI to Create/Edit Services).  
2. Update PersonForm (UI to Link Person \<-\> Service).  
3. Implement "Lazy Bot" (Backend Logic).

Objective:  
Full Subscription Management System.

## **1\. UI: Services Manager Page (src/app/services/page.tsx)**

**Layout:**

* **Grid Layout:** Display services as Cards.  
* **Card Content:**  
  * **Icon:** Display image from icon URL (use a default placeholder if empty).  
  * **Info:** Name, Price (VND), Next Billing Date.  
  * **Members:** Show small avatars of subscribed people (fetch from subscription\_members).  
* **Add Button:** Opens ServiceDialog.

**Component: ServiceDialog (Create/Edit)**

* **Fields:**  
  * **Name:** Text (e.g., "Netflix Premium").  
  * **Price:** Number (e.g., 260000).  
  * **Icon URL:** Text (Paste image link). *Show preview.*  
  * **Payment Account:** Dropdown (Select Source Bank/Card).  
  * **Billing Cycle:** Select (Monthly / Yearly).  
  * **Start Date:** Date Picker (To calculate Next Billing Date).

## **2\. UI: Update People Modal (src/components/moneyflow/person-form.tsx)**

**Action:** Now that Services exist, enable the selection logic.

* **Fetch:** Get list of all subscriptions.  
* **UI:** Render a "Service Subscription" section.  
  * List items with Checkboxes.  
  * Show Service Icon \+ Name \+ Cost.  
* **Logic:** When saving Person, update the links in subscription\_members.

## **3\. Backend Logic (src/services/subscription.service.ts)**

**A. CRUD Operations:**

* getSubscriptions(): Include subscription\_members & profiles.  
* createSubscription(...), updateSubscription(...).

**B. checkAndProcessSubscriptions() (The Bot)**

* **Trigger:** Client-side useEffect on App Mount.  
* **Logic:**  
  1. Find due subscriptions (next\_billing\_date \<= TODAY).  
  2. Create Transaction:  
     * **Debit:** Debt for each member (Price / MemberCount).  
     * **Credit:** Payment Account.  
  3. Update next\_billing\_date to next month.  
  4. Return processed list.

## **4\. Execution Steps**

1. **Build UI First:** Create ServiceDialog and /services page.  
2. **Link UI:** Update PersonForm to allow checking services.  
3. **Backend:** Implement the Automation Bot logic.  
4. **Integration:** Add AutomationChecker to Layout to run the bot automatically.