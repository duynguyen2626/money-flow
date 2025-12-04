# **AGENT TASK: ENHANCE DEBT TAGS IN TRANSACTION FORM**

Context:  
Transactions created via the Modal are missing the tag field (e.g., "NOV25"), causing them to be un-grouped in the Debt Dashboard.  
We need to add a "Smart Tag Input" to the Transaction Form.  
**Objective:**

1. Add tag field to the Transaction Schema.  
2. Implement smart logic: Auto-generate tag from Date, Dropdown suggestions, and "Previous Month" toggle.

## **1\. Logic & Utilities**

**Format Convention:** MMMyy in Uppercase (e.g., NOV25 for November 2025).

**Helper Function:**

import { format, subMonths } from 'date-fns';

export const generateTag \= (date: Date) \=\> format(date, 'MMMyy').toUpperCase();

**Backend Service (src/services/transaction.service.ts):**

* getRecentTags(): Query transactions table using RPC or select distinct tag.  
  * *Alternative (Simpler):* Just return a hardcoded list of the last 3 months \+ current month generated from server time if DB query is too complex for distinct values.  
  * *Suggested:* Generate last 6 months dynamically in JS (e.g., NOV25, OCT25, SEP25...) to populate the dropdown suggestions.

## **2\. UI Update: src/components/moneyflow/transaction-form.tsx**

**A. Update Zod Schema**

* Add tag: z.string().min(1) to the schema.

**B. Component Logic (The "Smart" Behavior)**

* **State:** manualTagMode (Boolean).  
* **Effect:**  
  * Watch date.  
  * IF \!manualTagMode: form.setValue('tag', generateTag(date)).  
  * *Explanation:* If user hasn't manually interfered, keep syncing tag with the selected date.

**C. UI Element (The Input Field)**

* Place this field below "Date" or near "Note".  
* **Layout:** A combined Input \+ Dropdown \+ Action Buttons.  
* **Components:**  
  * **Input:** Editable text (e.g., "NOV25").  
  * **Quick Actions (Row below input):**  
    * \[ \< Tháng trước \]: Button. OnClick \-\>  
      1. Parse current tag or date.  
      2. Subtract 1 month.  
      3. Set new Tag.  
      4. Set manualTagMode \= true.  
    * \[ Reset \]: Button. OnClick \-\>  
      1. Set Tag \= generateTag(date).  
      2. Set manualTagMode \= false.  
  * **Dropdown (Combobox):** List "Gợi ý gần đây" (NOV25, OCT25, SEP25...).

## **3\. Integration (src/app/people/\[id\]/page.tsx)**

* Ensure that when the Debt List loads, it correctly groups by these new Tags. (The logic in Phase 8 should already handle this, just double check).

## **4\. Execution Steps**

1. Install date-fns if missing.  
2. Update Schema in transaction-form.tsx.  
3. Implement the Tag Input with the "Previous Month" toggle logic.  
4. Ensure the createTransaction service actually saves the tag to the DB.