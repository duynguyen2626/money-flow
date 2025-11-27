# **AGENT TASK: PHASE 27 \- PEOPLE PAGE RECONSTRUCTION & UNIFIED LOGIC**

**CRITICAL INSTRUCTION:**

* **Branch Name:** feature/phase-27-people-reconstruction  
* **Build Check:** Run npm run build BEFORE reporting completion.  
* **Strategy:** **DELETE** the old logic in PeopleDetailPage. **REWRITE** it using UnifiedTransactionTable and TransactionService (Standardized Mode).

Context:  
The /people/\[id\] page is riddled with legacy bugs (wrong Type colors, missing Shop icons, confusing "Source Account" display).  
We are abandoning the custom "Debt Table" approach and switching to the Unified Transaction System used in /transactions.  
**Objectives:**

1. **Rebuild People Page:** Use UnifiedTransactionTable.  
2. **Fix Logic (The "Owner Perspective"):**  
   * Lending \= **OUT** (Red). Source Column must show the **Real Payment Account** (e.g., VCB), NOT the Debt Account.  
   * Repayment \= **IN** (Green/Blue). Target Column must show the **Receiving Account**.  
3. **Merge Phase 23 (Refunds):** Implement the "Refund Mode" in TransactionForm now.  
4. **UI Polish:** Rename "Quick Add" to "Add a Debt". Remove redundant labels.

## **1\. Backend: Enhance getUnifiedTransactions (src/services/transaction.service.ts)**

Logic Update for context: 'person'  
When fetching transactions for a Person View:

* **Smart Source Mapping:**  
  * If type is 'debit' (Lending/Expense): Find the CREDITED account line (The source of money). Set source\_name / source\_logo to *that* account.  
  * *Fix:* Do NOT return the Debt Account itself as the source.  
* **Force Type:**  
  * Lending \-\> Force display\_type \= 'OUT'.  
  * Repayment \-\> Force display\_type \= 'IN'.  
* **Shop/Category:** Ensure shop\_logo and category\_name are populated correctly (Fix the "Uncategorized" bug by checking default\_category\_id of Shop).

## **2\. Frontend: Rebuild /app/people/\[id\]/page.tsx**

**Action:**

* Delete existing table/list code.  
* Import UnifiedTransactionTable.  
* **Render:**  
  \<UnifiedTransactionTable  
    data={transactions}  
    context="person"  
    hiddenColumns={\['people'\]} // Hide "People" column since we are on their page  
  /\>

**Header Actions:**

* **"Add a Debt" Button:**  
  * Opens TransactionForm.  
  * Props: defaultTab="debt\_lending", defaultPersonId={id}, defaultType="expense".  
* **"Settle" Button:**  
  * Opens TransactionForm.  
  * Props: defaultTab="debt\_repayment", defaultPersonId={id}.

## **3\. Frontend: Merge Phase 23 (Unified Refund) into TransactionForm**

**Action:** Implement the Refund Logic in src/components/moneyflow/transaction-form.tsx.

**New Logic:**

* Accept prop mode?: 'create' | 'edit' | 'refund'.  
* **IF mode \=== 'refund':**  
  * Show **"Refund Status"** Toggle: \[Received\] vs \[Pending\].  
  * **Auto-Fill:**  
    * Category: "Refund" (ID: ...95).  
    * Note: "Refund: \[Old Note\]".  
    * Shop: \[Old Shop\].  
  * **Account Logic:**  
    * Pending \-\> Set Account \= **System Account** (9999...). Disable dropdown.  
    * Received \-\> Set Account \= Original Source. Enable dropdown.

## **4\. Execution Steps**

1. **Backend:** Update transaction.service.ts to handle the "Person Context" source mapping.  
2. **Form:** Implement the Refund Mode and Add Debt preset logic.  
3. **Page:** Rewrite PeopleDetailPage completely.  
4. **Verify:** Run build.