# 🚀 START HERE - Agent Onboarding Prompt

## Phase: Transaction Table Flow Column - Critical Issues Resolution

### Your First Task (READ BEFORE CODING)

You are taking over a **critical UI bug** that has failed 4 previous fix attempts. Before touching ANY code:

**1. Read These Files IN ORDER:**
   - [ ] [.github/copilot-instructions.md](.github/copilot-instructions.md) - Architecture & design rules
   - [ ] [README.md](README.md) - Project overview  
   - [ ] [HANDOVER_CRITICAL.md](HANDOVER_CRITICAL.md) - ⚠️ THIS TASK - 3 critical issues + failed attempts

**2. Understand the Context:**
   - This is a **Next.js 16** project (App Router), TypeScript, Shadcn UI, Tailwind CSS
   - We're fixing the **Transaction Table** flow column (`/transactions` page)
   - 3 UI bugs remain unfixed despite 4 refactor attempts by previous agent

**3. Do NOT Code Yet - DEBUG First:**
   - Add `console.log` statements to understand transaction data flow
   - Trace which rendering path is executing (single vs dual flow)
   - Identify why condition logic is wrong
   - Only THEN fix

### Critical Context

**File:** `src/components/moneyflow/unified-transaction-table.tsx`
- Lines 2079-2250: `case "account"` - Main flow rendering logic
- Current state: Broken (only shows people, not accounts)

**3 Issues to Fix:**
1. Single flow pills are TOO LONG (flex-1 vs max-w-[44%])
2. Pills HEIGHT is UNEVEN (h-7, h-9, h-10 mixed)
3. Edit dialog warning CANNOT BLOCK interaction (hasUnsavedChanges not working)

### Success = All Tests Pass

When you're done:
- [ ] Single flow and dual flow pills have SAME width
- [ ] All pills height consistent (no cutoff, no extra space)
- [ ] BOTH accounts AND people display in flow
- [ ] Edit warning blocks interaction (cannot dismiss with Cancel)
- [ ] Person avatars = circle, accounts = square

---

## Next Steps

1. Read the 3 files above
2. Open `HANDOVER_CRITICAL.md` and follow the "Debug Checklist" section
3. Do NOT start coding until you understand the data structure
4. Create a focused fix (not another mega-refactor)

Good luck! 🎯
