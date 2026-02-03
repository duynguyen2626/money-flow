# 🐛 Duplicate Transaction Debug Guide

## Console Logs Chính Xác Khi Duplicate

Khi click **Duplicate button** và submit form, bạn sẽ thấy **8 console logs theo thứ tự:**

### 1️⃣ Form Submit Started (khi click Save/Submit button)
```
✅ onSingleSubmit called - Form validation PASSED
```

### 2️⃣ Form Data (tất cả fields được submit)
```
📋 Form data: {
  type: "debt" | "expense" | "income" | ...,
  amount: 1111,
  source_account_id: "37774331-...",
  target_account_id: undefined | "...",
  category_id: "0Bec95c99-...",
  shop_id: "ea3477cb-...",
  person_id: "dba2a24b-...",
  occurred_at: Date object,
  note: "111",
  tag: "2026-02",
  cashback_mode: "none_back"
}
```

### 3️⃣ Operation Mode Check
```
🎯 Operation: "duplicate" | editingId: undefined
```
- **Duplicate:** `operationMode="duplicate"` + `editingId=undefined`
- **Edit:** `operationMode="edit"` + `editingId="xxx-yyy-zzz"`
- **Add:** `operationMode="add"` + `editingId=undefined`

### 4️⃣ Action Decision
```
🔀 Will call: "createTransaction()" | "updateTransaction()"
```
- Duplicate/Add → `createTransaction()`
- Edit → `updateTransaction()`

### 5️⃣ Transaction Start
```
🚀 Starting transaction submit...
```

### 6️⃣ Mode Confirmation
```
➕ CREATE mode - creating new transaction
```
hoặc
```
📝 UPDATE mode - editingId: xxx-yyy-zzz
```

### 7️⃣ Result
```
✨ Create result - newId: "new-transaction-id"
```

### 8️⃣ Success Status
```
🎉 Submit success: true
```

---

## ❌ Nếu Có Lỗi (Error Logs)

### Case 1: Validation Failed (form không submit)
```
❌ Form validation FAILED
Validation errors object: { field_name: { message: "error message" } }
Form state: {
  isValid: false,
  isSubmitting: false,
  errors: { ... }
}
Current form values: { ... }
```

**Fix:** Kiểm tra field nào có error trong `errors` object.

### Case 2: Submit Failed (API error)
```
❌ Submission error caught: Error message
Error details: {
  message: "...",
  stack: "..."
}
```

**Fix:** Kiểm tra error message để biết lỗi gì (database, network, validation, etc).

---

## 🔍 Checklist Debug Duplicate

Khi duplicate fails, kiểm tra console logs theo thứ tự:

| # | Log | Check | Issue If Missing |
|---|-----|-------|-----------------|
| ✅ | `onSingleSubmit called` | Form validation passed? | Validation error - check field values |
| ✅ | `Form data` | All fields có giá trị? | Missing required fields |
| ✅ | `Operation: duplicate` | OperationMode đúng? | Mode bị nhầm |
| ✅ | `editingId: undefined` | EditingId = undefined? | Sẽ update thay vì create |
| ✅ | `Will call: createTransaction()` | Logic đúng? | Wrong function called |
| ✅ | `CREATE mode` | Confirmed create? | Mode confusion |
| ✅ | `Create result - newId: xxx` | newId có giá trị? | Create failed |
| ✅ | `Submit success: true` | Success = true? | Operation failed |

---

## 🎯 Expected Flow for Duplicate

```
User clicks Duplicate button (Files icon)
  ↓
UnifiedTransactionsPage.handleDuplicate()
  ↓
Set slideMode='duplicate', selectedTxn=txn, isSlideOpen=true
  ↓
TransactionSlideV2 opens with:
  - operationMode='duplicate'
  - editingId=undefined
  - initialData={...txn, occurred_at: new Date()}
  ↓
Form populates with data
  ↓
User clicks Submit
  ↓
onSingleSubmit() called
  ↓
Since editingId=undefined → createTransaction()
  ↓
New transaction created with new ID
  ↓
Success toast + loading indicator → page refresh
```

---

## 🐞 Common Issues

### Issue 1: "Form validation errors: {}" (empty object)
**Symptom:** Error callback called but errors object empty
**Cause:** `zodResolver` failing silently
**Fix:** Check if field types match schema (Date vs string, number vs string)

### Issue 2: Duplicate calls `updateTransaction` instead of `createTransaction`
**Symptom:** Log shows "UPDATE mode" when duplicating
**Cause:** `editingId` is not undefined
**Fix:** Check `handleDuplicate` - should NOT set editingId

### Issue 3: Form fields empty when duplicate opens
**Symptom:** Slide opens but fields are blank
**Cause:** `initialSlideData` computation error
**Fix:** Check `selectedTxn` has data and `slideMode` is correct

### Issue 4: Loading indicator không hiện
**Symptom:** No loading animation after submit
**Cause:** `handleSlideSubmissionStart` not called
**Fix:** Check `onSubmissionStart` prop passed to TransactionSlideV2

### Issue 5: Success but no refresh
**Symptom:** Toast "success" but table not updated
**Cause:** `router.refresh()` not called
**Fix:** Check `handleSlideSubmissionEnd` calls `router.refresh()`

### Issue 6: Validation passes but submit does nothing
**Symptom:** Console shows success logs but no toast/update
**Cause:** Server action failed silently
**Fix:** Check `createTransaction` return value and server logs

---

## 📸 Screenshot Your Console

Khi report bug, chụp console với **TẤT CẢ 8 logs trên** (hoặc error logs nếu có). 

Đặc biệt quan trọng:
- ✅ `Form data` - để check field values
- ✅ `editingId` - để xác nhận không phải edit mode
- ✅ `Create result` - để biết create có thành công không
- ✅ Error messages (nếu có)

---

## 💡 Test Steps

1. Go to `/transactions`
2. Find any transaction
3. Click **Duplicate** button (Files icon - tím)
4. Verify slide opens with title "Duplicate Transaction"
5. Verify all fields populated (date changed to today)
6. Click Submit
7. Check console logs - should see all 8 logs above
8. Verify loading indicator appears (blue gradient top-center)
9. Verify success toast appears
10. Verify page refreshes and new transaction appears in table

---

**Updated:** Feb 2, 2026 - Enhanced logging v2
