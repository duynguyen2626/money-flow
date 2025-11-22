# **AGENT TASK: CUSTOMIZE BOT TRANSACTION NOTES**

Context:  
The User wants to customize the text of the auto-generated transactions.  
Instead of a hardcoded string, they want to define a template like: Youtube {date} ({price}/{members}).  
**Objective:**

1. Update ServiceDialog to allow editing note\_template.  
2. Update subscription.service.ts (The Bot) to use this template.

## **1\. UI: Update ServiceDialog (src/components/moneyflow/service-dialog.tsx)**

**Action:** Add a Text Input for "Mẫu ghi chú (Note Template)".

**UI Details:**

* **Label:** "Mẫu nội dung giao dịch".  
* **Input:** Text field.  
* **Helper Text:** "Dùng các từ khóa: {name}, {date} (MM-YYYY), {price}, {members} (Số người)."  
* **Example:** "Youtube {date} ({price}đ)" \-\> "Youtube 11-2025 (166000đ)"

## **2\. Backend: Update Bot Logic (src/services/subscription.service.ts)**

**Action:** Modify checkAndProcessSubscriptions.

**Logic \- Note Generation:**

* Retrieve subscription.note\_template (Default to "Auto: {name} {date}" if empty).  
* **Replace Tokens:**  
  * {name} \-\> subscription.name  
  * {date} \-\> Format current month (e.g., "11-2025").  
  * {price} \-\> subscription.price (Formatted or Raw? Maybe Raw for flexibility, or Simple Number).  
  * {members} \-\> members.length.  
* **Use this string** as the note for the created Transaction Header.

## **3\. Execution Steps**

1. Update the ServiceDialog form schema and UI.  
2. Update the Bot service to parse and replace the tokens.  
3. **Verify:** The user can now see the custom note format in the next auto-run.