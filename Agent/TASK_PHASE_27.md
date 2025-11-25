# **AGENT TASK: PHASE 27 \- FINAL UI POLISH & LEGACY CLEANUP**

Context:  
We have stabilized the core logic (Refunds, Cycle Persistence). However, significant UI/UX issues persist:

1. **Tooltips:** Overflowing text, browser tooltip conflicts, and double rendering in Transaction Table.  
2. **Navigation:** Unresponsive clicks, missing loading indicators, and browser tooltip interference.  
3. **Legacy Debt:** The Transaction History sections in /people/\[id\] and /accounts/\[id\] are using outdated, broken code.

**Objectives:**

1. **Fix Tooltips:** Ensure custom tooltips render correctly without browser interference or truncation.  
2. **Enhance Navigation:** Add active states, loading indicators, and fix the "Refunds" link.  
3. **Clean Legacy Code:** Remove broken transaction tables from Detail pages and replace with a "Future Implementation" placeholder or the unified table (if stable).

## **1\. UI Fixes: Tooltips & Display (src/components/moneyflow/unified-transaction-table.tsx)**

**A. Fix "Refund" Tooltip Truncation**

* **Issue:** Long notes like "Treo hoàn tiền \=\> Bidv..." are cut off.  
* **Fix:**  
  * Ensure the TooltipContent has max-w-\[300px\] (or similar) and whitespace-normal (text wrapping) enabled.  
  * Remove truncate from the inner text *inside* the tooltip content.

**B. Fix Double Tooltips (Transfer)**

* **Issue:** Transfer rows seem to trigger two tooltips or overlap.  
* **Fix:** Check the renderCell logic for type or account.  
  * Ensure you are not wrapping the cell content in a Tooltip *twice* (e.g., once for the icon, once for the text).  
  * Use a single Tooltip wrapping the entire cell content if needed.

## **2\. Navigation Bar Enhancements (src/components/moneyflow/sidebar-nav.tsx)**

**A. Fix "Unclickable" Refunds Link**

* **Diagnosis:** Check src/components/moneyflow/app-layout.tsx or sidebar-nav.tsx. Ensure the href="/refunds" matches the actual page path exactly.  
* *Verify:* Does src/app/refunds/page.tsx exist and export a default component?

**B. Custom Tooltips vs Browser Tooltips**

* **Issue:** Hovering nav items shows the raw title attribute (browser default) AND the app's tooltip.  
* **Fix:** Remove the title="..." attribute from the \<Link\> or \<button\> elements in the Sidebar. Rely *only* on the Shadcn \<Tooltip\> component.

**C. Loading Indicator**

* **Requirement:** When a user clicks a nav item, show a small spinner or opacity change *immediately* on the clicked item while the new page loads.  
* *Implementation:* Use a local state isNavigating or useTransition (if using router.push) to trigger visual feedback. However, since Link is standard Next.js, you might just add a global progress bar (like nprogress) or simple active state styling. *For now, ensure the active class applies immediately.*

## **3\. Legacy Cleanup (/people/\[id\] & /accounts/\[id\])**

**A. Remove Broken Transaction Tables**

* **Context:** The tables in these detail pages are outdated versions showing wrong data (e.g., Income vs Expense mismatch).  
* **Action:**  
  * **Delete** the \<FilterableTransactions /\> or manual table code block in src/app/people/\[id\]/page.tsx and src/app/accounts/\[id\]/page.tsx.  
  * **Replace with:** A simple Placeholder Component.  
    \<div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-500"\>  
      \<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50"\>  
        \<ConstructionIcon className="h-6 w-6 text-slate-400" /\>  
      \</div\>  
      \<p className="font-medium"\>Transaction History\</p\>  
      \<p className="text-xs"\>This module is being unified. Check the main Transactions page for details.\</p\>  
    \</div\>

  * *Reason:* Better to show "Not Ready" than wrong data. We will re-introduce the Unified Table later when it's 100% bug-free.

## **4\. Verification Steps (Mandatory)**

1. **Lint & Build:** Run npm run lint and npm run build.  
2. **Tooltip Test:** Hover over a long Note in the Transactions table. It should wrap and show full text.  
3. **Nav Test:** Click "Refunds". It should navigate without needing Ctrl+Click. No system tooltip should appear.  
4. **Cleanup Test:** Go to a Person Detail page. The broken table should be gone, replaced by the placeholder.

Message to Agent:  
"Jules, execute Phase 27\. Focus on cleaning up the UI noise (Tooltips) and removing the broken legacy tables. Ensure the Navigation is smooth and 'Refunds' is accessible."