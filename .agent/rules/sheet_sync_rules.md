# Google Sheet Sync Rules for Money Flow 3

## 1. Domain Logic & Formulas
-   **In/Out Logic**:
    -   **In (Income/Repayment)**: Amount MUST be **Negative** in Column F.
    -   **Out (Expense/Debt)**: Amount MUST be **Positive** in Column F.
-   **Final Price (Column J)**:
    -   Formula: `=ARRAYFORMULA(IF(F2:F="";""; F2:F - I2:I ))`
    -   Logic: `Amount - Total Back`.
    -   **Result**:
        -   In -> Negative (Reduced by Back if any, otherwise Raw Negative).
        -   Out -> Positive (Reduced by Back).
-   **Remains (Net Debt)**:
    -   Formula: `SUM(J:J)`.
    -   Result: Positive = User owes us. Negative = We owe user.

## 2. Formatting Standards
-   **Colors**:
    -   In (Gross): **Dark Green** (`#14532d`). Summary Row 2.
    -   Out (Gross): **Dark Red** (`#991b1b`). Summary Row 3.
    -   Total Back: **Blue** (`#1e40af`). Summary Row 4.
-   **Bank Info**:
    -   Format: Raw Integer (No thousands separator).
    -   Formula: `=... & TEXT(N5;"0")`.
-   **Ghost Rows**:
    -   Always force CLEAR columns L:N before rebuilding Summary Table to prevent `insertRows` from duplicating summary data.

## 3. Deployment
-   Script: `integrations/google-sheets/people-sync/push-sheet.mjs`
-   Command: `npm run sheet:people`
-   **Auto-Deploy**: Use `clasp deploy` with specific deployment ID to ensure Web App uses latest code immediately.
