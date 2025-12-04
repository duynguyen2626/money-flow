# **AGENT TASK: EMERGENCY UI FIXES & LOGIC RESTORATION**

Context:  
The UI is broken after the last build fix.

1. **Blurry UI:** Active transactions/forms are rendered with opacity-50 or disabled styles incorrectly (likely inverted logic).  
2. **Missing Fields:** "Shop" and "Category" fields are missing in Edit Mode.  
3. **Shop UI:** The Add Shop modal has bad contrast (Dark on Dark).  
4. **404 Error:** The /refunds page is missing or not routing correctly.

Objective:  
Restore functionality and visual clarity immediately.

## **1\. Fix UI Blur & Disabled State (src/components/moneyflow/transaction-table.tsx & transaction-form.tsx)**

**A. Fix Table Opacity**

* **Diagnosis:** The row class logic row.status \=== 'void' ? 'opacity-50' : '' might be applying opacity-50 to EVERYONE due to a typo or logic error.  
* **Action:** Ensure opacity-50 line-through applies **ONLY** when status \=== 'void'.

**B. Fix Form Disabled State**

* **Diagnosis:** The Form fields (Selects, Inputs) might be receiving disabled={true} globally or based on a wrong condition.  
* **Action:** Check disabled props. Ensure fields are editable in "Edit Mode".

**C. Restore Missing Fields**

* Ensure Shop and Category fields are rendered conditionally.  
* **Fix Logic:** If type \=== 'expense', SHOW both. Do not hide them in Edit mode.

## **2\. Fix Shop UI & Logic (src/app/shops/page.tsx & shop-dialog.tsx)**

**A. UI Contrast**

* Ensure the Shop Modal/Card has bg-white (or proper dark mode variables) so text is visible. Fix the "Black on Black" issue.

**B. Shop-Category Linking (Smart Fill)**

* **Update ShopDialog:** Add a dropdown to select "Default Category" (e.g., Shopping).  
* **Update Backend:** Save default\_category\_id.  
* **Update TransactionForm:**  
  * Watch shop\_id.  
  * When Shop changes \-\> Find the shop in the list \-\> If it has default\_category\_id, auto-set the category\_id form field.

## **3\. Create Refunds Page (src/app/refunds/page.tsx)**

**Diagnosis:** The User reports 404\. The file likely doesn't exist.

Action: Create src/app/refunds/page.tsx.  
Content:

* Fetch accounts to find the System Account (99999999...).  
* Fetch transactions for this account (getAccountTransactions or specific query).  
* Render a table of "Pending Refunds".  
* Action: "Confirm Refund" button.

## **4\. Execution Steps**

1. **Priority 1:** Fix the Opacity/Disabled CSS in Table and Form.  
2. **Priority 2:** Create the /refunds page.  
3. **Priority 3:** Fix Shop UI and implement Default Category logic.  
4. **Build Check:** Run npm run build to ensure no new errors.