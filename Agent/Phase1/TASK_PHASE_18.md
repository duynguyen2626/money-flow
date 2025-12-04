# **AGENT TASK: UNIFY DEBT WORKFLOWS & SMART FORM LOGIC**

**Context:**

1. **Logic Fragment:** Creating a repayment uses SettleDialog, but Editing it uses TransactionForm. This causes UX inconsistency.  
2. **Requirement:** Merge EVERYTHING into TransactionForm.  
3. **Bugs:** Sheet Sync is missing "Shop".  
4. **Smart Features:** Auto-select Shopee for Debt, Auto-use Bank Icon for Repayment.

**Objective:**

1. Refactor TransactionForm to support explicit **Lend (Cho vay)** and **Repay (Thu nợ)** tabs.  
2. Implement Smart Defaults (Auto-fill Shop/Category).  
3. Replace SettleDebtDialog usages with TransactionForm.  
4. Fix Sheet Sync payload.

## **1\. UI: Refactor TransactionForm (src/components/moneyflow/transaction-form.tsx)**

**A. New Tab Structure**

* Replace current tabs with 5 segments (or a dropdown if space is tight, but Tabs preferred for Desktop):  
  * expense (Chi)  
  * income (Thu)  
  * transfer (Chuyển)  
  * debt\_lending (Cho vay \- Out) \-\> Maps to DB Type debt (Amount \> 0).  
  * debt\_repayment (Thu nợ \- In) \-\> Maps to DB Type repayment (Amount \> 0, logic is reversed).

**B. Layout Adjustments**

* **Move Shop Field:** Place it **BELOW** the Category field.  
* **Shop Field Logic:** Show it for Expense, Debt, and Repayment tabs.

**C. Smart Logic (The "Magic")**

* **Effect 1 (Debt Tab):**  
  * IF Tab \== debt\_lending:  
    * Auto-set category\_id \= Find "People Shopping" ID.  
    * Auto-set shop\_id \= Find "Shopee" ID.  
* **Effect 2 (Repayment Tab):**  
  * Watch to\_account\_id (The receiving bank).  
  * Find that Account in the list.  
  * **Visual Trick:** In the "Shop/Source" display area, render the **Bank's Logo** (from account.logo\_url) to indicate "Money came from external \-\> to this Bank".  
  * *Note:* We might not need to save a shop\_id for repayment, but visually showing the destination bank logo as the "Source" context is helpful.

## **2\. UI: Deprecate SettleDebtDialog**

**Action:**

* Go to src/app/people/\[id\]/page.tsx and AccountCard.tsx (Debt type).  
* **Replace** the "Settle" button action.  
* **New Action:** Open TransactionForm with props:  
  * defaultTab="debt\_repayment"  
  * defaultPersonId={currentPersonId}  
  * defaultTag={selectedTag}  
  * defaultAmount={balance}

## **3\. Backend: Fix Sheet Sync (src/services/transaction.service.ts)**

**Action:**

* In createTransaction \-\> SheetService.syncTransaction:  
* **Fix:** The payload is missing shop.  
* **Solution:** Fetch the shops table (join) to get shop.name.  
  * *Optimization:* Since we have shop\_id in input, just pass the shop Name if available in the frontend context, OR perform a quick lookup.  
  * Pass shop: shopName to the SheetService.

## **4\. Execution Steps**

1. **Refactor Form:** Implement the 5-Tab layout and Smart Effects.  
2. **Refactor Integrations:** Update People Page and Dashboard to open this new Form for settlement.  
3. **Fix Backend:** Ensure Sheet Sync includes the Shop Name.