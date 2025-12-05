MILESTONE 3 - PHASE 2 (REVISED 4): UI FINAL POLISH & BADGES REVERT

Goal: Revert to Text Badges for Transaction Types (Compact), optimize the "Final Price" display, and fix the Installment Edit bug.

1. Git Convention

Branch: fix/M3-P2-ui-badges-revert

Commit: [M3-P2] fix: ...

PART A: TRANSACTION TABLE REDESIGN (The "Compact & Clear" Look)

File: src/components/moneyflow/unified-transaction-table.tsx (Columns)

1. Column: "Date" (Merged with Type & Status)

Layout: flex flex-row items-center gap-2 (No wrapping).

Content:

Date: DD/MM (e.g., 04/12).

Type Badge (Reverted): Use Shadcn Badge with SHORT TEXT:

expense -> [OUT] (Red/Destructive)

income -> [IN] (Green/Success)

transfer -> [TF] (Blue/Secondary)

transfer_in -> [TF IN]

transfer_out -> [TF OUT]

Style: px-1.5 py-0 text-[10px] font-bold h-5.

Status Icon:

pending / waiting -> ⏳ (Yellow Clock).

void -> 🚫 (Red Ban).

completed -> (None).

2. Column: "People" (Compact Tag)

Layout: Avatar/Name + Tag Icon.

Content:

Person: Avatar or Name.

Tag: Instead of text "DEC25", render a Tag Icon (🏷️ Tag from Lucide).

Tooltip: Hovering the icon shows the full Tag Name (e.g., "Cycle: DEC25").

3. Column: "Final Price" (Merged with Back Logic)

Content:

Line 1: Final Amount (Bold).

Line 2: Cashback Formula (If applicable).

Format: 3% + 3,000 = 4,000 (Integers only).

Constraint: Use Math.round to remove decimals. Do NOT use the Σ icon.

Style: text-[10px] text-muted-foreground font-medium.

4. Installment Link Position

Question: Where to put the 🔗 icon?

Answer: Append it to the Account Column (next to Account Name) OR the Note Column.

Decision: Put it in Account Column. Reason: "Paid via VIB Credit (Linked 🔗)". It indicates the source is part of a plan.

PART B: CRITICAL BUG FIXES

1. Fix Installment Toggle (Edit Mode)

File: src/components/moneyflow/transaction-form.tsx
The Bug: The "Trả góp?" toggle is OFF when editing a transaction that has is_installment = true.
The Fix:

In the useEffect that loads data into the form (or defaultValues):

Ensure is_installment is explicitly mapped.

// Debugging tip for Agent:
console.log('Editing Data:', data); // Check if is_installment comes from DB
form.reset({
    // ... other fields
    is_installment: Boolean(data.is_installment), // Force boolean cast
});


2. Fix Filter Button

File: src/components/moneyflow/filterable-transactions.tsx

Action: Ensure the Popover content is rendering and the Context Provider is wrapping the component correctly.

4. Execution Plan

Step 1 (Table): Revert Type Icons to Short Badges (IN, OUT, TF) inside Date Column.

Step 2 (Table): Change People Tag to Tooltip Icon.

Step 3 (Table): Format Final Price with Integer Formula (3% + 3,000 = ...).

Step 4 (Form): Fix is_installment loading logic in Edit Modal.

👉 Acknowledge M3-P2 Revised 4 and start with Step 1.