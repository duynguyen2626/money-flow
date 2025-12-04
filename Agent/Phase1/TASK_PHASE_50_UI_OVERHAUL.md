# **TASK: PHASE 50 \- UI OVERHAUL & SMART AMOUNT INPUT**

Status: DONE
Phase: 50
Priority: CRITICAL (User Request)

## **1. Objective**
Completely redesign the `TransactionForm` (Add Transaction Modal) to be modern, spacious, and user-friendly. Fix layout issues and implement a "Smart Amount" input with calculation and text representation.

## **2. UI/UX Requirements**

### **A. General Styling**
*   **Style:** Modern, "Premium", spacious. Avoid small/cramped inputs.
*   **Library:** Use existing Shadcn UI components but with better composition and styling.
*   **Tabs:** Fix "Lend" and "Income" tabs having too much empty space. Make them look balanced.

### **B. Layout Changes**
*   **Lending Mode:**
    1.  **First:** Person Select (Must be the first field).
    2.  **Second:** Date.
    3.  **Third:** Debt Account (Auto-filled).
*   **General Layout:**
    *   **Row:** "From Account" and "Amount" must be on the same row (50/50 split).
    *   **Debt Cycle (Tag):** Fix the issue where it drops to a new line unreasonably.

### **C. Component Enhancements**
*   **Dropdowns (Person, From Account):** MUST show thumbnails/avatars.
*   **Smart Amount Input:**
    *   **Math Calculation:** Support expressions like `7+3` -> `10`.
    *   **Validation:** No divide by zero, no negative results. Warning on incomplete expression.
    *   **Text Representation:** Show the amount in Vietnamese text next to the label (e.g., "22,333" -> "22 ngàn 3 trăm...").
    *   **Styling:** Number in Blue, Text in Red.
    *   **Suggestions:** When typing `22`, suggest `22,000`, `220,000` (Smart suffix suggestions).

## **3. Implementation Plan**

1.  **Create `SmartAmountInput` Component:**
    *   Handle math evaluation safely.
    *   Implement Vietnamese number-to-text converter.
    *   Implement suffix suggestions.
2.  **Refactor `TransactionForm`:**
    *   Rebuild the grid layout.
    *   Implement conditional ordering based on `type` (Lending vs others).
    *   Integrate `SmartAmountInput`.
    *   Ensure all Comboboxes render icons/images.

## **4. Verification**
*   [x] Lending mode starts with Person.
*   [x] From Account and Amount are side-by-side.
*   [x] Amount input calculates `7+3=10`.
*   [x] Amount label shows text "x ngàn..." in red/blue.
*   [x] Dropdowns show avatars.
