# **AGENT TASK: BUILD BATCH TRANSFER (CKL) MODULE**

Context:  
User needs a "Batch Transfer" tool to manage monthly fund distribution.  
New Feature: Each Batch can act as a Template and have its own Google Sheet Webhook URL.  
**Objective:**

1. Build /batch page.  
2. Implement Funding & Confirm logic.  
3. Implement "Send to Sheet" using the specific batch's sheet\_link.

**System Account ID:** 88888888-9999-9999-9999-888888888888

## **1\. Backend: src/services/batch.service.ts**

**A. createBatch / updateBatch**

* **Input:** name, isCurrentMonth, sourceAccountId, **sheet\_link**.  
* **Logic:** Save sheet\_link to DB.

**B. sendBatchToSheet(batchId)**

* Fetch batch details \+ items.  
* **Validation:** If batch.sheet\_link is empty, throw Error "Vui lòng cấu hình Link Sheet cho lô này".  
* **Payload:**  
  {  
    "batchName": batch.name,  
    "items": \[  
      {   
        "receiver\_name": item.receiver\_name || targetAccount.name,  
        "bank\_number": "...", // Fetch from Account Metadata/Config if available, else blank  
        "bank\_name": "...",  
        "amount": item.amount,  
        "note": item.note  
      }  
    \]  
  }

* **Action:** POST to batch.sheet\_link.

## **2\. UI: Batch Manager (src/app/batch/page.tsx)**

**A. Batch Dialog (Create/Edit)**

* Add Input Field: **"Link Google Script (Webhook)"**.  
* Add Input Field: **"Source Account"** (Nguồn tiền).

**B. Batch Detail View**

* **Send Button:** "📤 Gửi qua Sheet".  
  * Click \-\> Loading \-\> Toast Success.

## **3\. Execution Steps**

1. **Service:** Update CRUD to handle sheet\_link.  
2. **Service:** Implement sendBatchToSheet.  
3. **UI:** Build the Batch Manager UI.