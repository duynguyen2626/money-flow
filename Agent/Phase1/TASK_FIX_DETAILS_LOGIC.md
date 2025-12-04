# **AGENT TASK: FIX ACCOUNT DETAILS LOGIC & UI**

**Context:**

1. **Bug 1 (Edit Config):** User inputs 10 for rate, expecting 10%, but it saves/displays as 100% (or 10.0). The DB stores 0.1.  
2. **Bug 2 (Zero Stats):** The "Summary Cards" on Account Details page show 0 for "Total Spend" even though "Earned" is maxed out.  
3. **Enhancement:** Improve coloring of the Stats cards for better readability.

## **1\. Fix Rate Input Logic (src/components/moneyflow/edit-account-dialog.tsx)**

**Problem:** Discrepancy between User Input (Integer 0-100) and DB Value (Decimal 0.0-1.0).

**Action:** Implement a controlled input with conversion.

**Code Logic:**

// Inside the Form Field for 'rate'  
\<FormField  
  control={form.control}  
  name="cashback\_config.rate"  
  render={({ field }) \=\> (  
    \<FormItem\>  
      \<FormLabel\>Tỷ lệ hoàn tiền (%)\</FormLabel\>  
      \<FormControl\>  
        \<Input   
          type="number"   
          placeholder="ex: 10"   
          // Display: Convert 0.1 \-\> 10  
          value={field.value ? (field.value \* 100).toString() : ''}   
          // Save: Convert 10 \-\> 0.1  
          onChange={(e) \=\> {  
            const val \= parseFloat(e.target.value);  
            field.onChange(isNaN(val) ? 0 : val / 100);  
          }}   
        /\>  
      \</FormControl\>  
      \<FormDescription\>Nhập số nguyên (VD: Nhập 10 là 10%)\</FormDescription\>  
    \</FormItem\>  
  )}  
/\>

## **2\. Fix Stats Calculation (src/app/accounts/\[id\]/page.tsx)**

**Problem:** The page currently doesn't calculate "Current Cycle Spend" correctly.

**Action:** Reuse the robust logic from CashbackService.

Backend Update (account.service.ts):  
Create a helper that wraps getCashbackProgress for a single account.  
// In account.service.ts, import getAccountSpendingStats from cashback.service  
export async function getAccountStats(accountId: string) {  
   // Call the existing logic to get spending for THIS cycle  
   const stats \= await getAccountSpendingStats(accountId, new Date());  
   return stats;   
}

**Frontend Update:**

* Fetch stats \= await getAccountStats(id).  
* Map stats.currentSpend to the "Tổng chi" card.  
* Map stats.remainingBudget to the "Remaining" card.  
* Map stats.earnedSoFar to "Earned".

## **3\. Enhance UI Coloring (src/app/accounts/\[id\]/page.tsx)**

**Action:** Apply distinct styling to the Summary Cards.

**Design Specs:**

* **Earned Card:**  
  * Bg: bg-emerald-50  
  * Text: text-emerald-700  
  * Border: border-emerald-200  
* **Remaining Budget Card:**  
  * If \> 0: bg-blue-50 / text-blue-700  
  * If \= 0: bg-amber-50 / text-amber-700 (Warning look)  
* **Total Spend Card:**  
  * Bg: bg-slate-50  
  * Text: text-slate-700

## **4\. Execution Steps**

1. Modify EditAccountDialog to handle the % conversion.  
2. Update AccountDetailsPage to fetch real stats using the Cashback Service.  
3. Apply the Tailwind color classes.