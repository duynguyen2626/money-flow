# **AGENT TASK: PHASE 31 \- RADICAL UNIFICATION & INFINITE LOOP FIXES**

Context:  
The UI is fragmented. /people/\[id\] and /accounts/\[id\] are still using legacy or divergent table implementations despite previous attempts.  
The "Unified Table" in /transactions looks good but has bugs (Type overflow, Missing Accounts, Infinite Loops).  
We need to standardize EVERYTHING to use one single source of truth for the transaction list.  
**Critical Bugs:**

1. **Infinite Loops:** Maximum update depth exceeded in FilterableTransactions and TooltipPortal.  
2. **Data Gaps:** Account column is empty/null in many cases.  
3. **Visual:** Type badges wrap text (e.g., "TF \\n In"), Person column bleeds.

**Objectives:**

1. **Unify:** Replace the transaction list in /people/\[id\] and /accounts/\[id\] with the EXACT SAME \<FilterableTransactions /\> component used in /transactions.  
   * *Constraint:* Just hide the redundant column (e.g., Hide People col in People Page).  
2. **Fix Loops:** Resolve the setState inside useMemo/useEffect dependency cycles.  
3. **Polish UI:** Fix "TF In" wrapping, Category Thumbnails, and Account Data mapping.

## **1\. Critical Fix: Infinite Loops**

**A. src/components/moneyflow/filterable-transactions.tsx**

* **Error:** setBulkActions(prev \=\> ...) inside useMemo or a fast-firing useEffect.  
* **Fix:** Move the state update logic for bulk actions **OUT** of useMemo. Use useEffect dependent *only* on selectedTxnIds changes, or handle it directly in the selection handler.

**B. src/components/ui/custom-tooltip.tsx**

* **Error:** useEffect setting state in a way that triggers re-renders of the Portal continuously.  
* **Fix:** Check if mounted state toggling is causing a layout thrashing. Ensure it only sets mounted once on mount.

## **2\. Code Unification (The "One Table" Rule)**

**A. Refactor /people/\[id\]/page.tsx & /accounts/\[id\]/page.tsx**

* **Action:**  
  * Import FilterableTransactions from @/components/moneyflow/filterable-transactions.  
  * **Pass Props:**  
    \<FilterableTransactions  
      transactions={transactions} // Ensure this data structure matches EXACTLY what /transactions uses  
      categories={categories}  
      accounts={accounts}  
      people={allPeople}  
      shops={shops}  
      accountId={id} // For smart source logic  
      hidePeopleColumn={true} // For People Page  
      // hideAccountColumn={true} // For Account Page (Optional)  
    /\>

* **Data Prep:** Ensure getAccountTransactions returns the *exact same* TransactionWithDetails structure as getRecentTransactions. *Do not map it differently.*

## **3\. UI Polish & Data Mapping**

**A. "Type" Column Wrapping**

* **Issue:** "TF In" breaks into two lines.  
* **Fix:** Add whitespace-nowrap to the Type Badge container.  
* **Rename:** Shorten to "TF-In", "TF-Out" if needed, or just ensure container width is sufficient (min-w).

**B. "Category" Thumbnails**

* **Issue:** Missing icons.  
* **Fix:** In renderCell \-\> category:  
  * If txn.shop\_logo\_url exists \-\> Show Shop Logo.  
  * If category.icon exists \-\> Show it.  
  * Else \-\> Show Default Category Icon (Folder/Tag).

**C. "Account" Column Empty**

* **Issue:** Data is missing.  
* **Fix:** In transaction.service.ts \-\> mapTransactionRow:  
  * Ensure account\_name, source\_name, destination\_name are **always** populated.  
  * *Fallback:* If source\_name is null, use "Unknown". Do not leave it empty string.  
  * Debug the resolveAccountMovementInfo function to ensure it catches the Bank Account even in complex Debt/Repayment lines.

## **4\. Verification**

**Mandatory:**

1. **Loop Check:** Open Console. Ensure no "Maximum update depth" red errors appear.  
2. **Visual:** Go to /people/\[id\]. It must look **identical** to /transactions (same headers, same spacing), just without the People column.  
3. **Build:** npm run build must pass.

Message to Agent:  
"Jules, execute Phase 31\. Priority 1 is fixing the Infinite Loops. Priority 2 is replacing the People/Account detail tables with the main FilterableTransactions component. No more separate implementations."