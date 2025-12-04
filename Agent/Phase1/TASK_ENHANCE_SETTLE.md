# **AGENT TASK: ENHANCE SETTLEMENT UX (SETTLE BY CYCLE TAG)**

Context:  
Currently, the "Settle Debt" dialog is generic (settles the total balance).  
The User wants to settle specific Debt Cycles (Tags) directly from the People Details page (e.g., Click "Settle" on "NOV25" card \-\> Dialog opens with "NOV25" pre-filled).  
**Objectives:**

1. **Update SettleDebtDialog:** Add a tag input field and accept a defaultTag prop.  
2. **Update PeopleDetailPage:** Add a "Tất toán" button to each Cycle Card that triggers the dialog with the correct tag.  
3. **Update Backend:** Ensure settleDebt service saves the tag.

## **1\. Update SettleDebtDialog (src/components/moneyflow/settle-debt-dialog.tsx)**

**A. Props Interface**

* Add defaultTag?: string to the component props.

**B. Form Schema & UI**

* Add tag to the Zod schema (String, required).  
* **UI Layout:** Add an Input field for "Kỳ nợ (Tag)" inside the Dialog.  
  * It should default to props.defaultTag or generated current month tag if empty.  
  * *Styling:* Place it next to the Date picker or Amount.

**C. Submission**

* Pass the tag value to the settleDebt service function.

## **2\. Update Backend (src/services/debt.service.ts)**

**Function:** settleDebt(...)

* Update signature to accept tag: string.  
* **Database Insert:** Ensure the created transaction record includes the tag column.  
  * *Logic:* This is crucial so the repayment cancels out the debt in the correct GROUP BY bucket.

## **3\. Update People Details UI (src/app/people/\[id\]/page.tsx)**

**Action:** Add the Settle Button to Cycle Cards.

**Code Logic:**

* Iterate through debtCycles.  
* Inside each Card, add a small Button (or Icon Button like CheckCircle).  
* **Interaction:**  
  * Clicking the button opens the SettleDebtDialog.  
  * Pass the card's tag (e.g., "NOV25") as defaultTag to the Dialog.  
  * Pass the card's balance as defaultAmount (Optional, but helpful UX).

## **4\. Execution Steps**

1. Modify debt.service.ts to handle Tags.  
2. Upgrade the SettleDebtDialog component.  
3. Connect the dots in PeopleDetailPage.