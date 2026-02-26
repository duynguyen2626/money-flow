# Handover: Transaction Slide V2 & Core Layout Fixes (Feb 26)

## Overview
This document chronicles the critical bug fixes implemented for the Transaction Slide V2 flow, fixing interactivity lockups, React hook crashes, and auto-population behaviors.

## Critical Bugs Resolved

### 1. React Hook Crash: "Rendered more/fewer hooks than during previous render"
- **AppLayoutV2**: Fixed a crash inside `AppLayoutV2` where an early return (`if (pathname?.startsWith('/login'))`) preceded a `useEffect` hook. React enforces that hooks must execute in the exact same order for every render. The `useEffect` was moved *above* the early return.
- **InstallmentSelector**: Fixed a crash inside the Single Mode `InstallmentSelector`. A `useState` hook for `isCreateDialogOpen` was called *after* an early return that hid the component for incompatible transaction types (like Transfer). Moved the state initialization to the top of the component.

### 2. Transaction Type Toggles & Account Movement
- **Credit Card Pay (Debt Settlement)**: Toggling "Card Pay" when starting from a Credit Card account previously did nothing or populated incorrectly. Now, the system smartly recognizes that the Credit Card must be the **Target (Deposit To)** and pre-fills a **Bank Account** as the source. 
- **Graceful Toggling**: If a user toggles a special mode (Card Pay, Transfer) ON and OFF, the system uses a `useRef` to track `prevTypeRef` and beautifully restores the Accounts to their original positions.

### 3. Cashback Sharing Auto-Population Loop
- **The Issue**: When selecting Debt mode, if the user matched a Cashback Strategy, the UI would auto-populate a "Suggested Share Rate" (e.g., 5%). However, if the user attempted to clear the input field, the reactive `useEffect` instantly overrode their action and forced the suggested amount back in, creating an infinite lockup.
- **The Fix**: Added a `useRef` (`lastAutoPopulatedSig`) to only trigger the auto-population *once* per distinct strategy match, allowing the user to gracefully clear out the Share Percent field.

### 4. Dynamic Tags
- The `Tag` field (Cycle) is now strictly dynamic in 'add' mode. Selecting a date in the `occurredAt` calendar auto-populates the tag format `yyyy-MM` (e.g., `2026-02`), as long as the user hasn't typed a custom override string.

### 5. z-index Layer Interactivity
- Sheet UI components sometimes blocked dropdown `Combobox` elements. `z-index` for `SheetContent` in `TransactionSlideV2` was manually elevated to `z-[500]`, and the `Command` popover for `Combobox` was elevated to `z-[1000]`.

## Takeaways for Future Agents
- **React Hooks Strictness**: Never hide hooks behind early returns or conditional statements. Always declare hooks at the absolute top of the component body.
- **Auto-population Effects**: Be incredibly careful with `useEffect` blocks that monitor form state (from `react-hook-form`). Always implement circuit breakers or `useRef` tokens to prevent fighting the user's manual inputs.
