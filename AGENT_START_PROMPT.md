# 🚀 Agent Onboarding Prompt - Duplicate Transaction Issue

Copy and paste this into your next chat session:

---

## Mission Brief

Debug duplicate transaction feature that fails silently when submitting. Test ID: `aae9c0be-e0e1-456f-b06e-87500607afe8`

## Read First (Required - 15 min)

1. **TRANSACTION_SYSTEM_DOCS.md** - Complete system overview (V2 vs V1, operations, data flow)
2. **HANDOVER_12-2.md** (.agent folder) - Investigation so far + 4 root cause theories
3. **DUPLICATE_DEBUG_GUIDE.md** - 8-step console log reference

## Quick Context

- **System:** TransactionSlideV2 (right-side slide panel)
- **Issue:** Duplicate button works → slide opens → form populates → submit fails (no error)
- **Branch:** `fix/phase-12-critical-bugs` (already pushed to GitHub)
- **V1 System:** ARCHIVED in `Archive/components/moneyflow/` - DO NOT USE

## Test Procedure

### Step 1: Open Page
```
Go to: http://localhost:3000/transactions
```

### Step 2: Find Test Transaction
```
Transaction ID: aae9c0be-e0e1-456f-b06e-87500607afe8
Type: debt
Amount: 1111
```

### Step 3: Open DevTools
```
F12 → Console tab + Network tab (both visible)
```

### Step 4: Duplicate
```
1. Click duplicate button (Files icon, purple)
2. Watch console - should see logs:
   🔄 initialSlideData useMemo triggered
   🎨 defaultFormValues computed
   
3. Form should be populated with data
4. Click Submit
5. Watch for 8-step logs OR error logs
```

### Step 5: Check Network
```
Network tab → Filter "XHR" → Look for:
- POST to createTransaction action
- Check request payload (form data)
- Check response (success/error?)
```

## Root Cause Theories (Priority)

**Theory 1 (HIGH):** Form reset race condition
- Form values populated → user submits → React batch state update → selectedTxn cleared → form resets to empty → validation fails
- **Debug:** Add logs to track when selectedTxn changes

**Theory 2 (HIGH):** Zod resolver type mismatch
- `zodResolver(schema) as any` hides errors
- **Debug:** Remove `as any`, check actual resolver errors

**Theory 3 (MEDIUM):** Server action fails silently
- createTransaction returns null without throwing
- **Debug:** Add try/catch in transaction-actions.ts

**Theory 4 (LOW):** Cashback policy rejection
- Cashback resolution fails on duplicate
- **Debug:** Check cashback.service.ts logs

## Key Files to Check

```
src/components/transactions/UnifiedTransactionsPage.tsx
  - Line 558: initialSlideData computation
  - Line 462-469: handleDuplicate handler
  
src/components/transaction/slide-v2/transaction-slide-v2.tsx
  - Line 70: defaultFormValues computation
  - Line 195: onSingleSubmit with operation routing
  
src/actions/transaction-actions.ts
  - createTransaction() server action
  
src/components/transaction/slide-v2/types.ts
  - Line 11: singleTransactionSchema (Zod validation)
```

## Expected Console Logs (When Working)

```
✅ onSingleSubmit called - Form validation PASSED
📋 Form data: {...all fields...}
🎯 Operation: "duplicate" | editingId: undefined
🔀 Will call: "createTransaction()"
🚀 Starting transaction submit...
➕ CREATE mode - creating new transaction
✨ Create result - newId: "xxx-yyy-zzz"
🎉 Submit success: true
```

## If You See This (Problem Indicators)

```
❌ Form validation FAILED
Validation errors object: {}
Current form values: {}
Initial data passed: {}
```
→ Form reset before submit (Theory 1)

```
No console logs after clicking submit
```
→ Form submit handler not triggered (check onClick binding)

```
Network request never sent
```
→ Validation failed before reaching server action

```
Network response 200 but no newId
```
→ Server action failing silently (Theory 3)

## Commands to Run

```bash
# Start dev server
pnpm dev

# Build check (should pass)
pnpm build

# If need to checkout branch
git checkout fix/phase-12-critical-bugs
```

## Success Criteria

When fixed:
- ✅ Console shows all 8 logs
- ✅ Network shows POST to createTransaction
- ✅ Response contains newId
- ✅ Loading indicator appears
- ✅ Success toast shows
- ✅ Page refreshes
- ✅ New transaction visible in table

## Research Approach

1. **Phase 1 - Reproduce (5 min)**
   - Follow test procedure above
   - Screenshot console + network tabs
   - Confirm which logs appear/missing

2. **Phase 2 - Identify Theory (10 min)**
   - Based on logs, pick theory 1-4
   - Read related code sections
   - Add targeted debug logs

3. **Phase 3 - Fix (20 min)**
   - Implement fix
   - Test with same ID
   - Verify all 8 logs appear
   - Verify transaction created

4. **Phase 4 - Validate (10 min)**
   - Build passes
   - Test add/edit still work
   - Test duplicate with different transaction
   - Commit and push

## Additional Context

- **Modal Dialog:** DEPRECATED - archived in Archive/ folder
- **V2 System:** TransactionSlideV2 - current active system
- **Loading Indicator:** Already implemented (blue gradient, top-center)
- **Pre-existing TS Errors:** In accounts components - NOT related to this issue

## Questions to Answer

1. Does `initialSlideData` have data when duplicate opens?
2. Does `defaultFormValues` receive initialData?
3. Do form values persist until submit button clicked?
4. Does `onSingleSubmit` get called?
5. Does `createTransaction` server action execute?
6. What does server response contain?

## Quick Reference

- **Docs:** TRANSACTION_SYSTEM_DOCS.md
- **Onboarding:** ONBOARDING.md  
- **Handover:** .agent/HANDOVER_12-2.md
- **Debug Guide:** DUPLICATE_DEBUG_GUIDE.md

---

**Your Task:** Open browser DevTools → Test duplicate → Find root cause → Fix → Verify → Commit

Good luck! 🚀
