# **AGENT TASK: EMERGENCY UI RESTORATION & FINAL POLISH**

CRITICAL CONTEXT:  
The Phase 27 Refactor accidentally DELETED the "Debt Cycle Cards" and the "Header Action Buttons" (Add Debt / Settle) from the People Page.  
The UI is currently broken (Actions appear below table, Cards are missing).  
**Objective:**

1. **Restore Debt Cards:** Re-implement the Grid of compact cards (NOV25, OCT25...) above the table.  
2. **Restore Header Actions:** Move "Add Debt" and "Settle" buttons back to the Profile Header (Top Right).  
3. **UI Polish:** Fix Sort Icons (Arrows) and Account Naming (English).

## **1\. Frontend: Restore src/app/people/\[id\]/page.tsx**

**A. Layout Structure (Fix Position)**

* **Header Section:**  
  * Avatar | Name | Net Balance.  
  * **ACTIONS (Top Right):**  
    * 🔴 Add Debt (Icon: Plus, Variant: Destructive/Red).  
    * 🟢 Settle (Icon: Check/Dollar, Variant: Default/Green).  
    * *Note:* Do NOT put these below the table.  
* **Middle Section (RESTORE THIS):**  
  * **Debt Cycle Grid:**  
    * Fetch getDebtByTags(id).  
    * Render Grid of Cards (DebtCycleCard).  
    * *Features:* Year Filter (Tabs), Compact Design.  
    * *Card Actions:* Small Icon Buttons (Add/Settle) on each card.  
* **Bottom Section:**  
  * UnifiedTransactionTable.

**B. Debt Cycle Card Component**

* Ensure it handles the \-0 math bug (amount \=== 0 ? 0 : amount).  
* Show "Principal" and "Back" info if available.

## **2\. Frontend: Polish UnifiedTransactionTable**

**A. Sort Icons**

* **Current:** Text "Sort"?  
* **Fix:** Use Icons from lucide-react.  
  * Default: ArrowUpDown (Gray).  
  * Asc: ArrowUp (Active Color).  
  * Desc: ArrowDown (Active Color).  
* **Placement:** Right next to the Column Header Text.

**B. Account Name English**

* The Database has been updated via SQL. Ensure the Frontend fetches the latest name string.

## **3\. Execution Steps**

1. **Re-implement UI:** Rewrite the PeopleDetailPage JSX to include the missing Sections (Header Actions \+ Cycle Grid).  
2. **Update Table:** Replace Sort Text with Sort Icons.  
3. **Verify:** Run npm run build.