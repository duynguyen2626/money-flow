---
description: Sprint 1.2: Deep Debug Limit Field & Layout Alignment
---

Sprint 1.2: Deep Debug Limit Field & Layout Alignment

Context: The Limit field in Account Dialogs is behaving erratically (missing suggestions, aggressive auto-formatting like 44 -> 44,000) compared to the Amount field in "Add Transaction". Additionally, visual alignment between the "Collateral" card and the "Limit/Fee" fields is mismatched.

Role: Senior Frontend Engineer (Debugging & UI Specialist).

Target Files:

src/components/moneyflow/create-account-dialog.tsx (Fix Target)

src/components/moneyflow/transaction-form.tsx (Reference: Check how amount is handled here)

src/components/ui/smart-amount-input.tsx (Reference: Understand props like enableSuggestions, multiplier)

src/components/moneyflow/account-form-fields.tsx (If exists)

0. Workflow & Branching

Step 1: Branch Strategy

ACTION: Initialize/Switch to branch:

git checkout sprint-1/account-dialog-ui-ux-polish || git checkout -b sprint-1/account-dialog-ui-ux-polish


Step 2: Simulation Checklist (Run after each fix)

Lint: npm run lint

Build: npm run build

Manual Check: Does typing "44" result in "44" or "44,000"? It MUST be "44" until user selects a suggestion.

Task Breakdown & Engineering Prompt

1. 🛑 DEEP RESEARCH: Compare "Limit" vs "Transaction Amount"

Hypothesis: The Limit field implementation in CreateAccountDialog is missing specific props that TransactionForm uses, or SmartAmountInput has a default behavior that needs overriding.

Action:

Read src/components/moneyflow/transaction-form.tsx: Locate the <FormField name="amount" ... />. Note down exactly what component is used (SmartAmountInput? Input?) and ALL props passed to it.

Read src/components/ui/smart-amount-input.tsx: Look for logic related to onChange and value parsing. Does it multiply by 1000 automatically if a certain prop is missing?

Compare: Check src/components/moneyflow/create-account-dialog.tsx. Are we using the same component? Are we missing a suggestions prop or a currency config?

2. 🐛 DEBUG & FIX: Limit Field Logic

Issue:

Typing "44" might be auto-converting to "44,000" immediately (Undesired).

Dropdown suggestions (e.g., "44 k = 44,000", "44 m = 44,000,000") are NOT appearing.

Fix:

Component: Ensure Limit uses the exact same component setup as TransactionForm.

Props: explicitly pass props to enable suggestions if they are opt-in.

Z-Index/Overflow: If suggestions are technically "there" but not visible, check if the Dialog content has overflow-hidden or if the suggestion popover's z-index is too low.

Goal: User types "44" -> Input shows "44". Suggestion box appears below showing "44k (44,000)". User selects suggestion -> Input updates.

3. 📐 UI POLISH: Align "Limit/Fee" Bottom with "Collateral" Bottom

Issue: The visual bottom edge of the "Collateral" card (gray border) does not align with the bottom edge of the "Fee" input field next to it.

Fix:

Container Strategy:

The "Limit" and "Fee" fields are likely stacked vertically in one column, while "Collateral" is in the other column.

Apply flex flex-col h-full to the container of "Limit" and "Fee".

Use justify-between (or calculation) to push "Limit" to the top and "Fee" to the bottom.

CRITICAL: Ensure the "Collateral" column and the "Fields" column have the same height. You might need items-stretch on the parent Grid/Flex row.

Visual Check: The gray border bottom of "Collateral" == The border bottom of "Fee" input.

4. 🧹 UX CLEANUP: Receiver Name & Input Clearing

Refinement:

Ensure "Receiver Name" input has the X clear button (as requested in Sprint 1.1).

Verify the data is pre-filled (value={...}) correctly.

Execution Plan:

Research: Read Reference files FIRST.

Logic Fix: Fix Limit field behavior (Suggestions + No auto-multiply).

Layout Fix: Align the bottoms of the two columns.

Verify: Run lint/build.