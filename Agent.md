# **MILESTONE 3 \- PHASE 2: RESPONSIVE UI & VISUAL POLISH**

**Goal:** Optimize Layout for Mobile/Tablet, "Freeze" Transaction Table, Compact Data Display (Icons), and enable iOS Shortcut integration.

## **1\. Git Convention**

* **Branch:** `feat/M3-P2-responsive-polish`  
* **Commit:** `[M3-P2] feat: ...`

  ## **PART A: RESPONSIVE LAYOUT & FIXES**

  ### **1\. Fix Account Card Overflow**

**File:** `src/components/moneyflow/account-card.tsx` **Bug:** Image breaks out of card layout when zoomed or on small screens. **Fix:**

* Ensure the image container has: `relative w-full aspect-video overflow-hidden rounded-t-lg`.  
* Ensure the `Image` (Next.js) or `img` tag has: `object-cover w-full h-full`.

  ### **2\. Fix Transaction Table Scroll (The "Freeze" Effect)**

**File:** `src/components/moneyflow/transaction-table.tsx` (and `unified-transaction-table.tsx`) **Requirement:** Never show the Browser's bottom scrollbar. Show scrollbar INSIDE the table container only. **Fix:**

* **Container:** Wrap the `Table` component in a `div` with:

```
"relative w-full overflow-x-auto border rounded-md" 
// Ensure parent has max-width: calc(100vw - sidebar_width) or similar logic via Flexbox
```

*   
  **Table:** Ensure `table` has `min-w-[1000px]` (or sufficient width) so it forces internal scrolling on small screens.  
* **Sticky Columns (Freeze):**  
  * Apply `sticky left-0 bg-background z-10` to the first few critical columns (Date, Note/Shop).  
  * Apply `sticky right-0 bg-background z-10` to the Actions column.  
  * *Note:* Add a slight shadow or border to separate sticky columns.

  ## **PART B: TABLE VISUAL ENHANCEMENT (Compact Mode)**

**File:** `src/components/moneyflow/unified-transaction-table.tsx` (Columns Definition)

### **1\. Column: "Type & Status" (Merged)**

* **Header:** "Type" (Icon only).  
* **Display Logic:** Combine Icons.  
  * **Types:**  
    * `income` \-\> ➕  
    * `expense` \-\> ➖  
    * `transfer` \-\> ↔️  
    * `transfer_in` (received) \-\> ➡️  
    * `transfer_out` (sent) \-\> ⬅️  
    * `debt/loan` \-\> 📒  
    * `repayment` \-\> 💸  
  * **Statuses:**  
    * `posted` (completed) \-\> (No extra icon needed, or small ✅) \-\> *Decision: Just bold the Type icon.*  
    * `pending` \-\> ⏸️  
    * `void` \-\> 🚫 (Strike-through entire row text)  
  * **Result:** Render **ONE** combined visual indicator. Tooltip shows full text status.

  ### **2\. Column: "Account" (Merged with Cycle)**

* **Row 1:** Account Name (Bold).  
* **Row 2:** `Cycle Badge` (Small, gray, e.g., "DEC25").  
* **Action:** Remove separate "Cycle Info" column.

  ### **3\. Column: "People" (Merged with Tag)**

* **Row 1:** Person Avatar/Name.  
* **Row 2:** `Tag Badge` (Small, outline variant).  
* **Action:** Remove separate "Tag" column.

  ## **PART C: iOS SHORTCUT BRIDGE (URL Params)**

  ### **1\. Auto-Open Modal via URL**

**File:** `src/app/transactions/page.tsx` (Client Component) **Task:**

* Use `useSearchParams` from `next/navigation`.  
* **Logic:**  
  * Check for param `action=new`.  
  * If present, set `isAddTransactionModalOpen = true`.  
  * **Pre-fill Form:**  
    * `amount`: Read from `searchParams.get('amount')`.  
    * `note`: Read from `searchParams.get('note')`.  
    * `shop_name`: Read from `searchParams.get('shop')` (Logic: Find shop by name, default to 'Shopee' if param is 'shopee').  
    * `person_id`: Read from `searchParams.get('for')`.

  ## **4\. Execution Plan**

1. **Step 1 (CSS):** Fix Account Card images.  
2. **Step 2 (CSS):** Refactor Transaction Table container for "Internal Scrolling" & Sticky Columns.  
3. **Step 3 (Table UI):** Implement Merged Columns (Type+Status, Account+Cycle, People+Tag).  
4. **Step 4 (Feature):** Implement URL Params listener in Transaction Page for iOS Shortcuts.

👉 **Acknowledge M3-P2 and start with Step 1\.**

3.   
1. 