# Handover: Transaction Duplication & UI Refinement

## Context
This phase focused on critical bug fixes for the transaction duplication (clone) feature and UI refinements for a smoother user experience.

## Fixes & Improvements

### 1. Transaction Duplication (BIDV Default Bug)
- **Problem**: When duplicating a transaction from the Account Detail page, it incorrectly defaulted the source account to "BIDV" instead of keeping the original.
- **Root Cause**: The duplication handler was spreading the raw database object without mapping `account_id` to `source_account_id` (the field expected by the form).
- **Fix**: Implemented explicit field mapping in `AccountDetailTransactions.tsx`'s `onDuplicate` handler.

### 2. Transaction Slide UX (Processing State)
- **Problem**: The slide would stay open with a "Processing" overlay after clicking save, which felt slow and cluttered.
- **Fix**: Wired `onSubmissionStart` to close the slide immediately upon submission.
- **New Feature**: Added a global floating spinner ("Updating transaction..." or "Duplicating transaction...") that appears at the top of the table area.

### 3. UI Layering & Positioning
- **Chatbot Z-index**: Reduced the chat icon's `z-index` from `90` to `40` to ensure it stays behind the Transaction Slide (`z-100`).
- **Spinner Position**: Moved the submission spinners from a fixed position (overlapping the header) to an absolute position inside the table container for better visual context.
- **Cleanup**: Removed the redundant "PROC" (isPending) spinner from the bottom-right.

## Files Modified
- `src/components/accounts/v2/AccountDetailTransactions.tsx`: Main logic for duplication and spinners.
- `src/components/transaction/slide-v2/transaction-slide-v2.tsx`: Internal cleanup of "PROC" overlays.
- `src/components/ai/quick-add-chat-v2.tsx`: Z-index adjustments.

## Verification
- Duplication from Account pages now preserves the correct account.
- Slide closes immediately on save.
- Chatbot does not overlap the slide.
