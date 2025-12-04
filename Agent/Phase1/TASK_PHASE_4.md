# **AGENT TASK: IMPLEMENT DEBT SETTLEMENT LOGIC**

Context: The UI is ready, but the "Settle" button is non-functional.  
Objective: Implement the full logic to pay off/collect debts (Partial or Full).

## **1\. Backend Logic (src/services/debt.service.ts)**

Create a function settleDebt. This functions acts as a **Transfer** between a Real Account and a Debt Account.

**Logic Analysis:**

* **Scenario A: They owe me (Positive Balance).**  
  * Action: "Thu nợ" (Collection).  
  * Money Flow: **Debit** Real Bank (Increase Money) / **Credit** Debt Account (Decrease Debt Asset).  
* **Scenario B: I owe them (Negative Balance).**  
  * Action: "Trả nợ" (Repayment).  
  * Money Flow: **Credit** Real Bank (Decrease Money) / **Debit** Debt Account (Decrease Debt Liability).

**Function Signature:**

export async function settleDebt(  
  debtAccountId: string,   
  amount: number, // User input (always positive)  
  targetBankAccountId: string, // Selected Bank/Cash account  
  note: string,  
  date: Date  
) {  
    // 1\. Fetch Debt Account to check current balance (Determine if it's Repay or Collect)  
    // 2\. Create Transaction Header (Note: "Settlement with \[Name\]")  
    // 3\. Create Transaction Lines (Double-Entry)  
}

## **2\. Frontend UI (src/components/moneyflow/settle-debt-dialog.tsx)**

Create a new Dialog component (Modal).

**UI Requirements:**

1. **Title:** Dynamic ("Thu nợ từ \[Tên\]" or "Trả nợ cho \[Tên\]").  
2. **Amount Input:**  
   * **Default Value:** Math.abs(current\_debt\_balance).  
   * **Editable:** User allows to edit this (Partial payment).  
3. **Account Selector:** "Chọn tài khoản nhận tiền/trừ tiền" (List from getAccounts except debt type).  
4. **Date Picker:** Defaults to today.  
5. **Submit:** Calls settleDebt service.

## **3\. Update DebtList (src/components/moneyflow/debt-list.tsx)**

Integrate the Dialog into the List.

**Logic Update:**

1. **Currency Display:** Remove negative sign (\-) for negative numbers (Use Math.abs). Keep Red/Green colors.  
2. **Button Visibility:**  
   * IF balance \=== 0: **HIDE** the "Tất toán" button (or show a gray 'Done' text).  
   * ELSE: Show the button \-\> On Click \-\> Open SettleDebtDialog.

## **4\. Execution Steps**

1. **Backend:** Implement settleDebt in src/services/debt.service.ts.  
2. **Frontend:** Build SettleDebtDialog.tsx using Shadcn Dialog & Forms.  
3. **Integration:** Connect DebtList to the Dialog.  
4. **Testing:**  
   * Test Partial Payment (Debt 500 \-\> Pay 200 \-\> Remaining 300).  
   * Test Full Payment (Debt 300 \-\> Pay 300 \-\> Remaining 0 \-\> Button disappears).