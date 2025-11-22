# **AGENT TASK: FINAL UI POLISH (CARDS, FILTERS, COMPACT HEADER)**

Context:  
The V2 Card Design is good but needs refinement (Spacing, Colors, Actions).  
The Account Details Page is too spacious/cluttered and lacks advanced filtering features.  
**Objective:**

1. **Polish AccountCard:** Fix layout shifts, custom colored action buttons, move edit icon.  
2. **Upgrade TransactionTable:** Add Year Filter, Searchable Dropdowns, Clear Button.  
3. **Compact Header:** Redesign the Account Details header to group stats efficiently.

## **1\. UI: Polish AccountCard (src/components/moneyflow/account-card.tsx)**

**Visual Changes:**

1. **Header:**  
   * Remove VND icon (Redundant).  
   * **Edit Pencil:** Move to **Absolute Top-Right** (absolute top-3 right-3). Use a subtle gray color, hover to dark.  
2. **Balance:**  
   * Wrap in a subtle badge-like container: bg-gray-50 px-3 py-1 rounded-lg w-fit.  
   * Font: text-2xl font-bold tracking-tight.  
3. **Tag Wrapping Fix:**  
   * Ensure Account Type / Credit Tag uses whitespace-nowrap.  
4. **Quick Actions (The Colorful Row):**  
   * Remove the outer blue container/background.  
   * **Individual Button Styling:**  
     * **Thu (Plus):** bg-emerald-100 text-emerald-600 hover:bg-emerald-200  
     * **Chi (Minus):** bg-rose-100 text-rose-600 hover:bg-rose-200  
     * **Transfer:** bg-blue-100 text-blue-600 hover:bg-blue-200  
     * **Credit Pay:** bg-purple-100 text-purple-600 hover:bg-purple-200  
     * **Debt Pay:** bg-orange-100 text-orange-600 hover:bg-orange-200  
   * **Layout:** Flex row, gap-2. Use \<Tooltip\> for labels.

## **2\. UI: Upgrade Account Details (src/app/accounts/\[id\]/page.tsx)**

**A. Compact Header Stats**

* **Goal:** Combine Info \+ Stats \+ Cashback into one cohesive block.  
* **Layout (Grid):**  
  * **Col 1 (Identity):** Logo, Name, Balance, Type.  
  * **Col 2 (Stats):** A mini-grid of 3 blocks:  
    * Incoming (Green Arrow \+ Amount).  
    * Outgoing (Red Arrow \+ Amount).  
    * Net Flow (Trend Icon \+ Amount).  
  * **Col 3 (Cashback \- If Credit):**  
    * "Cycle: Nov"  
    * "Earned: 500k"  
    * Progress Bar (Mini).

**B. Filter Bar Upgrades**

1. **Year Filter:** Add a Select or Combobox for Year. Default to new Date().getFullYear().  
2. **Search Clear:** Add an 'X' icon button inside the Search Input to clear text (value && \<XIcon onClick={clear} /\>).  
3. **Dropdowns:** Convert "Category" and "Tag" filters to **Searchable Comboboxes** (using cmdk).  
   * *Reason:* Dropdowns are hard to use with many items.

**C. Table Styling**

* Change "Edit/Action" buttons in the table row from Blue Background to variant="ghost" or variant="outline" (Gray/White) to reduce visual noise.

## **3\. Execution Steps**

1. **Refactor Card:** Update CSS classes in AccountCard. Implement the color mapping for actions.  
2. **Refactor Header:** Create a new AccountStatsHeader component for the Details page.  
3. **Refactor Filters:** Update the Toolbar in TransactionTable to include Year and Searchable selects.