# **PROJECT: MONEY FLOW 3.0**

# **PHASE: 62 \- SERVICE REBOOT (UNIFIED PAGE & LOGIC)**

**WORKFLOW:**

1. **Branch:** feat/phase-62-service-reboot  
2. **Safety:** Run npm run build.

**OBJECTIVE:**

1. **Rebuild UI:** Create a single powerful page /services that handles CRUD, Member Assignment, and Bot Trigger.  
2. **Logic Rewrite:** Implement distributeServiceCost from scratch with the "Draft Fund" pattern.  
3. **Cleanup:** Delete old subscription.service.ts code and start fresh.

**CONSTANTS:**

* DRAFT\_FUND\_ID: '88888888-9999-9999-9999-111111111111'  
* SERVICE\_CAT\_ID: 'e0000000-0000-0000-0000-000000000088'

## **I. BACKEND: src/services/service-manager.ts (NEW SERVICE)**

**1\. createService(data) / updateService(id, data, members)**

* **Logic:**  
  * Upsert subscriptions.  
  * **Delete** all service\_members for this ID.  
  * **Insert** new members list (with slots).  
  * *Important:* Ensure is\_owner flag is saved if the selected person is "Me".

**2\. distributeService(id) (The Bot Logic)**

* **Step 1: Calculate Math**  
  * Fetch Service \+ Members.  
  * TotalSlots \= Sum(member.slots).  
  * UnitCost \= ServicePrice / TotalSlots.  
* **Step 2: Create Header**  
  * From: DRAFT\_FUND\_ID.  
  * Note: Auto: ${service.name} \[${CurrentMonth}\].  
  * Amount: \-ServicePrice.  
* **Step 3: Create Lines (Loop Members)**  
  * Cost \= UnitCost \* slots.  
  * **If Member is Me (is\_owner):**  
    * Debit: Category SERVICE\_CAT\_ID. (My Expense).  
  * **If Member is Other:**  
    * Debit: Debt Account of that Person. (Their Debt).  
    * Note: ${service.name} (x${slots}).

## **II. FRONTEND: UNIFIED PAGE (src/app/services/page.tsx)**

**Layout:**

* **Header:** Title "Quản lý Dịch vụ" \+ Button "New Service".  
* **Main Content:** Grid of ServiceCard.

**Component: ServiceCard (The Control Center)**

* **Header:** Logo (Shop) | Name | Price.  
* **Body (Member List):**  
  * List rows: Avatar | Name | **Slot Input** (Editable directly).  
  * *Interaction:* Changing slot \-\> Auto-save to DB (Debounced).  
  * **Add Member:** "+ Add" button (Popover to select Person).  
* **Footer (Actions):**  
  * **Status:** "Next Bill: 01/12".  
  * **Action:** Button "⚡ Distribute Now".  
    * Click \-\> Call distributeService \-\> Show Result Toast.

**Component: ServiceCreateDialog**

* Simple form to add Name, Price, Shop.

## **III. CLEANUP\*\***

* Delete src/services/subscription.service.ts (Old/Buggy).  
* Delete src/components/services/\* (Old components).  
* Delete /automation page (Merged here).

## **IV. EXECUTION STEPS**

1. **Service:** Create service-manager.ts with clean logic.  
2. **UI:** Build the ServiceCard with embedded member management.  
3. **Page:** Assemble /services.  
4. **Verify:**  
   * Create "Netflix" (260k).  
   * Add "Lâm" (Slot 1). Add "Me" (Slot 1).  
   * Click Distribute.  
   * Check Transactions: Should see 1 Draft Txn split into 130k Expense (Me) \+ 130k Debt (Lâm).  
1.   
1. 