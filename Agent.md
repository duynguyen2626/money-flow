# **PROJECT: MONEY FLOW 3.0**

# **PHASE: 37 \- UNIFICATION, REFUND ACTIONS & TABLE POLISH**

**WORKFLOW:**

1. **Branch:** fix/phase-37-unify-polish  
2. **Safety:** Run npm run build before finishing.

## **I. UNIFIED TRANSACTION TABLE (src/components/moneyflow/unified-transaction-table.tsx)**

**1\. Fix Date Time (The "7:00" Bug)**

* **Context:** occurred\_at is Date-only (00:00 UTC \-\> 07:00 VN).  
* **Fix:**  
  * Display Date using occurred\_at (dd/MM).  
  * Display Time using created\_at (HH:mm) if available.  
  * *Visual:* Stacked layout.

**2\. Polish Layout**

* **Tags Column:** Add max-w-\[120px\] truncate to prevent overflow. Add Tooltip for full text.  
* **Borders:** Add vertical borders (border-r) to cells for clarity.  
* **Zero Handling:** If Back columns are 0/null, display "0" or "-" explicitly.

**3\. Merge Cashback Columns**

* **Header:** "Back Info".  
* **Logic:**  
  * Line 1: Text \[Rate\]% \+ \[Fix\].  
  * Line 2: Small Green Text Sum: \[Total\].  
* **Action:** Replace separate columns with this single merged column.

**4\. Add "Status" Column**

* **Position:** Before Actions.  
* **Badges:**  
  * Void (Gray).  
  * Refunded (Purple \- Full).  
  * Partial Refund (Amber).  
  * Active (Green/Blue \- Default).

## **II. LOGIC UPGRADE: ACTIONS MENU**

**Target:** src/components/moneyflow/transaction-table.tsx

**1\. Global Refund Availability**

* **Fix:** Ensure "Request Refund" and "Cancel Order" appear on ALL pages (/transactions, /accounts, /people).  
* **Condition:** type \=== 'expense' OR type \=== 'debt' (Lending). (Remove strict Shop check).

**2\. Separate Actions**

* **Action 1: ↩️ Partial Refund** \-\> Opens Dialog (Enter amount).  
* **Action 2: 🚫 Cancel Order (Full)** \-\>  
  * Confirm Dialog: "Hủy đơn và hoàn 100%?".  
  * Logic: Call requestRefund with amount \= original\_amount.

## **III. FIX BATCH MAPPING BUG**

Context: The Batch Mapping tab shows (0) items even though data exists.  
Fix:

* Check src/services/bank.service.ts or wherever getBankMappings is called.  
* Ensure the API/Service is actually fetching data and the State in BatchList is updated.  
* *Self-Correction:* If the mapping list is in a separate page (/settings/banks), ensure the link works. If it's a tab in /batch, ensure the data fetcher runs on tab change.

## **IV. EXECUTION STEPS**

1. **Frontend:** Update Table Cell rendering (Time, Merge Back, Status Col).  
2. **Frontend:** Update Action Menu (Add Cancel, Relax Refund condition).  
3. **Backend/Frontend:** Debug Batch Mapping fetch.  
4. **Verify:** Run build.