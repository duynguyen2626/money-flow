# **AGENT TASK: FIX BOT EXECUTION & ADD PERSON TRACKING**

**Context:**

1. **Schema Update:** We added person\_id to transaction\_lines for explicit reporting.  
2. **Bot Logic:** Ensure the Automation Bot populates this new field and correctly creates the Double-Entry transaction structure.

**Objective:**

1. Update createTransaction service to save person\_id.  
2. Verify/Fix checkAndProcessSubscriptions (The Bot) to generate proper Lines.

## **1\. Update src/services/transaction.service.ts**

**Action:** Update createTransaction function.

**Logic Change:**

* When preparing transaction\_lines:  
  * Check if line.account\_id is provided.  
  * If yes, check if that account is a **DEBT** account (cache accounts or check type).  
  * OR simpler: The UI/Service Input usually knows the personId (from the Form).  
  * **Rule:** If personId is passed in the input (for Debt transactions), save it to person\_id column in the Line.

## **2\. Update src/services/subscription.service.ts (The Bot)**

**Action:** Refine checkAndProcessSubscriptions.

Logic Flow (Double Entry Verification):  
For a Service (Price: 166k, Members: 2 \+ Me):

1. **Header:** transactions (Note: "Auto Youtube", Tag: "NOV25").  
2. **Line 1 (Credit):**  
   * account\_id: Payment Source (VCB).  
   * amount: **\-166,000**.  
   * type: 'credit'.  
3. **Line 2 (Debit \- Member 1):**  
   * account\_id: Debt Account of Member 1 (Get from subscription\_members join).  
   * **person\_id**: **Member 1 ID** (NEW).  
   * amount: \+55,333 (Share).  
   * type: 'debit'.  
4. **Line 3 (Debit \- Member 2):**  
   * account\_id: Debt Account of Member 2\.  
   * **person\_id**: **Member 2 ID** (NEW).  
   * amount: \+55,333.  
5. **Line 4 (Debit \- Me/Expense):**  
   * category\_id: Expense Category.  
   * amount: \+55,334.

## **3\. Execution Steps**

1. Modify transaction.service.ts to handle person\_id writing.  
2. Modify subscription.service.ts to include person\_id in the debt lines it generates.  
3. **Manual Test:** Click the "Lazy Bot" icon again (after SQL update).