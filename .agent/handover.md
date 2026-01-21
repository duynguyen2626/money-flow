# Handover Document: Cashback Section Issues

## Current Status: INCOMPLETE

The cashback section refactor in TransactionSlideV2 has been partially implemented but **critical issues remain unresolved**. This document provides context for the next agent to continue the work.

## Problem Statement

### User-Reported Issues (Still Failing)

1. **"Applied Rate" shows 10% instead of 20%**
   - Despite auto-fill logic extracting 20% from config
   - Despite form field showing "20" correctly
   - The "Applied Rate" display still shows 10%

2. **Modal "Transactions contributing to Cashback" doesn't recalculate**
   - The "Earn" amount doesn't update after editing transactions
   - Requires manual investigation of the calculation logic

### Root Cause Analysis Needed

The issue is **NOT** in the UI form or data conversion. The problems lie deeper:

1. **Applied Rate Display Logic**
   - Location: Unknown (needs investigation)
   - The value "10%" is hardcoded or calculated somewhere else
   - Check: `src/lib/cashback.ts`, `src/actions/cashback.actions.ts`
   - Check: Any component rendering "Applied Rate" text

2. **Cashback Calculation Service**
   - Location: Likely `src/services/cashback.service.ts` or similar
   - The "Earn" amount calculation may not be using the correct rate
   - May be using legacy 10% default instead of reading from transaction

## Work Completed (Cycles 19, 19.1, 19.2)

### ✅ Cycle 19: Cashback Section Refactor
- Renamed tabs: "Virtual" → "Claim", "Real" → "Give Away"
- Added conditional enabling: "Give Away" and "Voluntary" disabled when no person selected
- Implemented rate auto-fill logic to extract highest rate from tiered configs
- Files modified:
  - `src/components/transaction/slide-v2/single-mode/cashback-section.tsx`

### ✅ Cycle 19.1: Percentage to Decimal Conversion
- Fixed database overflow error (`numeric field overflow`)
- Implemented bidirectional conversion: UI percentage (20) ↔ DB decimal (0.2)
- Auto-fill multiplies by 100: `bestRate * 100` (0.2 → 20)
- Submit divides by 100: `data.cashback_share_percent / 100` (20 → 0.2)
- Files modified:
  - `src/components/transaction/slide-v2/transaction-slide-v2.tsx` (line 199)
  - `src/components/transaction/slide-v2/single-mode/cashback-section.tsx` (line 92)

### ✅ Cycle 19.2: Dynamic Refresh and Loading States
- Added loading indicator in TransactionSlideV2 header when editing
- Fixed edit showing 0.2 instead of 20 (convert decimal to percentage on load)
- Implemented dynamic modal refresh using `refreshKey` state
- Files modified:
  - `src/components/transaction/slide-v2/transaction-slide-v2.tsx` (lines 60, 157, 173, 248)
  - `src/components/accounts/v2/AccountRowV2.tsx` (lines 80, 167, 196, 214, 788)
  - `src/components/accounts/v2/AccountCycleTransactionsModal.tsx` (lines 19, 28, 50)

## Technical Details

### Data Flow

```
1. Config Storage (DB):
   account.cashback_config.program.levels[0].rules[0].rate = 0.2

2. Auto-fill Extraction:
   bestRate = 0.2 (extracted from config)
   form.setValue('cashback_share_percent', 0.2 * 100) // Sets 20

3. UI Display:
   Input field shows: 20 (percentage)

4. Form Submission:
   payload.cashback_share_percent = 20 / 100 // Saves 0.2

5. Database Storage:
   transactions.cashback_share_percent = 0.2 (decimal)

6. Edit Load:
   formVal.cashback_share_percent = 0.2 * 100 // Shows 20
```

### Key Code Locations

**Auto-fill Logic:**
```typescript
// src/components/transaction/slide-v2/single-mode/cashback-section.tsx:61-92
const handleTabChange = (val: string) => {
  // ... extract bestRate from config.program.levels[].rules[].rate
  if (bestRate > 0) {
    form.setValue('cashback_share_percent', bestRate * 100); // 0.2 → 20
  }
}
```

**Submit Conversion:**
```typescript
// src/components/transaction/slide-v2/transaction-slide-v2.tsx:199
cashback_share_percent: data.cashback_share_percent ? data.cashback_share_percent / 100 : null
```

**Edit Load Conversion:**
```typescript
// src/components/transaction/slide-v2/transaction-slide-v2.tsx:173
cashback_share_percent: txn.cashback_share_percent ? txn.cashback_share_percent * 100 : undefined
```

## Investigation Required

### Priority 1: Find "Applied Rate" Source

**Search for:**
- Text: "Applied Rate"
- Components rendering cashback policy details
- Functions calculating or displaying the applied rate

**Likely locations:**
- `src/components/transaction/slide-v2/single-mode/cashback-section.tsx` (already checked, not found)
- `src/lib/cashback.ts` (utility functions)
- `src/actions/cashback.actions.ts` (server actions)
- Any component that reads `cashback_share_percent` and displays it

**Debug steps:**
1. Search codebase for "Applied Rate" text
2. Add console.log to see where 10% is coming from
3. Check if there's a default fallback to 10%
4. Verify the value is read from `transaction.cashback_share_percent` correctly

### Priority 2: Investigate Cashback Calculation

**Search for:**
- Functions calculating "Earn" amount
- Modal component fetching transaction data
- Cashback aggregation logic

**Likely locations:**
- `src/services/cashback.service.ts`
- `src/actions/cashback.actions.ts` (specifically `fetchAccountCycleTransactions`)
- Database queries aggregating cashback amounts

**Debug steps:**
1. Check `fetchAccountCycleTransactions` implementation
2. Verify SQL query reads `cashback_share_percent` correctly
3. Check if calculation uses transaction rate or account default rate
4. Add logging to see actual values being calculated

## Test Account Configuration

**MSB mDigi:**
```json
{
  "program": {
    "defaultRate": 0,
    "maxBudget": 300000,
    "statementDay": 20,
    "dueDate": 4,
    "levels": [
      {
        "id": "lvl_1",
        "name": "Default",
        "defaultRate": 0,
        "minTotalSpend": 0,
        "rules": [
          {
            "id": "rule_1",
            "rate": 0.2,  // 20%
            "maxReward": null,
            "categoryIds": ["e0000000-0000-0000-0000-000000000001"]
          }
        ]
      }
    ]
  }
}
```

**Expected behavior:**
- Auto-fill should set 20 in UI ✅ (Working)
- Database should store 0.2 ✅ (Working)
- Edit should show 20 ✅ (Working)
- "Applied Rate" should display 20% ❌ (Still shows 10%)
- Cashback calculation should use 0.2 ❌ (Needs verification)

## Files Modified (Git Status)

```
modified:   src/components/transaction/slide-v2/transaction-slide-v2.tsx
modified:   src/components/transaction/slide-v2/single-mode/cashback-section.tsx
modified:   src/components/accounts/v2/AccountRowV2.tsx
modified:   src/components/accounts/v2/AccountCycleTransactionsModal.tsx
```

## Next Steps for Agent

1. **DO NOT continue coding blindly**
   - The UI layer is working correctly
   - The issue is in display/calculation logic

2. **Research Phase:**
   - Find where "Applied Rate: 10%" is rendered
   - Find where "Earn" amount is calculated
   - Check if there's a hardcoded 10% fallback

3. **Fix Phase:**
   - Update "Applied Rate" to read from form value or transaction
   - Update cashback calculation to use transaction rate, not default
   - Verify with user's test case (MSB mDigi, 20%)

4. **Verification:**
   - Create transaction with 20% rate
   - Check "Applied Rate" shows 20%
   - Check modal "Earn" calculates correctly
   - Edit transaction and verify recalculation

## References

- **Manual Guide (Vietnamese):** `.agent/MANUAL_GUIDE_VI.md`
- **Implementation Plan:** `.agent/brain/.../implementation_plan.md`
- **Walkthrough:** `.agent/brain/.../walkthrough.md`
- **Task Tracking:** `.agent/brain/.../task.md`

## Contact

If you need clarification on the work done, review:
1. Git commit history for Cycles 19, 19.1, 19.2
2. Console logs: `[CashbackSection] Auto-fill rate: ...`
3. Browser DevTools to inspect form values vs. displayed values

**Critical:** The user is frustrated with time wasted. Focus on **research and root cause analysis** before making any code changes.
