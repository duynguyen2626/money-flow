# **AGENT TASK: SHOPS MODULE, UI ENGLISH TRANSLATION & LOGIC REFINEMENT**

**Context:**

1. **Missing Module:** User needs to track "Shops" (Shopee, Lazada...) for transactions.  
2. **Logic Gap:** "Request Refund" action is showing for Transfers/Debt payments. It should ONLY show for Shopping/Expense transactions.  
3. **Localization:** The UI is currently mixed (Vietnamese/English). User wants fully **ENGLISH** for Modals and Actions.

**Objective:**

1. Build Shops Management (/shops).  
2. Update Transaction Form & Table (Add Shop selection/column).  
3. Refine Refund Logic.  
4. Translate UI to English.

## **1\. Shops Module**

**A. Backend (src/services/shop.service.ts)**

* CRUD: getShops, createShop, updateShop.

**B. UI: Shops Page (src/app/shops/page.tsx)**

* **Layout:** Simple Grid of Cards (Logo \+ Name).  
* **Action:** "Add Shop" button \-\> Opens Modal.

## **2\. Update Transaction Form (src/components/moneyflow/transaction-form.tsx)**

**A. Add Shop Field**

* **Condition:** Only show if Type \=== 'expense'.  
* **Component:** Combobox (Searchable).  
* **Placement:** Below Category or near "Note".

**B. Localization (English)**

* Translate Labels: "Ngày" \-\> "Date", "Số tiền" \-\> "Amount", "Danh mục" \-\> "Category", "Tài khoản" \-\> "Account".  
* Translate Tabs: "Chi tiêu" \-\> "Expense", "Thu nhập" \-\> "Income", "Chuyển khoản" \-\> "Transfer".  
* Translate Buttons: "Lưu" \-\> "Save", "Hủy" \-\> "Cancel".

## **3\. Update Transaction Table & Logic (src/components/moneyflow/transaction-table.tsx)**

**A. Add Shop Column**

* Display Shop Logo/Name (if exists).

**B. Refine Refund Action Visibility**

* **Current:** Always visible.  
* **New Logic:** Show "Request Refund" ONLY IF:  
  * transaction.shop\_id is NOT NULL.  
  * OR transaction.category.name contains "Shopping".  
  * AND transaction.type is 'expense'.

**C. Localization**

* Headers: Date, Shop, Category, Note, Amount, Status, Action.  
* Menu Actions: "Edit", "Void", "Request Refund", "Confirm Refund", "Restore".

## **4\. Update Sheet Sync (src/services/transaction.service.ts)**

**Action:**

* When syncing to Google Sheet, ensure the shop\_name is retrieved from the shops table (join) and sent in the payload.

## **5\. Execution Steps**

1. **Backend:** Create shop.service.ts.  
2. **UI:** Build /shops page.  
3. **UI:** Update TransactionForm (Shop field \+ Translation).  
4. **UI:** Update TransactionTable (Columns \+ Refund Logic \+ Translation).