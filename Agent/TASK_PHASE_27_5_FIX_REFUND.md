# **AGENT TASK: FIX REFUND CATEGORY ERROR & UI FEEDBACK**

**Context:**

1. **Critical Error:** "Refund system category not found" when submitting. The code is looking for a category that doesn't exist or has a wrong ID.  
2. **Logic Error:** The Payload sends type: 'refund', but the Database expects 'income' or 'expense'.  
3. **UX Issue:** Disabled fields provide no feedback (user doesn't know why they are locked).

**Objective:**

1. Hardcode the Refund Category ID (e0000000-0000-0000-0000-000000000095) in the service.  
2. Ensure Refund transactions are saved as type: 'income'.  
3. Add Visual Cues (Lock Icon) to disabled form fields.

## **1\. Backend: Fix requestRefund (src/services/transaction.service.ts)**

**Action:** Use the Fixed ID.

**Logic Update:**

* **Category ID:** const REFUND\_CAT\_ID \= 'e0000000-0000-0000-0000-000000000095';  
* **Transaction Type:** Always set type: 'income' (Money comes back).  
* **Payload Construction:**  
  * If person\_id exists (Debt Refund) \-\> Type is technically income but logically repayment (handled by Unified Table logic). Let's stick to 'income' in DB for safety, or 'repayment' if enum allows.  
  * *Decision:* Save as 'income'.

## **2\. Frontend: Fix TransactionForm (src/components/moneyflow/transaction-form.tsx)**

**A. Auto-Fill Logic (useEffect on mode='refund')**

* Set type \= 'income'.  
* Set category\_id \= 'e0000000-0000-0000-0000-000000000095'.  
* **Important:** Ensure the Category Dropdown *actually contains* this ID (fetch it if not in the default list).

**B. UI Polish: Disabled Fields**

* Update the Select and Input wrappers.  
* If disabled={true}:  
  * Add a background color (bg-gray-100).  
  * Add a **Lock Icon** (Lock from lucide-react) on the right side.  
  * Add a **Tooltip** or Title: "This field is locked in Refund mode".

**C. Language**

* Ensure all labels are English ("Category", "Account", "Amount"...).

## **3\. Execution Steps**

1. **Service:** Update transaction.service.ts with the hardcoded ID and 'income' type.  
2. **Form:** Implement the auto-fill useEffect and the Lock Icon UI.  
3. **Verify:** Run npm run build.