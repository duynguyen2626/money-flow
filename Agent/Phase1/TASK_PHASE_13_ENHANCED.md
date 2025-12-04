# **AGENT TASK: ENHANCE SHEET SYNC (TEST BUTTON & SYNC ALL)**

Context:  
The User pasted the Webhook URL but sees no data because the sync is event-driven (future transactions only).  
Objective:

1. Add a **"Test Connection"** button to verify the link works.  
2. Add a **"Sync All Data"** button to push existing historical debt transactions to the Sheet.

## **1\. Backend: src/services/sheet.service.ts**

**A. testConnection(personId: string)**

* Fetch Person profile.  
* Send a dummy payload:  
  { "action": "create", "type": "TEST-CONNECTION", "amount": 0, "shop": "MoneyFlow Bot", "notes": "Kết nối thành công\!", "date": "YYYY-MM-DD" }

* Return success/error.

**B. syncAllTransactions(personId: string)**

* Fetch ALL transaction\_lines for this person (Debt Account).  
* Loop through them and prepare the payload for each.  
* **Batch Send:** Sending one by one might be slow.  
  * *Option A:* Loop and fire fetch (Slow but simple).  
  * *Option B:* Update Apps Script to accept an array actions: \[\].  
  * *Decision:* Let's stick to Option A (Loop) for now to avoid changing the Apps Script logic, but add a small delay (100ms) to avoid rate limiting.

## **2\. UI: Update PeopleDetailPage (src/app/people/\[id\]/page.tsx)**

**Action:** Add a "Google Sheet Settings" section or Dropdown Menu.

**UI Components:**

* **Status Indicator:**  
  * If sheet\_link exists: 🟢 Connected.  
  * Else: ⚪ Not Connected.  
* **Button 1: "Test Kết Nối"**  
  * Call testConnection. Show Toast "Đã bắn tin hiệu test".  
* **Button 2: "Đồng bộ toàn bộ (Sync All)"**  
  * Warning Alert: "Việc này sẽ đẩy toàn bộ giao dịch cũ sang Sheet. Hãy đảm bảo Sheet đang trống hoặc bạn muốn ghi nối tiếp."  
  * Call syncAllTransactions. show Progress Toast "Đang đồng bộ 1/50...".

## **3\. Execution Steps**

1. Implement testConnection and syncAllTransactions in sheet.service.ts.  
2. Add the UI buttons to the Person Header (maybe inside a "Settings" Popover).