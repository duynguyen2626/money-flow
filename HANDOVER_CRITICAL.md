# 🚨 CRITICAL HANDOVER - Phase 12.1 Transaction Table Flow Column

**Date:** Feb 2, 2026  
**Status:** ⚠️ MULTIPLE ATTEMPTS FAILED - ROOT CAUSE ANALYSIS NEEDED  
**Attempted By:** GitHub Copilot (19 messages of attempts)  
**For Next Agent:** **START WITH DEBUG, NOT CODE**

---

## The Problem (3 Critical Issues)

### Issue #1: Single Flow Pills TOO LONG
- **Symptom:** Single-entity rows (e.g., "mVib Online | Tuấn") are visibly LONGER than dual-flow rows
- **Root Cause Hypothesis:** Single flow uses `flex-1` (takes all available width), dual flow uses `max-w-[44%]` per side
- **Expected Fix:** Both should have same max-width constraint
- **Location:** `src/components/moneyflow/unified-transaction-table.tsx` case "account" ~line 2110-2145

### Issue #2: Pills Height Uneven
- **Symptom:** Some pills show full background, others cut off or misaligned
- **Data Points:** 
  - Avatar size 7x7 (h-7 w-7) is constant
  - Container height varies (h-7, h-9, h-10 mixed in different code paths)
  - RenderEntity uses baseBadgeClasses `h-9` but single flow wrapper might use different height
- **Location:** baseBadgeClasses definition + RenderEntity function + single/dual flow containers

### Issue #3: Edit/Duplicate Dialog Cannot Cancel
- **Symptom:** Warning modal appears when editing, but user can click Cancel/ESC to dismiss WITHOUT confirmation
- **Expected:** Dialog should be modal (blocks all interaction until confirmed)
- **Issue:** `hasUnsavedChanges` state not working, OR z-index/pointer-events preventing interaction
- **Location:** `src/components/moneyflow/add-transaction-dialog.tsx` warning modal logic

---

## What Failed (4 Attempted Solutions)

| Attempt | Approach | Result | Why Failed |
|---------|----------|--------|-----------|
| 1 | Height alignment (h-7→h-9) | Partial | Multiple matches, only some replaced |
| 2 | Refactor 4 paths to unified logic | Code compiled | Logic broken - only showed people, not accounts |
| 3 | Remove badges from flow | Changes applied | Pills still showed mixed heights, accounts missing |
| 4 | Clean rewrite from scratch | Only people displayed | Condition logic `!hasTarget` was wrong - filtered out accounts |

---

## Current Code Issue (Line 2079+)

```tsx
case "account": {
  const hasPerson = !!personId
  const hasTarget = !!destId
  
  // Single flow: show person OR account
  if (!hasTarget) {  // ❌ WRONG CONDITION!
    // Returns early with person OR source account
  }
  
  // Dual flow logic below (never reached when destId=null but person exists)
}
```

### The Bug:
- `!hasTarget` triggers whenever `destId` is null
- This includes: expenses, income, transfers to ACCOUNT (which have NO destId, only personId)
- So "Expense to Person" gets treated as single flow instead of dual flow
- **Correct condition should be:** `!personId && !targetId && !transferTarget` (need to understand data structure)

---

## What You MUST Do First (Next Agent)

### Step 1: Understand Transaction Data Structure
Before touching any code, add console.log and check sample transactions:
```javascript
console.log('personId:', personId)
console.log('destId:', destId)
console.log('txn.type:', txn.type)
console.log('txn.source_name:', txn.source_name)
console.log('txn.destination_name:', destNameRaw)
console.log('personName:', personName)
```

**For each transaction type, understand:**
- Expense to account: personId=?, destId=?
- Expense to person: personId=UUID, destId=?
- Transfer between accounts: personId=?, destId=UUID
- Debt/Repayment: personId=UUID, destId=?

### Step 2: Determine Correct Flow Logic
```
IF has_person_id AND NOT has_account_destination:
  → DUAL FLOW: Account (left) | Person (right)
ELSE IF has_account_destination AND NOT has_person_id:
  → DUAL FLOW: Account (left) | Account (right)
ELSE IF NOT has_person_id AND NOT has_account_destination:
  → SINGLE FLOW: Account only
ELSE:
  → UNKNOWN (log it!)
```

### Step 3: Test Height Consistency
All containers must align:
- Row height: `h-9` (fixed)
- Avatar: `h-7 w-7` (inside row, shrink-0)
- Single flow: full row, contained in `h-9`
- Dual flow: both sides `max-w-[44%]`, contained in `h-9`

### Step 4: Fix Edit Warning Modal
- Check if `hasUnsavedChanges` is SET when opening edit/duplicate dialog
- Verify modal has `pointer-events-auto` and proper z-index
- Test if dialog blocks background clicks

---

## Code Locations

| File | Lines | Purpose |
|------|-------|---------|
| `unified-transaction-table.tsx` | 2079-2250 | `case "account"` - MAIN LOGIC |
| `unified-transaction-table.tsx` | ~2200+ | `RenderEntity` helper function |
| `add-transaction-dialog.tsx` | Search "hasUnsavedChanges" | Warning modal |

---

## Design Rules (Non-Negotiable)

From `.github/copilot-instructions.md`:
- ✅ Type icon appears BEFORE entities
- ❌ DO NOT use FROM/TO direction badges in flow column
- ✅ Single flow: flex-1 OR max-w-[...] (consistency!)
- ✅ Dual flow: both sides max-w-[44%]
- ✅ Avatar: Person=`rounded-full`, Account=`rounded-sm`
- ✅ Row height: `h-9`, Avatar: `h-7 w-7`

---

## Success Criteria

When fixed, ALL these must be true:
- [ ] Single flow pills same width as dual flow pills
- [ ] All pills have consistent height (no cutoff, no extra space)
- [ ] Both accounts AND people display in flow column
- [ ] Edit dialog: warning modal blocks interaction, cannot dismiss with Cancel
- [ ] Avatars: person = circle, account = square

---

**DO NOT CODE UNTIL YOU UNDERSTAND THE DATA STRUCTURE. Debug first, code second.**
