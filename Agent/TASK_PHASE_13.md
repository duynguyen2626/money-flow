# **AGENT TASK: REALTIME GOOGLE SHEET SYNC (WEBHOOK)**

Context:  
We want to sync Debt transactions to a personal Google Sheet for each user.  
The User stores a "Webhook URL" (Google Apps Script) in the profiles.sheet\_link column.  
**Objective:**

1. Create SheetService to handle the API call.  
2. Trigger sync on createTransaction.  
3. Prepare structure for deleteTransaction sync.

## **1\. Backend: src/services/sheet.service.ts**

**Function:** syncTransactionToSheet(personId: string, txn: any, action: 'create' | 'delete')

**Logic:**

1. Fetch profile using personId (reuse getPersonDetails or simple query).  
2. Check if profile.sheet\_link exists and is valid (starts with http).  
3. **Prepare Payload:**  
   {  
     "action": "create",  
     "id": txn.id,  
     "type": "Debt", // Or specific type  
     "date": txn.date,  
     "shop": txn.shop\_name || "",  
     "notes": txn.note,  
     "amount": txn.original\_amount || txn.amount, // Use Original (Gross)  
     "percent\_back": txn.cashback\_share\_percent,  
     "fixed\_back": txn.cashback\_share\_fixed,  
     "total\_back": (calculate sum back),  
     "tag": txn.tag  
   }

4. **Send Request:**  
   * fetch(profile.sheet\_link, { method: 'POST', body: JSON.stringify(payload) }).  
   * *Mode:* no-cors might be needed if client-side, but since this is a Service Action (Server Side), standard fetch is fine.  
   * **Error Handling:** try-catch. Do not block the main app flow if Sheet sync fails (Fire and Forget).

## **2\. Integrate with Transaction Service (src/services/transaction.service.ts)**

**Update createTransaction:**

* Identify if there is a Debt Line (Line with person\_id).  
* If yes, extract the person\_id and the specific line details (Original Amount, Cashback info).  
* **After** successful DB insertion, call SheetService.syncTransaction(...).  
  * *Optimization:* Use waitUntil or just define it as a non-awaited promise so the UI responds instantly.

**Update deleteTransaction (Future Proofing):**

* Before deleting (or after), fetch the transaction to find person\_id.  
* Call SheetService.syncTransaction(..., 'delete').

## **3\. Execution Steps**

1. Create sheet.service.ts.  
2. Inject the sync logic into transaction.service.ts (Create & Delete flows).