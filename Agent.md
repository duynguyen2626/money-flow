# **PROJECT: MONEY FLOW 3.0**

# **PHASE: 40 \- SYSTEM CONSOLIDATION & CLEANUP**

**WORKFLOW:**

1. **Branch:** fix/phase-40-consolidation  
2. **Safety:** Run npm run build.

OBJECTIVE:  
Clean up fragmented logic. Ensure ONE source of truth for Table Columns, Account Math, and Date Formatting.

## **I. UNIFIED TRANSACTION TABLE (THE FINAL STANDARD)**

**Target:** src/components/moneyflow/unified-transaction-table.tsx

**1\. Columns Standardization**

* **Notes:** Must be visible. Combine \[Shop Logo\] Note.  
* **Date:** Display Date dd/MM (Top) AND Time HH:mm (Bottom, small gray).  
  * *Fix:* Ensure created\_at or occurred\_at includes time. If occurred\_at is date-only (00:00), try to fetch created\_at for the Time part.  
* **Type:**  
  * Green Badge: Income, Repayment, In-TF.  
  * Red Badge: Expense, Debt Lending, Out-TF.  
  * Blue Badge: Transfer (Neutral).  
* **Status:**  
  * **Pending:** Yellow (System Account only).  
  * **Completed:** Gray.  
  * **Refunded:** Purple.  
  * **Active:** Green/Hidden.

**2\. Global Visibility**

* **Fix:** Ensure "Pending" (System) transactions are visible in /transactions if "All" filter is selected (or add a "System" toggle).

## **II. ACCOUNT CARD & LOGIC FIXES**

**Target:** src/components/moneyflow/account-card.tsx

**1\. Credit Card Math (Fix)**

* **Limit:** account.credit\_limit (e.g., 50M).  
* **Balance:** account.current\_balance (e.g., \-5M).  
* **Available:** Limit \+ Balance (50 \+ \-5 \= 45M).  
* **UI Display:**  
  * "Dư nợ (Debt): \[Abs(Balance)\]" (Red).  
  * "Khả dụng (Avail): \[Available\]" (Green/Blue).

**2\. Badges UI**

* Remove old "Incoming/Outgoing" stats from the Card face (too cluttered).  
* Keep only **Confirm Badge**: ☑️ \[Amount\] (Clickable).

## **III. REALTIME UPDATES & PEOPLE PAGE**

**1\. Fix Realtime Lag (/people/\[id\])**

* The "You owe" header relies on getPersonDetails.  
* **Fix:** Ensure router.refresh() is called *immediately* after Void/Refund actions in the Table component.  
* **Optimistic UI:** If possible, update the local state count, but router.refresh() is safer for data consistency.

**2\. Date Time Fix (7:00 Bug)**

* **Cause:** Storing YYYY-MM-DD maps to UTC 00:00 \-\> VN 07:00.  
* **Fix:** When creating transactions, send ISO String with Time (new Date().toISOString()), not just the date part. Update TransactionForm to include time in the saved value.

## **IV. EXECUTION STEPS**

1. **Frontend:** Update AccountCard math logic.  
2. **Frontend:** Polish UnifiedTransactionTable columns (Notes, Time).  
3. **Frontend:** Fix TransactionForm to save full datetime.  
4. **Integration:** Ensure /people page refreshes on actions.
