# 🎯 AGENT RECOVERY GUIDE - Refund Logic Recovery (PHASE-9.2.1-CASHBACK)

## 🚨 CRITICAL ISSUE: Missing Refund Logic

**Status:** 🔴 URGENT - Code Lost in PR #126 Recovery  
**Branch:** PHASE-9.2.1-CASHBACK-PERCENT-ENTRIES-SHEET  
**PR Reference:** #126  
**Issue:** Refund menu actions missing ("Request Refund" + "Cancel Order 100%")

---

## 📋 What Happened

### Timeline
1. ✅ PR #126 implemented Cashback System with Refund Logic
2. ❌ Later PR refactored transaction system
3. ❌ **Agent accidentally removed refund code** during refactor
4. 🔴 Now: Click "..." menu → NO "Request Refund" or "Cancel Order" options

### Missing Menu Actions
```
Current Menu (Broken):
├─ Edit
├─ Clone
├─ [MISSING] Request Refund ❌
├─ [MISSING] Cancel Order (100%) ❌
├─ View History
└─ Void Transaction

Expected Menu (From PR #126):
├─ Edit
├─ Clone
├─ Request Refund ✅ (Creates pending refund transaction)
├─ Cancel Order (100%) ✅ (Creates full cancel transaction)
├─ View History
└─ Void Transaction
```

---

## 🔍 Understanding Refund Logic

### Core Concept: 3-State Refund System

The refund feature requires tracking **3 transaction states**:

```
STATE 1: PENDING (Waiting for merchant response)
├─ Type: "Refund" or "Cancel Order"
├─ Status: "Pending (Wait)"
├─ Amount: Original transaction amount (or partial)
├─ Description: "Refund: Diễn t1" or "Cancel Order: reason"
├─ Display: Shows ORANGE tag "Pending (Wait)"
├─ Money Flow: None yet (waiting merchant confirmation)
└─ DB: new transaction record, status='pending'

STATE 2: CONFIRMED RECEIPT (Money received by customer)
├─ Type: "Refund" or "Cancel Order"
├─ Status: "Received (Instant)"
├─ Amount: Same as STATE 1
├─ Display: Shows GREEN tag "Received (Instant)"
├─ Money Flow: Credit to customer account
├─ DB: transaction status='received'
└─ Holding Account: Money moved FROM merchant TO customer

STATE 3: INTEGRATION (Auto-sync to Google Sheets)
├─ Type: "Refund" or "Cancel Order"
├─ Status: Sync to Google Sheets automation
├─ Amount: Recorded in cashback history
├─ DB: Timestamp recorded for auto-sync
└─ Sheet: New row added to Cashback tracking sheet
```

### Transaction Structure Example

```json
{
  "id": "txn_refund_001",
  "originalTransactionId": "txn_687632",
  "type": "Refund",
  "amount": 687.632,
  "currency": "VND",
  "status": "pending",
  "refundStatus": "Pending (Wait)",
  "recipientType": "People",
  "recipient": "Tuấn",
  "merchantAccount": "Msb Online",
  "refundAccount": "Msb Online",
  "reason": "Refund: Diễn t1",
  "createdDate": "2026-01-12",
  "confirmedDate": null,
  "syncedToSheet": false,
  "notes": "Customer initiated refund request"
}
```

---

## 📍 Where Code Should Be

### File Locations

```
ACTION MENU HANDLER:
/src/components/TransactionRow.tsx (or similar)
  └─ Look for: "..." button → opens menu
  └─ Menu items array: Edit, Clone, Request Refund, Cancel Order
  └─ Missing: onClick handlers for Request Refund + Cancel Order
  └─ Status: MISSING ❌

REFUND MODAL:
/src/components/RefundModal.tsx (or RequestRefundModal.tsx)
  ├─ Dialog showing form for refund request
  ├─ Fields: Type, Refund Status, Date, Category, Holding Account, Amount, Note
  ├─ Actions: Cancel, Request Refund button
  └─ Status: EXISTS ✅ (visible in your screenshot)

REFUND API HANDLER:
/src/pages/api/transactions/refund.ts (or similar)
  ├─ POST endpoint: Creates refund transaction
  ├─ Logic: 
  │   1. Create new transaction record (status='pending')
  │   2. Link to original transaction
  │   3. Add metadata (reason, requested date)
  │   4. Return created transaction
  └─ Status: MISSING ❌

CANCEL ORDER HANDLER:
/src/pages/api/transactions/cancel-order.ts
  ├─ POST endpoint: Creates cancel order transaction
  ├─ Similar to refund but with "Cancel Order" type
  └─ Status: MISSING ❌

REFUND STATUS UPDATE:
/src/pages/api/transactions/confirm-refund.ts
  ├─ PUT endpoint: Updates refund from pending → received
  ├─ Logic:
  │   1. Find pending refund transaction
  │   2. Update status to 'received'
  │   3. Record confirmed date
  │   4. Trigger Google Sheets sync
  └─ Status: MISSING ❌

UTILS/HOOKS:
/src/hooks/useRefund.ts (or useTransactionActions.ts)
  ├─ handleRequestRefund() function
  ├─ handleCancelOrder() function
  ├─ confirmRefund() function
  └─ Status: MISSING ❌
```

---

## 🔗 PR #126 Reference

**Branch:** PHASE-9.2.1-CASHBACK-PERCENT-ENTRIES-SHEET  
**URL:** https://github.com/rei6868/money-flow-3/pull/126

### What to Extract from PR #126

1. **Request Refund Modal UI** 
   - Form fields structure
   - Validation logic
   - Submit handler
   
2. **Menu Action Handler**
   - "Request Refund" click → open modal
   - "Cancel Order (100%)" click → open cancel form
   - Send data to API

3. **API Endpoints**
   - POST /api/transactions/refund
   - POST /api/transactions/cancel-order
   - PUT /api/transactions/confirm-refund

4. **Database Logic**
   - Create refund transaction record
   - Link original txn ID
   - Track status (pending/received)
   - Timestamp fields

5. **Google Sheets Integration**
   - Sync trigger after refund received
   - Data mapping (amount, status, date)
   - Spreadsheet row addition

---

## 🛠️ Agent Tasks

### TASK 1: Search & Locate Lost Code in PR #126

**Action:**
```
1. Go to: https://github.com/rei6868/money-flow-3/pull/126
2. Click: "Files changed" tab
3. Search for files containing:
   - "Request Refund"
   - "Cancel Order"
   - "refund" (lowercase)
   - "handleRefund"
   - "confirmRefund"

4. Document EXACT files changed:
   - Component files (*.tsx)
   - API route files (*.ts)
   - Hook files
   - Utility files

5. Copy the code from PR #126 diff
```

**What to Find:**
- [ ] Request Refund modal component
- [ ] Cancel Order handler function
- [ ] API endpoint for creating refund
- [ ] API endpoint for confirming refund
- [ ] Menu item click handler
- [ ] Transaction state management
- [ ] Google Sheets sync integration

---

### TASK 2: Understand the 3-State Refund Flow

**Critical Understanding:**

```
USER FLOW:
1. Click "..." on transaction
2. Select "Request Refund"
3. Modal opens with form (TYPE=Refund, STATUS=Pending Wait)
4. User fills: Amount, Account, Notes
5. Click "Request Refund" button
   → Creates new transaction (status='pending')
   → Display: ORANGE "Pending (Wait)"
   → NO money moved yet
   
6. Later, merchant confirms refund
7. User clicks "Confirm Refund" 
   → Update transaction status='received'
   → Display: GREEN "Received (Instant)"
   → Money moved to customer account

8. Auto-sync to Google Sheets
   → Records in Cashback tracking
   → Marked for auto-processing
```

**Database State Changes:**
```
Initial (Before Refund):
- Transaction: 687.632 VND (original purchase)
- Status: completed
- Amount: 687.632

After "Request Refund":
- Original Transaction: still 687.632 (unchanged)
- NEW Transaction Created:
  - Type: "Refund"
  - Amount: 687.632
  - Status: "pending"
  - RefundStatus: "Pending (Wait)"
  - LinkedTo: original_txn_id

After "Confirm Refund":
- NEW Transaction Updated:
  - Status: "received"
  - RefundStatus: "Received (Instant)"
  - ConfirmedDate: 2026-01-12
  - Money: MOVED to customer balance
  
After Sync:
- Google Sheet: New row with refund record
- Tracking: Amount in cashback report
```

---

### TASK 3: Extract Code from PR #126

**Step 1: Get Menu Handler Code**
```
Search in PR #126 for:
Location: /src/components/TransactionRow.tsx

Find this pattern:
const menuItems = [
  { label: 'Edit', onClick: () => ... },
  { label: 'Clone', onClick: () => ... },
  { label: 'Request Refund', onClick: handleRequestRefund },
  { label: 'Cancel Order (100%)', onClick: handleCancelOrder },
  ...
]

Extract:
- Full menuItems array
- handleRequestRefund function
- handleCancelOrder function
- Modal open trigger
```

**Step 2: Get Modal Component Code**
```
Search in PR #126 for:
Location: /src/components/RefundModal.tsx

Extract:
- Full component code
- Form field structure
- Validation logic
- Submit handler
- Status toggle (Pending Wait / Received Instant)
```

**Step 3: Get API Handler Code**
```
Search in PR #126 for:
Location: /src/pages/api/transactions/refund.ts

Extract:
- POST handler structure
- Request validation
- Transaction creation logic
- Database insert query
- Response format

Also search for:
Location: /src/pages/api/transactions/confirm-refund.ts

Extract:
- PUT handler for status update
- Sync trigger
```

**Step 4: Get Hook/Utils Code**
```
Search in PR #126 for:
Location: /src/hooks/useRefund.ts (or similar)

Extract:
- useRefund hook
- createRefundTransaction function
- confirmRefundTransaction function
- cancelOrder function
- Error handling
```

---

### TASK 4: Identify Exact Code Loss Points

**Questions to Answer:**
```
1. What WAS removed?
   - Was refund modal deleted completely?
   - Was API endpoint removed?
   - Was menu handler function removed?
   - Answer: Check git diff between PR #126 and current main

2. Where is it missing?
   - Menu: TransactionRow.tsx line X?
   - Modal: RefundModal.tsx (file deleted?)
   - API: /api/transactions/refund.ts (file deleted?)
   - Hooks: useRefund.ts (file moved? renamed?)
   - Answer: Search for files, check git history

3. What broke dependencies?
   - Modal component imports broken?
   - API routes removed but not replaced?
   - Hook references still exist but implementation gone?
   - Answer: Check import statements, search for "useRefund"

4. Is partial code still there?
   - Is modal component 50% intact?
   - Are API routes partially implemented?
   - Is menu handler skeleton there (missing onClick)?
   - Answer: grep for "refund" in entire codebase
```

---

### TASK 5: Create Recovery Plan

**Step 1: File Restoration**
```
For each missing file:
1. Check if file exists but code deleted
   → IF YES: Restore from git history (git show)
   
2. Check if file deleted entirely
   → IF YES: Recreate from PR #126 reference

3. Check if file renamed/moved
   → IF YES: Find new location, verify imports
```

**Step 2: Import Fixes**
```
After restoring files, verify:
- TransactionRow.tsx imports RefundModal ✓
- RefundModal.tsx imports API functions ✓
- API functions import DB types ✓
- Hooks imported where needed ✓
```

**Step 3: Integration Points**
```
1. Menu handler → calls useRefund hook
2. useRefund hook → calls API endpoint
3. API endpoint → creates DB record
4. DB record → triggers Google Sheets sync
5. Frontend → shows modal
6. Modal submit → calls API
7. API response → updates UI state
```

---

## 📊 Refund Logic Components

### Component Map

```
TransactionRow.tsx (BROKEN - Missing handler)
├─ Render: "..." menu button
├─ onClick: opens menu
├─ Menu items:
│  ├─ Edit ✅
│  ├─ Clone ✅
│  ├─ Request Refund ❌ MISSING
│  ├─ Cancel Order ❌ MISSING
│  ├─ View History ✅
│  └─ Void Transaction ✅
└─ Task: Add click handlers

RefundModal.tsx (EXISTS but not triggered)
├─ Dialog: "Request Refund"
├─ Fields:
│  ├─ Type: "Refund" select ✅
│  ├─ Refund Status: "Pending Wait" / "Received Instant" ✅
│  ├─ Date: 01/05/2026 ✅
│  ├─ Category: "Refund" ✅
│  ├─ Holding Account: "Msb Online" ✅
│  ├─ Amount: 687.632 ✅
│  └─ Note: "Refund: Diễn t1" ✅
├─ Buttons: Cancel / Request Refund ✅
└─ Task: Connect to API, handle submit

API: /api/transactions/refund.ts (MISSING)
├─ POST handler
├─ Input: transaction ID, amount, reason
├─ Process:
│  ├─ Validate transaction exists
│  ├─ Create new transaction record (status='pending')
│  ├─ Link to original transaction
│  ├─ Return created record
│  └─ Schedule Google Sheets sync
├─ Output: { success, transaction, message }
└─ Task: Create from PR #126 reference

API: /api/transactions/confirm-refund.ts (MISSING)
├─ PUT handler
├─ Input: refund transaction ID
├─ Process:
│  ├─ Find refund transaction
│  ├─ Update status='received'
│  ├─ Record confirmed date
│  ├─ Trigger Google Sheets sync
│  └─ Update customer balance
├─ Output: { success, transaction, message }
└─ Task: Create from PR #126 reference

Hook: useRefund.ts (MISSING)
├─ Function: handleRequestRefund()
│  └─ Opens RefundModal
│  └─ Prepares transaction data
│  └─ Calls API: createRefundTransaction
├─ Function: handleCancelOrder()
│  └─ Opens RefundModal with type='Cancel'
│  └─ Calls API: cancelOrderTransaction
├─ Function: confirmRefund()
│  └─ Calls API: confirmRefundTransaction
│  └─ Updates UI state
└─ Task: Create from PR #126 reference
```

---

## 🔄 Complete Refund Workflow

### Detailed Flow Diagram

```
START: User clicks "..." on transaction 687.632 VND
│
├─ STEP 1: Menu appears
│  ├─ Request Refund ← User clicks HERE
│  └─ Cancel Order (100%)
│
├─ STEP 2: Modal opens (RefundModal.tsx)
│  ├─ Type: "Refund" (auto-filled)
│  ├─ Status: "Pending (Wait)" (auto-filled)
│  ├─ Amount: 687.632 (auto-filled from transaction)
│  ├─ Category: "Refund" (auto-filled)
│  ├─ Holding Account: "Msb Online" (from original txn)
│  ├─ Note: User types "Diễn t1"
│  └─ User clicks: "Request Refund" button
│
├─ STEP 3: API call (POST /api/transactions/refund)
│  ├─ Input: {
│  │   "transactionId": "txn_687632",
│  │   "type": "Refund",
│  │   "amount": 687632,
│  │   "reason": "Diễn t1",
│  │   "refundStatus": "Pending (Wait)",
│  │   "account": "Msb Online"
│  │ }
│  ├─ Backend creates NEW transaction:
│  │   - Type: "Refund"
│  │   - Amount: 687632
│  │   - Status: "pending"
│  │   - LinkedTransactionId: txn_687632
│  │   - CreatedDate: 2026-01-12
│  │   - ConfirmedDate: null
│  │ Database INSERT
│  └─ Return: { success: true, transaction: {...} }
│
├─ STEP 4: UI Update (Frontend)
│  ├─ Modal closes
│  ├─ Transaction table refreshes
│  ├─ NEW transaction row appears:
│  │   - Type: "Refund" (ORANGE icon)
│  │   - Status: "Pending (Wait)" (ORANGE tag)
│  │   - Amount: 687.632 VND
│  │   - Date: 12/01/2026
│  │   - Notes: "Refund: Diễn t1"
│  └─ Original transaction shows as linked
│
├─ STEP 5: Merchant processes refund (WAITING)
│  ├─ Transaction stays "Pending (Wait)"
│  ├─ Money NOT transferred yet
│  └─ Merchant confirms...
│
├─ STEP 6: User confirms receipt
│  ├─ User clicks "Confirm Refund" on pending refund
│  └─ OR auto-triggered by webhook (if enabled)
│
├─ STEP 7: API call (PUT /api/transactions/confirm-refund)
│  ├─ Input: { "refundTransactionId": "txn_refund_001" }
│  ├─ Backend updates transaction:
│  │   - Status: "pending" → "received"
│  │   - ConfirmedDate: 2026-01-12
│  │   - Amount moved to customer balance
│  │ Database UPDATE
│  └─ Trigger Google Sheets sync
│
├─ STEP 8: UI Update (Green confirmation)
│  ├─ Refund transaction now shows:
│  │   - Status: "Received (Instant)" (GREEN tag)
│  │   - ConfirmedDate: 12/01/2026
│  │   - Money appears in customer balance
│  └─ Transaction marked as "completed"
│
└─ END: Refund process complete ✓
```

---

## 🎯 Agent Research Tasks (Prioritized)

### PRIORITY 1: IMMEDIATE (Do First)
```
Task A: Locate PR #126 files
  [ ] Go to PR #126 on GitHub
  [ ] Find all files with "refund" in name or content
  [ ] Document file paths
  [ ] Copy complete code from each file
  
Task B: Check current codebase for remnants
  [ ] Search for "Request Refund" string → not found?
  [ ] Search for "handleRequestRefund" → not found?
  [ ] Search for "RefundModal" → not found?
  [ ] Grep entire /src for "refund" → see what's left
  [ ] Check /src/pages/api/transactions/* → is refund.ts missing?
```

### PRIORITY 2: UNDERSTAND (After finding code)
```
Task C: Understand the 3-state model
  [ ] From PR #126 code, identify:
    - How is status tracked? (pending vs received)
    - What's the data model?
    - How does Google Sheets sync trigger?
    - What fields are required?
  
Task D: Map dependencies
  [ ] What imports refund code needs
  [ ] What files depend on refund logic
  [ ] Are there circular dependencies?
```

### PRIORITY 3: RESTORE (Implementation)
```
Task E: Restore missing files
  [ ] Copy from PR #126 if fully deleted
  [ ] Or restore from git history: git show COMMIT:filepath
  [ ] Update imports to match current file structure
  [ ] Fix any TypeScript errors
  
Task F: Connect components
  [ ] Add menu handler to TransactionRow.tsx
  [ ] Link modal to component
  [ ] Link API calls in menu handler
  [ ] Test flow end-to-end
```

---

## 🔍 Debugging Checklist

If code is restored but not working:

```
[ ] Menu handler exists
    - File: TransactionRow.tsx
    - Check: menuItems array has "Request Refund"
    - Check: onClick handler exists
    - Check: Handler calls useRefund hook
    
[ ] Modal renders on click
    - File: RefundModal.tsx
    - Check: Component imported in TransactionRow
    - Check: Modal open state triggered
    - Check: Form fields render
    
[ ] API endpoint exists
    - File: /api/transactions/refund.ts
    - Check: POST handler implemented
    - Check: Endpoint accepts JSON
    - Check: Database insert works
    - Test: curl -X POST with sample data
    
[ ] Frontend receives response
    - Check: fetch call succeeds
    - Check: Error handling works
    - Check: UI updates after response
    - Check: No console errors
    
[ ] Status tracking works
    - Check: Status changes from "pending" to "received"
    - Check: Database updates correctly
    - Check: UI reflects status change
    
[ ] Google Sheets sync triggers
    - Check: Sync function called
    - Check: Google Apps Script receives data
    - Check: Row added to sheet
```

---

## 📝 Questions for Agent

1. **Can you find all files in PR #126 containing "refund" code?**
   - List exact file paths and line ranges
   
2. **What's the status of these files in current main branch?**
   - Are they deleted?
   - Are they 50% intact?
   - Are they renamed?

3. **From PR #126 code, what's the transaction state model?**
   - How is "Pending (Wait)" vs "Received (Instant)" tracked?
   - Where is the status field stored?
   - What triggers the status change?

4. **What API endpoints are needed?**
   - POST /api/transactions/refund?
   - PUT /api/transactions/confirm-refund?
   - Any others?

5. **Is Google Sheets sync integration still in place?**
   - Or was it also lost?
   - How should refund transactions be synced?

---

## 📋 Expected Output from Agent

Agent should provide:

```
FINDING REPORT:
├─ Files found in PR #126
│  ├─ TransactionRow.tsx (lines X-Y, contains menu handler)
│  ├─ RefundModal.tsx (complete file, Z lines)
│  ├─ /api/transactions/refund.ts (complete file)
│  └─ useRefund.ts hook (complete file)
│
├─ Current status in main
│  ├─ TransactionRow.tsx: menu handler DELETED ❌
│  ├─ RefundModal.tsx: file DELETED ❌
│  ├─ /api/transactions/refund.ts: file DELETED ❌
│  └─ useRefund.ts: file DELETED ❌
│
├─ Code to restore (full code blocks)
│  ├─ [Full TransactionRow.tsx from PR #126]
│  ├─ [Full RefundModal.tsx from PR #126]
│  ├─ [Full refund.ts API handler]
│  └─ [Full useRefund.ts hook]
│
└─ Integration points
   ├─ Menu handler → useRefund hook
   ├─ useRefund hook → RefundModal
   ├─ RefundModal → API call
   └─ API → Database
```

---

## 🚀 Next Steps

1. **Agent Research Phase:**
   - Search PR #126 for all refund-related code
   - Document findings in detailed report
   - Copy complete code blocks for review

2. **Code Review Phase:**
   - Analyze PR #126 code structure
   - Understand 3-state model
   - Plan integration with current main branch

3. **Restoration Phase:**
   - Copy files from PR #126
   - Update imports for current structure
   - Fix TypeScript errors
   - Test flow end-to-end

4. **Testing Phase:**
   - Menu: "Request Refund" appears and works
   - Modal: Opens with correct fields
   - API: Creates refund transaction
   - Status: Changes from pending to received
   - Sheet: Sync works correctly

---

## 📞 Key References

| Reference | URL |
|-----------|-----|
| **PR #126** | https://github.com/rei6868/money-flow-3/pull/126 |
| **Branch** | PHASE-9.2.1-CASHBACK-PERCENT-ENTRIES-SHEET |
| **Repo** | https://github.com/rei6868/money-flow-3 |
| **Your Screenshot** | Shows RefundModal exists (modal code found) |
| **Missing** | Menu handler + API endpoints + Hook |

---

## ⚠️ Critical Notes for Agent

1. **PR #126 is the source of truth** for refund logic
   - Don't invent logic, extract from PR
   - Verify 3-state model from PR code
   - Copy exact validation rules from PR

2. **3-state model is critical to understand**
   - Pending (Wait) = no money moved yet
   - Received (Instant) = money confirmed
   - This affects how database and UI work

3. **Integration is key**
   - Menu handler must call useRefund hook
   - useRefund hook must call API
   - API must create database record
   - Each layer depends on previous
   - If ANY layer broken, whole flow fails

4. **Don't skip API endpoints**
   - refund.ts: creates pending refund
   - confirm-refund.ts: marks as received
   - Both must exist for flow to work

5. **Google Sheets sync is important**
   - After refund received, must sync
   - Check PR #126 for sync logic
   - Don't break existing sync functionality

---

**Document Version:** 1.0  
**Created:** 2026-01-12  
**For:** Antigravity Agent (Code Recovery)  
**Status:** Ready for Agent Analysis

**Critical Action:** Agent MUST analyze PR #126 first, then locate all missing code

