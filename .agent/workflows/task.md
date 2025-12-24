---
description: 
---

🎨 GRAVITY TASK: M1.2 - PEOPLE UI & UNIFIED TABLE REFINEMENT (ITERATION 3)

Status: REFINING
Priority: High (UI/UX Polish)
Context: Iteration 3. Focusing on "Pro" look & feel for the Unified Transaction Table. Eliminate "indentation" ugliness, maximize visual density, and fix spacing issues.

🎯 OBJECTIVES

Category Column: Create a "Hero" cell layout. No indentation. Big square logos.

Visual Consistency: Text colors must match Badge types.

Flow Column: Fix "floating" badges on the right. Compact layout.

🛠️ SPECIFIC TASKS

1. 📊 Unified Transaction Table (src/components/moneyflow/unified-transaction-table.tsx)

A. Category Column (The "Hero" Cell)

Problem: Ugly indentation, small icons, redundant text.

New Layout: Flex Row, items center, gap-3 (Strictly no left padding/indent).

Order: [Visual] -> [Type Badge] -> [Category Name]

Element 1: Visual (Priority Display)

Logic: Check transaction.shop_logo (or metadata.logo) FIRST. If null, use category.icon.

Style:

Size: w-9 h-9 (Large & Clear).

Shape: Square (rounded-none) for Images to show full detail. object-contain.

Icon Fallback: If using Category Icon, use standard rounded-md background.

Element 2: Type Badge (Standardized)

Logic:

debt -> OUT (Red Badge).

repay -> IN (Green Badge).

transfer -> TF (Blue Badge).

Style: Fixed width (e.g., w-[42px]), centered text. Same height as other badges.

Element 3: Category Name

Placement: MUST be placed AFTER the Type Badge.

Style: font-bold.

Color Sync:

If OUT: Text color Red (match badge).

If IN: Text color Green (match badge).

If TF: Text color Blue.

B. Date Column (Color Sync)

Style: The Date text (04.12) must inherit the color of the Transaction Type (Red for Debt, Green for Repay) to visually link with the row's context.

C. Flow Column (Smart & Compact)

Problem: "Pending" badge or content creates large gaps near the right border.

Fix:

Container: Use flex items-center gap-2 justify-start. Do NOT use justify-between.

Content: [Badge: From] → [Badge: To].

Truncation: Only truncate if it hits the table limit, do not force artificial spacing.

D. Refund Icon Tooltip

Requirement: Wrap the Refund Icon (↩️) in a <Tooltip> component.

Content: "This transaction involves a refund/return."

Placement: Hovering the icon triggers the tooltip.

2. 🧹 Logic & Cleanup

Shopping Category: Ensure no redundant text like "Debt" or "Repayment" is displayed next to the Category Name. The IN/OUT Badge is the sole indicator of direction.

Header Stickiness: Ensure the Table Header remains sticky (top-0 z-10) within the CollapsibleSection container for long lists.

🧪 VERIFICATION

[ ] Category: Big Square Logo + [OUT] Badge + Red Bold Category Name. No "staircase" indentation.

[ ] Date: Red text for expenses, Green for income.

[ ] Flow: Compact, aligned to the left/start. No huge whitespace gap on the right.

[ ] Tooltip: Refund icon has explanation.