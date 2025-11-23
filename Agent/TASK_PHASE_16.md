# **AGENT TASK: SHARED LIMIT (PARENT/CHILD) & ACCOUNT LIFECYCLE**

**Context:**

1. **Missing Feature:** Support for Supplementary Cards (Shared Limit).  
2. **UX Upgrade:** CreateAccountDialog needs to suggest Parent Accounts based on name input.  
3. **Lifecycle:** Accounts should be Closed (Inactive) instead of Deleted.  
4. **Missing Option:** "Unlimited Cashback" checkbox in Config.

**Objective:**

1. Upgrade CreateAccountDialog with Parent detection & Unlimited Cashback.  
2. Update AccountList to handle Closed accounts.  
3. Update AccountDetails to show Shared Limit info & Close Action.

## **1\. Upgrade CreateAccountDialog (src/components/moneyflow/create-account-dialog.tsx)**

**A. Parent Account Logic (Smart Suggestion)**

* **Trigger:** Watch name input.  
* **Condition:** If type \=== 'credit\_card'.  
* **Logic:**  
  * When user types (e.g., "VCB"), filter the existing accounts list for matches (StartWith/Contains).  
  * Show a **"Liên kết hạn mức (Thẻ phụ)?"** dropdown/combobox.  
  * **Options:** List matching Credit Cards (e.g., "VCB Signature", "VCB Digicard").  
  * **Effect:**  
    * If a Parent is selected \-\> **Hide/Disable "Credit Limit" field** (Inherited).  
    * Set parent\_account\_id in payload.

**B. Cashback Unlimited Option**

* Inside the Cashback Config section.  
* Add Checkbox: \[ \] Không giới hạn (Unlimited).  
* **Effect:** If checked, set max\_amt to null (or 0\) and disable the Max Amount input.

## **2\. Upgrade AccountList (src/components/moneyflow/account-list.tsx)**

**A. Sectioning**

* **Active Accounts:** Render as usual (Cards/Table).  
* **Closed Accounts:** Render a collapsible section at the bottom: "Tài khoản đã đóng (Closed)".  
  * Render these with opacity-75 or grayscale filter.

**B. Balance Calculation (Shared Limit)**

* When rendering a **Parent Card**:  
  * Display Balance \= Own Balance.  
  * *Tooltip/Subtext:* "Tổng dư nợ nhóm: \[Parent \+ Children Balance\]".  
* When rendering a **Child Card**:  
  * Display Balance \= Own Balance.  
  * *Badge:* "Link: \[Parent Name\]".

## **3\. Upgrade AccountDetails & Actions**

**A. Close Account Action**

* In the Edit/Settings menu, rename "Delete" to **"Đóng tài khoản (Close)"**.  
* **Logic:** Update is\_active \= false.  
* **Restore:** If account is closed, show "Mở lại (Reopen)" button.

**B. Header Stats**

* Update the Header to use the new total\_in and total\_out columns from DB (instead of calculating on the fly).

## **4\. Execution Steps**

1. **Refactor Create Dialog:** Implement the Smart Parent Suggestion & Unlimited Checkbox.  
2. **Refactor Service:** Ensure getAccounts returns is\_active status and parent\_account\_id.  
3. **Refactor UI:** Split Active/Closed lists and update Card visuals.  
4. **Safety Check:** Run npm run build to ensure type safety with new columns.