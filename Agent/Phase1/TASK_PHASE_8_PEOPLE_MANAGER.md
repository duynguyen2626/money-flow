# **AGENT TASK: BUILD PEOPLE MANAGER & SMART DEBT SELECTION**

**Context:**

1. **Missing Module:** We need a People management page to prepare for Subscriptions.  
2. **Bad UX:** Currently, the Transaction Form asks users to select a "Debt Account" (e.g., "Nợ phải thu \- Lâm"). Users want to select the **Person** (e.g., "Lâm") and have the system auto-select the account.

**Objective:**

1. Build /people page (List & Create).  
2. Upgrade TransactionForm to support "Person Selection" mode for Debt transactions.

## **1\. Backend Logic (src/services/people.service.ts)**

**A. createPerson(name: string, email?: string)**

* **Atomic Operation:**  
  1. Insert into profiles \-\> Get newProfileId.  
  2. **Auto-create Debt Account:**  
     * Insert into accounts:  
       * name: Nợ phải thu \- ${name}  
       * type: 'debt'  
       * owner\_id: newProfileId  
       * currency: 'VND'  
       * current\_balance: 0

**B. getPeople()**

* Fetch all profiles.  
* **Crucial:** Also fetch their linked debt\_account\_id.  
* *Return:* { id, name, avatar, debtAccountId }\[\].

**C. ensureDebtAccount(personId, personName) (Self-healing)**

* Check if this person has a debt account.  
* If NOT, create one immediately and return its ID.

## **2\. UI: People Manager (src/app/people/page.tsx)**

**Layout:**

* **Header:** "Quản lý thành viên".  
* **Add Button:** Opens CreatePersonDialog.  
* **List:** Grid of Cards (Avatar \+ Name \+ Email).  
  * Clicking a card navigates to /people/\[debtAccountId\] (The Detail Page we built in Phase 8).

## **3\. UI: Upgrade Transaction Form (src/components/moneyflow/transaction-form.tsx)**

**Logic Update for "Debt/Loan" Tab:**

Current: \<Combobox options={accounts} ... /\>  
New Logic:

* **IF** type \=== 'expense' or income: Show Account List (Bank/Cash).  
* **IF** type \=== 'transfer' (Context: Lending/Borrowing):  
  * **Source Field:** Show Account List (Bank/Cash) \-\> "Lấy tiền từ đâu?".  
  * **Target Field:** **Show People List** \-\> "Cho ai vay?".  
  * *Interaction:*  
    * User selects "Lâm" (Person).  
    * Component finds Lâm's debtAccountId.  
    * **Safety Check (Warning Logic):**  
      * IF debtAccountId found: Form sets account\_id \= debtAccountId. Status: OK.  
      * IF debtAccountId NOT found (Missing link):  
        * Show Warning: "⚠️ Người này chưa có tài khoản nợ."  
        * Action: Show a button "Tạo liên kết ngay". On Click \-\> Call ensureDebtAccount \-\> Update Form.

**Visuals:**

* The Dropdown should show Avatar \+ Name.

## **4\. Execution Steps**

1. Create people.service.ts with the "Auto-create Account" logic.  
2. Build the /people page & Create Dialog.  
3. Refactor TransactionForm to swap the Dropdown source based on Transaction Type.